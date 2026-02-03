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
	BranchID      *string    `json:"branch_id,omitempty"`
	CreatedAt     *time.Time `json:"created_at,omitempty"`
	UpdatedAt     *time.Time `json:"updated_at,omitempty"`
}

type CreatePromotionRequest struct {
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

type UpdatePromotionRequest struct {
	Name          *string    `json:"name"`
	DiscountType  *string    `json:"discount_type"`
	DiscountValue *float64   `json:"discount_value"`
	MaxDiscount   *float64   `json:"max_discount"`
	MinOrderTotal *float64   `json:"min_order_total"`
	ValidFrom     *time.Time `json:"valid_from"`
	ValidUntil    *time.Time `json:"valid_until"`
	MaxUsageCount *int       `json:"max_usage_count"`
	IsActive      *bool      `json:"is_active"`
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

type PromotionReport struct {
	PromotionID   string  `json:"promotion_id"`
	PromotionName string  `json:"promotion_name"`
	Code          *string `json:"code"`
	UsageCount    int     `json:"usage_count"`
	TotalDiscount float64 `json:"total_discount"`
	IsActive      bool    `json:"is_active"`
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

	router.HandleFunc("/api/promotions", func(w http.ResponseWriter, r *http.Request) {
		listPromotions(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/promotions", func(w http.ResponseWriter, r *http.Request) {
		createPromotion(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/promotions/{id}", func(w http.ResponseWriter, r *http.Request) {
		getPromotion(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/promotions/{id}", func(w http.ResponseWriter, r *http.Request) {
		updatePromotion(db, w, r)
	}).Methods(http.MethodPut)

	router.HandleFunc("/api/promotions/{id}", func(w http.ResponseWriter, r *http.Request) {
		deletePromotion(db, w, r)
	}).Methods(http.MethodDelete)

	router.HandleFunc("/api/promotions/evaluate", func(w http.ResponseWriter, r *http.Request) {
		evaluatePromotion(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/promotions/apply", func(w http.ResponseWriter, r *http.Request) {
		applyPromotion(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/reports/promotions", func(w http.ResponseWriter, r *http.Request) {
		getPromotionReport(db, w, r)
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

	log.Printf("Promotion service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func createPromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" && role != "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}

	branchID := r.Header.Get("X-Branch-ID")
	if branchID == "" && role == "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	var req CreatePromotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.Name == "" || req.DiscountType == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_and_type_required"})
		return
	}

	if req.DiscountType != "FIXED_AMOUNT" && req.DiscountType != "PERCENTAGE" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_discount_type"})
		return
	}

	promoID := uuid.New().String()
	_, err := db.Exec(`
		INSERT INTO promotions (id, code, name, discount_type, discount_value, max_discount, min_order_total, valid_from, valid_until, max_usage_count, is_active, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, promoID, req.Code, req.Name, req.DiscountType, req.DiscountValue, req.MaxDiscount, req.MinOrderTotal, req.ValidFrom, req.ValidUntil, req.MaxUsageCount, req.IsActive, branchID)

	if err != nil {
		log.Printf("Failed to create promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        promoID,
		"name":      req.Name,
		"branch_id": branchID,
		"is_active": req.IsActive,
	})
}

func listPromotions(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	branchID := r.Header.Get("X-Branch-ID")
	role := r.Header.Get("X-User-Role")

	var rows *sql.Rows
	var err error

	if role == "ADMIN" {
		rows, err = db.Query(`
			SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total, valid_from, valid_until, max_usage_count, is_active, branch_id, created_at, updated_at
			FROM promotions
			ORDER BY created_at DESC
		`)
	} else {
		if branchID == "" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
			return
		}
		rows, err = db.Query(`
			SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total, valid_from, valid_until, max_usage_count, is_active, branch_id, created_at, updated_at
			FROM promotions
			WHERE branch_id = $1
			ORDER BY created_at DESC
		`, branchID)
	}

	if err != nil {
		log.Printf("Failed to list promotions: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	promotions := []Promotion{}
	for rows.Next() {
		var p Promotion
		err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinOrderTotal, &p.ValidFrom, &p.ValidUntil, &p.MaxUsageCount, &p.IsActive, &p.BranchID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			log.Printf("Failed to scan promotion: %v", err)
			continue
		}
		promotions = append(promotions, p)
	}

	writeJSON(w, http.StatusOK, promotions)
}

func getPromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	branchID := r.Header.Get("X-Branch-ID")
	role := r.Header.Get("X-User-Role")

	var p Promotion
	var err error

	if role == "ADMIN" {
		err = db.QueryRow(`
			SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total, valid_from, valid_until, max_usage_count, is_active, branch_id, created_at, updated_at
			FROM promotions
			WHERE id = $1
		`, id).Scan(&p.ID, &p.Code, &p.Name, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinOrderTotal, &p.ValidFrom, &p.ValidUntil, &p.MaxUsageCount, &p.IsActive, &p.BranchID, &p.CreatedAt, &p.UpdatedAt)
	} else {
		if branchID == "" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
			return
		}
		err = db.QueryRow(`
			SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total, valid_from, valid_until, max_usage_count, is_active, branch_id, created_at, updated_at
			FROM promotions
			WHERE id = $1 AND branch_id = $2
		`, id, branchID).Scan(&p.ID, &p.Code, &p.Name, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinOrderTotal, &p.ValidFrom, &p.ValidUntil, &p.MaxUsageCount, &p.IsActive, &p.BranchID, &p.CreatedAt, &p.UpdatedAt)
	}

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "promotion_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func updatePromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" && role != "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}

	branchID := r.Header.Get("X-Branch-ID")
	if branchID == "" && role == "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	var req UpdatePromotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	// Check ownership
	if role == "MANAGER" {
		var exists string
		err := db.QueryRow(`SELECT id FROM promotions WHERE id = $1 AND branch_id = $2`, id, branchID).Scan(&exists)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "promotion_not_found"})
			return
		}
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argPos))
		args = append(args, *req.Name)
		argPos++
	}
	if req.DiscountType != nil {
		updates = append(updates, fmt.Sprintf("discount_type = $%d", argPos))
		args = append(args, *req.DiscountType)
		argPos++
	}
	if req.DiscountValue != nil {
		updates = append(updates, fmt.Sprintf("discount_value = $%d", argPos))
		args = append(args, *req.DiscountValue)
		argPos++
	}
	if req.MaxDiscount != nil {
		updates = append(updates, fmt.Sprintf("max_discount = $%d", argPos))
		args = append(args, req.MaxDiscount)
		argPos++
	}
	if req.MinOrderTotal != nil {
		updates = append(updates, fmt.Sprintf("min_order_total = $%d", argPos))
		args = append(args, req.MinOrderTotal)
		argPos++
	}
	if req.ValidFrom != nil {
		updates = append(updates, fmt.Sprintf("valid_from = $%d", argPos))
		args = append(args, req.ValidFrom)
		argPos++
	}
	if req.ValidUntil != nil {
		updates = append(updates, fmt.Sprintf("valid_until = $%d", argPos))
		args = append(args, req.ValidUntil)
		argPos++
	}
	if req.MaxUsageCount != nil {
		updates = append(updates, fmt.Sprintf("max_usage_count = $%d", argPos))
		args = append(args, req.MaxUsageCount)
		argPos++
	}
	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argPos))
		args = append(args, *req.IsActive)
		argPos++
	}

	if len(updates) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no_fields_to_update"})
		return
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argPos))
	args = append(args, time.Now())
	argPos++

	query := fmt.Sprintf("UPDATE promotions SET %s WHERE id = $%d", joinStrings(updates, ", "), argPos)
	args = append(args, id)

	if role == "MANAGER" {
		query += fmt.Sprintf(" AND branch_id = $%d", argPos+1)
		args = append(args, branchID)
	}

	result, err := db.Exec(query, args...)
	if err != nil {
		log.Printf("Failed to update promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "promotion_not_found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func deletePromotion(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" && role != "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}

	branchID := r.Header.Get("X-Branch-ID")
	if branchID == "" && role == "MANAGER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	var result sql.Result
	var err error

	if role == "ADMIN" {
		result, err = db.Exec(`DELETE FROM promotions WHERE id = $1`, id)
	} else {
		result, err = db.Exec(`DELETE FROM promotions WHERE id = $1 AND branch_id = $2`, id, branchID)
	}

	if err != nil {
		log.Printf("Failed to delete promotion: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "promotion_not_found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "deleted": true})
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

	branchID := r.Header.Get("X-Branch-ID")
	if branchID == "" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	var promo Promotion
	err := db.QueryRow(`
		SELECT id, code, name, discount_type, discount_value, max_discount, min_order_total,
		       valid_from, valid_until, max_usage_count, is_active
		FROM promotions
		WHERE code = $1 AND is_active = true AND branch_id = $2
	`, req.Code, branchID).Scan(
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

	branchID := r.Header.Get("X-Branch-ID")
	if branchID == "" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	// Verify promotion belongs to this branch
	var promoID string
	err := db.QueryRow(`SELECT id FROM promotions WHERE id = $1 AND branch_id = $2`, req.PromotionID, branchID).Scan(&promoID)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "promotion_not_found"})
		return
	}

	usageID := uuid.New().String()
	_, err = db.Exec(`
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

func getPromotionReport(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	branchID := r.Header.Get("X-Branch-ID")
	organizationID := r.Header.Get("X-Organization-ID")
	role := r.Header.Get("X-User-Role")

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			p.id,
			p.name,
			p.code,
			COUNT(DISTINCT pu.id) AS usage_count,
			COALESCE(SUM(od.discount_amount), 0) AS total_discount,
			p.is_active
		FROM promotions p
		LEFT JOIN promotion_usage pu ON p.id = pu.promotion_id 
			AND DATE(pu.used_at) BETWEEN $1 AND $2
		LEFT JOIN order_discounts od ON p.id = od.promotion_id 
			AND DATE(od.applied_at) BETWEEN $1 AND $2
		WHERE 1=1
	`

	args := []interface{}{from, to}
	argPos := 3

	if role == "ADMIN" {
		// Admin sees all
	} else if branchID != "" {
		query += fmt.Sprintf(" AND p.branch_id = $%d", argPos)
		args = append(args, branchID)
		argPos++
	} else if organizationID != "" {
		query += fmt.Sprintf(" AND p.branch_id IN (SELECT id FROM branches WHERE organization_id = $%d)", argPos)
		args = append(args, organizationID)
		argPos++
	}

	query += " GROUP BY p.id ORDER BY usage_count DESC, total_discount DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to get promotion report: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	reports := []PromotionReport{}
	for rows.Next() {
		var r PromotionReport
		err := rows.Scan(&r.PromotionID, &r.PromotionName, &r.Code, &r.UsageCount, &r.TotalDiscount, &r.IsActive)
		if err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}
		reports = append(reports, r)
	}

	writeJSON(w, http.StatusOK, reports)
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
