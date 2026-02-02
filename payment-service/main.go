package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
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

type CheckoutRequest struct {
	OrderID        string  `json:"order_id"`
	PaymentMethod  string  `json:"payment_method"`
	PromotionCode  *string `json:"promotion_code"`
	IdempotencyKey string  `json:"idempotency_key"`
}

type Payment struct {
	ID                string     `json:"id"`
	OrderID           string     `json:"order_id"`
	Amount            float64    `json:"amount"`
	PaymentMethod     string     `json:"payment_method"`
	Status            string     `json:"status"`
	ExternalPaymentID *string    `json:"external_payment_id"`
	CreatedAt         time.Time  `json:"created_at"`
	CompletedAt       *time.Time `json:"completed_at"`
}

type PromotionEvalResponse struct {
	Valid           bool    `json:"valid"`
	PromotionID     string  `json:"promotion_id"`
	DiscountAmount  float64 `json:"discount_amount"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/pointofsale"
	}

	promotionServiceURL := os.Getenv("PROMOTION_SERVICE_URL")
	if promotionServiceURL == "" {
		promotionServiceURL = "http://localhost:8084"
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

	router.HandleFunc("/api/payments/checkout", func(w http.ResponseWriter, r *http.Request) {
		checkout(db, promotionServiceURL, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/payments/{id}", func(w http.ResponseWriter, r *http.Request) {
		getPayment(db, w, r)
	}).Methods(http.MethodGet)

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

	log.Printf("Payment service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func checkout(db *sql.DB, promotionServiceURL string, w http.ResponseWriter, r *http.Request) {
	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.OrderID == "" || req.PaymentMethod == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing_fields"})
		return
	}

	var orderTotal float64
	var existingDiscount float64
	err := db.QueryRow(`
		SELECT total_amount, COALESCE(discount_amount, 0)
		FROM orders WHERE id = $1
	`, req.OrderID).Scan(&orderTotal, &existingDiscount)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "order_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get order: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	finalAmount := orderTotal
	var promotionID *string

	if req.PromotionCode != nil && *req.PromotionCode != "" {
		promoResp, err := evaluatePromotion(promotionServiceURL, *req.PromotionCode, orderTotal)
		if err != nil {
			log.Printf("Failed to evaluate promotion: %v", err)
		} else if promoResp.Valid {
			finalAmount = orderTotal - promoResp.DiscountAmount
			promotionID = &promoResp.PromotionID

			tx, _ := db.Begin()
			defer tx.Rollback()

			_, _ = tx.Exec(`
				INSERT INTO order_discounts (id, order_id, promotion_id, discount_name, discount_amount, applied_by, applied_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW())
			`, uuid.New().String(), req.OrderID, promotionID, *req.PromotionCode, promoResp.DiscountAmount, uuid.New().String())

			_, _ = tx.Exec(`
				UPDATE orders SET discount_amount = discount_amount + $1, total_amount = total_amount - $1, updated_at = NOW()
				WHERE id = $2
			`, promoResp.DiscountAmount, req.OrderID)

			tx.Commit()
		}
	}

	paymentID := uuid.New().String()
	now := time.Now()
	_, err = db.Exec(`
		INSERT INTO payments (id, order_id, amount, payment_method, status, external_payment_id, created_at, completed_at)
		VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6, $7)
	`, paymentID, req.OrderID, finalAmount, req.PaymentMethod, &req.IdempotencyKey, now, now)

	if err != nil {
		log.Printf("Failed to create payment: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	_, _ = db.Exec(`UPDATE orders SET status = 'PAID', paid_at = NOW() WHERE id = $1`, req.OrderID)

	writeJSON(w, http.StatusOK, map[string]any{
		"payment_id":  paymentID,
		"order_id":    req.OrderID,
		"amount":      finalAmount,
		"status":      "SUCCESS",
		"created_at":  now,
	})
}

func getPayment(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var payment Payment
	err := db.QueryRow(`
		SELECT id, order_id, amount, payment_method, status, external_payment_id, created_at, completed_at
		FROM payments WHERE id = $1
	`, id).Scan(
		&payment.ID, &payment.OrderID, &payment.Amount, &payment.PaymentMethod,
		&payment.Status, &payment.ExternalPaymentID, &payment.CreatedAt, &payment.CompletedAt,
	)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "payment_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get payment: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, payment)
}

func evaluatePromotion(baseURL, code string, orderTotal float64) (*PromotionEvalResponse, error) {
	body := map[string]any{
		"code":        code,
		"order_total": orderTotal,
	}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(
		fmt.Sprintf("%s/api/promotions/evaluate", baseURL),
		"application/json",
		bytes.NewReader(jsonBody),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("promotion service error: %d - %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		PromotionID   string  `json:"promotion_id"`
		DiscountAmount float64 `json:"discount_amount"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &PromotionEvalResponse{
		Valid:          true,
		PromotionID:    result.PromotionID,
		DiscountAmount: result.DiscountAmount,
	}, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
