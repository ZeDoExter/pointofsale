package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

type Promotion struct {
	ID            string     `json:"id"`
	Code          *string    `json:"code"`
	Name          string     `json:"name"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue float64    `json:"discount_value"`
	MaxDiscount   *float64   `json:"max_discount"`
	MinOrderTotal *float64   `json:"min_order_total"`
	ValidFrom     *time.Time `json:"valid_from"`
	ValidUntil    *time.Time `json:"valid_until"`
	MaxUsageCount *int       `json:"max_usage_count"`
	IsActive      bool       `json:"is_active"`
}

type EvaluateRequest struct {
	Code       string  `json:"code"`
	OrderTotal float64 `json:"order_total"`
	OrderID    string  `json:"order_id"`
}

type ApplyRequest struct {
	PromotionID string `json:"promotion_id"`
	OrderID     string `json:"order_id"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/pointofsale"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("DB connect failed: %v", err)
	}
	defer db.Close()

	for i := 0; i < 30; i++ {
		if err := db.Ping(); err == nil {
			break
		}
		log.Printf("Waiting for database... (%d/30)", i+1)
		time.Sleep(time.Second)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("DB ping failed: %v", err)
	}

	router := mux.NewRouter()

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/promotions/evaluate", func(w http.ResponseWriter, r *http.Request) {
		evaluatePromotion(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/promotions/apply", func(w http.ResponseWriter, r *http.Request) {
		applyPromotion(db, w, r)
	}).Methods(http.MethodPost)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: router,
	}

	go func() {
		sigch := make(chan os.Signal, 1)
		signal.Notify(sigch, syscall.SIGTERM, syscall.SIGINT)
		<-sigch
		server.Shutdown(context.Background())
	}()

	log.Printf("Promotion service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func evaluatePromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	var req EvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.Code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code_required"})
		return
	}

	var promo Promotion
	err := db.QueryRow(`
		SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total,
		       valid_from, valid_until, max_usage_count, is_active
		FROM promotions
		WHERE code = $1 AND is_active = true
	`, req.Code).Scan(
		&promo.ID, &promo.Code, &promo.Name, &promo.DiscountType, &promo.DiscountValue,
		&promo.MaxDiscount, &promo.MinOrderTotal, &promo.ValidFrom, &promo.ValidUntil,
		&promo.MaxUsageCount, &promo.IsActive,
	)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "promotion_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	now := time.Now()
	if promo.ValidFrom != nil && now.Before(*promo.ValidFrom) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "promotion_not_started"})
		return
	}
	if promo.ValidUntil != nil && now.After(*promo.ValidUntil) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "promotion_expired"})
		return
	}

	if promo.MinOrderTotal != nil && req.OrderTotal < *promo.MinOrderTotal {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "min_order_not_met"})
		return
	}

	if promo.MaxUsageCount != nil {
		var usageCount int
		err := db.QueryRow(`SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1`, promo.ID).Scan(&usageCount)
		if err != nil {
			log.Printf("Failed to check usage: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}
		if usageCount >= *promo.MaxUsageCount {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "usage_limit_exceeded"})
			return
		}
	}

	var discountAmount float64
	if promo.DiscountType == "FIXED_AMOUNT" {
		discountAmount = promo.DiscountValue
	} else if promo.DiscountType == "PERCENTAGE" {
		discountAmount = req.OrderTotal * (promo.DiscountValue / 100.0)
		if promo.MaxDiscount != nil && discountAmount > *promo.MaxDiscount {
			discountAmount = *promo.MaxDiscount
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"promotion_id":    promo.ID,
		"code":            req.Code,
		"name":            promo.Name,
		"discount_amount": discountAmount,
		"valid":           true,
	})
}

func applyPromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	var req ApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	usageID := uuid.New().String()
	_, err := db.Exec(`
		INSERT INTO promotion_usage (id, promotion_id, order_id, used_at)
		VALUES ($1, $2, $3, NOW())
	`, usageID, req.PromotionID, req.OrderID)

	if err != nil {
		log.Printf("Failed to apply promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"usage_id":     usageID,
		"promotion_id": req.PromotionID,
		"order_id":     req.OrderID,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
