package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var notificationServiceURL string

type Order struct {
	ID             string    `json:"id"`
	TableID        *int      `json:"table_id"`
	OrderNumber    int       `json:"order_number"`
	Status         string    `json:"status"`
	Subtotal       float64   `json:"subtotal"`
	Tax            float64   `json:"tax"`
	DiscountAmount float64   `json:"discount_amount"`
	TotalAmount    float64   `json:"total_amount"`
	CreatedBy      string    `json:"created_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type QRSession struct {
	ID             string     `json:"id"`
	Token          string     `json:"token"`
	TableID        int        `json:"table_id"`
	TableNumber    int        `json:"table_number"`
	BranchID       string     `json:"branch_id"`
	OrganizationID string     `json:"organization_id"`
	IsActive       bool       `json:"is_active"`
	CreatedAt      time.Time  `json:"created_at"`
	ClosedAt       *time.Time `json:"closed_at"`
}

type OrderItem struct {
	ID           string    `json:"id"`
	OrderID      string    `json:"order_id"`
	MenuItemID   string    `json:"menu_item_id"`
	MenuItemName string    `json:"menu_item_name"`
	Quantity     int       `json:"quantity"`
	UnitPrice    float64   `json:"unit_price"`
	ItemTotal    float64   `json:"item_total"`
	ItemStatus   string    `json:"item_status"`
	AddedBy      string    `json:"added_by"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateOrderRequest struct {
	TableID        string            `json:"table_id"`
	QrSessionToken string            `json:"qr_session_token"`
	Items          []CreateOrderItem `json:"items"`
	CreatedBy      string            `json:"created_by"`
}

type CreateOrderItem struct {
	ItemName string  `json:"item_name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

type AddItemRequest struct {
	MenuItemID   string  `json:"menu_item_id"`
	MenuItemName string  `json:"menu_item_name"`
	Quantity     int     `json:"quantity"`
	UnitPrice    float64 `json:"unit_price"`
	AddedBy      string  `json:"added_by"`
}

type SalesReport struct {
	Date          string  `json:"date"`
	OrderCount    int     `json:"order_count"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalDiscount float64 `json:"total_discount"`
	TotalTax      float64 `json:"total_tax"`
	AvgOrderValue float64 `json:"avg_order_value"`
}

type TopItem struct {
	MenuItemName string  `json:"menu_item_name"`
	QuantitySold int     `json:"quantity_sold"`
	TotalRevenue float64 `json:"total_revenue"`
}

type HourlySales struct {
	Hour         int     `json:"hour"`
	OrderCount   int     `json:"order_count"`
	TotalRevenue float64 `json:"total_revenue"`
}

type Product struct {
	ID             string          `json:"id"`
	OrganizationID string          `json:"organization_id"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	Price          float64         `json:"price"`
	Category       string          `json:"category"`
	ImageURL       string          `json:"image_url"`
	IsAvailable    bool            `json:"is_available"`
	SortOrder      int             `json:"sort_order"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Options        []ProductOption `json:"options,omitempty"`
}

type ProductOption struct {
	ID            string  `json:"id"`
	ProductID     string  `json:"product_id"`
	OptionGroup   string  `json:"option_group"`
	OptionName    string  `json:"option_name"`
	PriceModifier float64 `json:"price_modifier"`
	IsRequired    bool    `json:"is_required"`
	SortOrder     int     `json:"sort_order"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	ImageURL    string  `json:"image_url"`
	IsAvailable bool    `json:"is_available"`
	SortOrder   int     `json:"sort_order"`
	Options     []CreateProductOptionRequest `json:"options"`
}

type CreateProductOptionRequest struct {
	OptionGroup   string  `json:"option_group"`
	OptionName    string  `json:"option_name"`
	PriceModifier float64 `json:"price_modifier"`
	IsRequired    bool    `json:"is_required"`
	SortOrder     int     `json:"sort_order"`
}

type UpdateProductRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	Price       *float64 `json:"price"`
	Category    *string  `json:"category"`
	ImageURL    *string  `json:"image_url"`
	IsAvailable *bool    `json:"is_available"`
	SortOrder   *int     `json:"sort_order"`
}

// tenantContext extracts org/branch/user context from gateway headers.
func tenantContext(r *http.Request) (branchID, orgID, userID string) {
	branchID = r.Header.Get("X-Branch-ID")
	orgID = r.Header.Get("X-Organization-ID")
	userID = r.Header.Get("X-User-ID")
	return
}

// nullable wraps empty strings as NULL for SQL parameters.
func nullable(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}

// nullablePtr wraps nil-able string pointers for SQL parameters.
func nullablePtr(value *string) interface{} {
	if value == nil {
		return nil
	}
	return *value
}

// resolveContext fills missing branch/org using table metadata when possible.
func resolveContext(db *sql.DB, branchID, orgID string, tableID *int) (string, string, error) {
	if branchID == "" && tableID != nil {
		var tblBranch, tblOrg sql.NullString
		err := db.QueryRow(`
			SELECT t.branch_id, b.organization_id
			FROM tables t
			JOIN branches b ON t.branch_id = b.id
			WHERE t.id = $1
		`, *tableID).Scan(&tblBranch, &tblOrg)
		if err == sql.ErrNoRows {
			return "", "", fmt.Errorf("table_not_found")
		}
		if err != nil {
			return "", "", err
		}
		if tblBranch.Valid {
			branchID = tblBranch.String
		}
		if tblOrg.Valid {
			orgID = tblOrg.String
		}
	}

	if orgID == "" && branchID != "" {
		var bOrg sql.NullString
		err := db.QueryRow(`SELECT organization_id FROM branches WHERE id = $1`, branchID).Scan(&bOrg)
		if err == sql.ErrNoRows {
			return branchID, "", fmt.Errorf("branch_not_found")
		}
		if err != nil {
			return branchID, "", err
		}
		if bOrg.Valid {
			orgID = bOrg.String
		}
	}

	return branchID, orgID, nil
}

// guardOrderScope ensures the order belongs to the current tenant context.
func guardOrderScope(db *sql.DB, orderID, branchID, orgID string) error {
	if branchID == "" && orgID == "" {
		return nil
	}

	query := "SELECT 1 FROM orders WHERE id = $1"
	args := []interface{}{orderID}

	if branchID != "" {
		query += " AND branch_id = $2"
		args = append(args, branchID)
	} else if orgID != "" {
		query += " AND organization_id = $2"
		args = append(args, orgID)
	}

	var ok int
	if err := db.QueryRow(query, args...).Scan(&ok); err != nil {
		return err
	}
	return nil
}

// findActiveQRSession fetches a QR session by token.
func findActiveQRSession(db *sql.DB, token string) (*QRSession, error) {
	var sess QRSession
	var closedAt sql.NullTime
	row := db.QueryRow(`
		SELECT qs.id, qs.qr_code_token, qs.table_id, qs.is_active, qs.created_at, qs.closed_at,
		       t.table_number, b.id AS branch_id, b.organization_id
		FROM qr_sessions qs
		JOIN tables t ON qs.table_id = t.id
		JOIN branches b ON t.branch_id = b.id
		WHERE qs.qr_code_token = $1
	`, token)
	err := row.Scan(&sess.ID, &sess.Token, &sess.TableID, &sess.IsActive, &sess.CreatedAt, &closedAt, &sess.TableNumber, &sess.BranchID, &sess.OrganizationID)
	if err != nil {
		return nil, err
	}
	if closedAt.Valid {
		sess.ClosedAt = &closedAt.Time
	}
	return &sess, nil
}

// ensureTable returns an existing table id by number or creates it.
func ensureTable(db *sql.DB, branchID string, tableNumber int) (int, error) {
	if branchID == "" {
		return 0, fmt.Errorf("branch_required")
	}
	var tableID int
	err := db.QueryRow(`SELECT id FROM tables WHERE branch_id = $1 AND table_number = $2`, branchID, tableNumber).Scan(&tableID)
	if err == nil {
		return tableID, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	name := fmt.Sprintf("Table %d", tableNumber)
	err = db.QueryRow(`
		INSERT INTO tables (branch_id, table_number, name, capacity, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, 4, true, NOW(), NOW()) RETURNING id
	`, branchID, tableNumber, name).Scan(&tableID)
	return tableID, err
}

func createQRSession(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	branchID, orgID, userID := tenantContext(r)
	if branchID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "branch_required"})
		return
	}

	var payload struct {
		TableNumber int `json:"table_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}
	if payload.TableNumber <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "table_number_required"})
		return
	}

	tableID, err := ensureTable(db, branchID, payload.TableNumber)
	if err != nil {
		log.Printf("ensureTable failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	token := uuid.New().String()
	var sessID string
	err = db.QueryRow(`
		INSERT INTO qr_sessions (id, table_id, qr_code_token, is_active, created_at)
		VALUES ($1, $2, $3, true, NOW()) RETURNING id
	`, uuid.New().String(), tableID, token).Scan(&sessID)
	if err != nil {
		log.Printf("Failed to create qr session: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	response := QRSession{
		ID:             sessID,
		Token:          token,
		TableID:        tableID,
		TableNumber:    payload.TableNumber,
		BranchID:       branchID,
		OrganizationID: orgID,
		IsActive:       true,
		CreatedAt:      time.Now(),
	}

	publishEvent("qr_session_opened", map[string]any{
		"qr_session_id": sessID,
		"table_number":  payload.TableNumber,
		"opened_by":     userID,
	}, branchID, orgID)

	writeJSON(w, http.StatusCreated, response)
}

func listQRSessions(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	branchID, orgID, _ := tenantContext(r)
	if branchID == "" && orgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "branch_required"})
		return
	}

	status := strings.ToUpper(r.URL.Query().Get("status"))
	if status == "" {
		status = "OPEN"
	}

	query := `
		SELECT qs.id, qs.qr_code_token, qs.table_id, qs.is_active, qs.created_at, qs.closed_at,
		       t.table_number, b.id AS branch_id, b.organization_id
		FROM qr_sessions qs
		JOIN tables t ON qs.table_id = t.id
		JOIN branches b ON t.branch_id = b.id
		WHERE 1=1`
	var args []any
	idx := 1

	if branchID != "" {
		query += fmt.Sprintf(" AND b.id = $%d", idx)
		args = append(args, branchID)
		idx++
	} else if orgID != "" {
		query += fmt.Sprintf(" AND b.organization_id = $%d", idx)
		args = append(args, orgID)
		idx++
	}

	if status == "OPEN" {
		query += " AND qs.is_active = true"
	} else if status == "CLOSED" {
		query += " AND qs.is_active = false"
	}

	query += " ORDER BY qs.created_at DESC LIMIT 100"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to list qr sessions: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var sessions []QRSession
	for rows.Next() {
		var sess QRSession
		var closedAt sql.NullTime
		if err := rows.Scan(&sess.ID, &sess.Token, &sess.TableID, &sess.IsActive, &sess.CreatedAt, &closedAt, &sess.TableNumber, &sess.BranchID, &sess.OrganizationID); err != nil {
			log.Printf("Scan qr session failed: %v", err)
			continue
		}
		if closedAt.Valid {
			sess.ClosedAt = &closedAt.Time
		}
		sessions = append(sessions, sess)
	}

	writeJSON(w, http.StatusOK, map[string]any{"sessions": sessions})
}

func getQRSessionByToken(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	token := mux.Vars(r)["token"]
	sess, err := findActiveQRSession(db, token)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get qr session: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func closeQRSession(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	branchID, orgID, userID := tenantContext(r)
	if branchID == "" && orgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "branch_required"})
		return
	}

	res, err := db.Exec(`
		UPDATE qr_sessions SET is_active = false, closed_at = NOW()
		WHERE id = $1 AND is_active = true AND EXISTS (
			SELECT 1 FROM tables t JOIN branches b ON t.branch_id = b.id
			WHERE t.id = qr_sessions.table_id AND (b.id = $2 OR b.organization_id = $3)
		)
	`, id, branchID, orgID)
	if err != nil {
		log.Printf("Failed to close qr session: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session_not_found"})
		return
	}

	publishEvent("qr_session_closed", map[string]any{
		"qr_session_id": id,
		"closed_by":     userID,
	}, branchID, orgID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "closed"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	notificationServiceURL = os.Getenv("NOTIFICATION_SERVICE_URL")
	if notificationServiceURL == "" {
		notificationServiceURL = "http://localhost:8086"
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

	router.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		createOrder(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		listOrders(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/orders/{id}", func(w http.ResponseWriter, r *http.Request) {
		getOrder(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/orders/{id}/items", func(w http.ResponseWriter, r *http.Request) {
		addOrderItem(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/orders/{id}/items/{itemId}", func(w http.ResponseWriter, r *http.Request) {
		removeOrderItem(db, w, r)
	}).Methods(http.MethodDelete)

	router.HandleFunc("/api/orders/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		updateOrderStatus(db, w, r)
	}).Methods(http.MethodPut)

	// QR Sessions
	router.HandleFunc("/api/qr-sessions", func(w http.ResponseWriter, r *http.Request) {
		createQRSession(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/qr-sessions", func(w http.ResponseWriter, r *http.Request) {
		listQRSessions(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/qr-sessions/{id}/close", func(w http.ResponseWriter, r *http.Request) {
		closeQRSession(db, w, r)
	}).Methods(http.MethodPut)

	router.HandleFunc("/api/qr-sessions/token/{token}", func(w http.ResponseWriter, r *http.Request) {
		getQRSessionByToken(db, w, r)
	}).Methods(http.MethodGet)

	// Products endpoints
	router.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		listProducts(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		createProduct(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/products/{id}", func(w http.ResponseWriter, r *http.Request) {
		getProduct(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/products/{id}", func(w http.ResponseWriter, r *http.Request) {
		updateProduct(db, w, r)
	}).Methods(http.MethodPut)

	router.HandleFunc("/api/products/{id}", func(w http.ResponseWriter, r *http.Request) {
		deleteProduct(db, w, r)
	}).Methods(http.MethodDelete)

	// Reports endpoints
	router.HandleFunc("/api/reports/sales", func(w http.ResponseWriter, r *http.Request) {
		getSalesReport(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/reports/top-items", func(w http.ResponseWriter, r *http.Request) {
		getTopItems(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/reports/hourly-sales", func(w http.ResponseWriter, r *http.Request) {
		getHourlySales(db, w, r)
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

	log.Printf("Order service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func createOrder(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error: %v", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	branchID, orgID, userID := tenantContext(r)
	if req.CreatedBy == "" && userID != "" {
		req.CreatedBy = userID
	}

	var tableID *int
	if req.TableID != "" {
		id := 0
		_, err := fmt.Sscanf(req.TableID, "%d", &id)
		if err == nil {
			tableID = &id
		}
	}

	// If QR session token provided, resolve table + tenant context from session
	var qrSessionID *string
	if req.QrSessionToken != "" {
		sess, err := findActiveQRSession(db, req.QrSessionToken)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_qr_session"})
			return
		}
		if err != nil {
			log.Printf("Failed to fetch qr session: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}
		if !sess.IsActive {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "qr_session_closed"})
			return
		}
		qrSessionID = &sess.ID
		tableID = &sess.TableID
		branchID = sess.BranchID
		orgID = sess.OrganizationID
	}

	branchID, orgID, err := resolveContext(db, branchID, orgID, tableID)
	if err != nil {
		if err.Error() == "table_not_found" || err.Error() == "branch_not_found" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		log.Printf("Failed to resolve context: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	var orderNumber int
	if branchID != "" {
		err = db.QueryRow("SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE branch_id = $1", branchID).Scan(&orderNumber)
	} else if orgID != "" {
		err = db.QueryRow("SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE organization_id = $1", orgID).Scan(&orderNumber)
	} else {
		err = db.QueryRow("SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders").Scan(&orderNumber)
	}
	if err != nil {
		log.Printf("Failed to get order number: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	orderID := uuid.New().String()
	subtotal := 0.0
	for _, item := range req.Items {
		subtotal += item.Price * float64(item.Quantity)
	}
	tax := subtotal * 0.15

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO orders (id, organization_id, branch_id, table_id, qr_session_id, order_number, status, subtotal, tax, total_amount, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10, NOW(), NOW())
	`, orderID, nullable(orgID), nullable(branchID), tableID, nullablePtr(qrSessionID), orderNumber, subtotal, tax, subtotal+tax, nullable(req.CreatedBy))

	if err != nil {
		log.Printf("Failed to create order: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	for _, item := range req.Items {
		itemID := uuid.New().String()
		itemTotal := item.Price * float64(item.Quantity)
		_, err := tx.Exec(`
			INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, item_total, item_status, added_by, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, NOW())
		`, itemID, orderID, uuid.New().String(), item.ItemName, item.Quantity, item.Price, itemTotal, nullable(req.CreatedBy))
		if err != nil {
			log.Printf("Failed to create order item: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	// Publish event
	publishEvent("order_created", map[string]interface{}{
		"order_id":     orderID,
		"order_number": orderNumber,
		"status":       "OPEN",
		"total_amount": subtotal + tax,
	}, branchID, orgID)

	writeJSON(w, http.StatusCreated, map[string]any{
		"order_id":     orderID,
		"order_number": orderNumber,
		"status":       "OPEN",
		"total_amount": subtotal + tax,
	})
}

func getOrder(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	branchID, orgID, _ := tenantContext(r)

	query := `
		SELECT id, table_id, order_number, status, subtotal, tax, discount_amount, 
		       total_amount, created_by, created_at, updated_at
		FROM orders WHERE id = $1`
	args := []interface{}{id}

	if branchID != "" {
		query += " AND branch_id = $2"
		args = append(args, branchID)
	} else if orgID != "" {
		query += " AND organization_id = $2"
		args = append(args, orgID)
	}

	var order Order
	err := db.QueryRow(query, args...).Scan(
		&order.ID, &order.TableID, &order.OrderNumber, &order.Status,
		&order.Subtotal, &order.Tax, &order.DiscountAmount, &order.TotalAmount,
		&order.CreatedBy, &order.CreatedAt, &order.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "order_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get order: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	rows, err := db.Query(`
		SELECT id, menu_item_id, menu_item_name, quantity, unit_price, item_total, 
		       item_status, added_by, created_at
		FROM order_items WHERE order_id = $1 ORDER BY created_at DESC
	`, id)
	if err != nil {
		log.Printf("Failed to get items: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var items []OrderItem
	for rows.Next() {
		var item OrderItem
		item.OrderID = id
		rows.Scan(&item.ID, &item.MenuItemID, &item.MenuItemName, &item.Quantity,
			&item.UnitPrice, &item.ItemTotal, &item.ItemStatus, &item.AddedBy, &item.CreatedAt)
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"order": order,
		"items": items,
	})
}

func addOrderItem(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	orderID := mux.Vars(r)["id"]
	branchID, orgID, userID := tenantContext(r)
	if err := guardOrderScope(db, orderID, branchID, orgID); err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "order_not_found"})
			return
		}
		log.Printf("Scope check failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	var req AddItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.AddedBy == "" {
		if userID != "" {
			req.AddedBy = userID
		} else {
			req.AddedBy = uuid.New().String()
		}
	}

	itemTotal := float64(req.Quantity) * req.UnitPrice
	itemID := uuid.New().String()

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, 
		                         unit_price, item_total, item_status, added_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, NOW())
	`, itemID, orderID, req.MenuItemID, req.MenuItemName, req.Quantity, req.UnitPrice, itemTotal, req.AddedBy)

	if err != nil {
		log.Printf("Failed to add item: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	_, err = tx.Exec(`
		UPDATE orders 
		SET subtotal = subtotal + $1,
		    total_amount = total_amount + $1,
		    updated_at = NOW()
		WHERE id = $2
	`, itemTotal, orderID)

	if err != nil {
		log.Printf("Failed to update order totals: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         itemID,
		"order_id":   orderID,
		"item_total": itemTotal,
	})
}

func listOrders(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	tableID := r.URL.Query().Get("table_id")
	branchID, orgID, _ := tenantContext(r)

	query := `SELECT id, table_id, order_number, status, subtotal, tax, discount_amount, 
	       total_amount, created_by, created_at, updated_at FROM orders WHERE 1=1`
	var args []interface{}

	if status != "" {
		query += ` AND status = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, status)
	}
	if tableID != "" {
		query += ` AND table_id = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, tableID)
	}
	if branchID != "" {
		query += ` AND branch_id = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, branchID)
	} else if orgID != "" {
		query += ` AND organization_id = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, orgID)
	}

	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to list orders: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var order Order
		rows.Scan(&order.ID, &order.TableID, &order.OrderNumber, &order.Status,
			&order.Subtotal, &order.Tax, &order.DiscountAmount, &order.TotalAmount,
			&order.CreatedBy, &order.CreatedAt, &order.UpdatedAt)
		orders = append(orders, order)
	}

	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func removeOrderItem(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderID := vars["id"]
	itemID := vars["itemId"]
	branchID, orgID, _ := tenantContext(r)
	if err := guardOrderScope(db, orderID, branchID, orgID); err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "order_not_found"})
			return
		}
		log.Printf("Scope check failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	var itemTotal float64
	err := db.QueryRow(`
		SELECT oi.item_total FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE oi.id = $1 AND oi.order_id = $2
	`, itemID, orderID).Scan(&itemTotal)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "item_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get item: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`DELETE FROM order_items WHERE id = $1`, itemID)
	if err != nil {
		log.Printf("Failed to delete item: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	_, err = tx.Exec(`
		UPDATE orders 
		SET subtotal = subtotal - $1,
		    total_amount = total_amount - $1,
		    updated_at = NOW()
		WHERE id = $2
	`, itemTotal, orderID)

	if err != nil {
		log.Printf("Failed to update order totals: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func updateOrderStatus(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	orderID := mux.Vars(r)["id"]
	branchID, orgID, _ := tenantContext(r)
	if err := guardOrderScope(db, orderID, branchID, orgID); err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "order_not_found"})
			return
		}
		log.Printf("Scope check failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	_, err := db.Exec(`
		UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
	`, req.Status, orderID)

	if err != nil {
		log.Printf("Failed to update status: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	// Publish event
	publishEvent("order_status_updated", map[string]interface{}{
		"order_id": orderID,
		"status":   req.Status,
	}, branchID, orgID)

	writeJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func getSalesReport(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	// Parse query params
	from := r.URL.Query().Get("from") // YYYY-MM-DD
	to := r.URL.Query().Get("to")     // YYYY-MM-DD
	branchID, orgID, _ := tenantContext(r)

	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			DATE(created_at) AS date,
			COUNT(DISTINCT id) AS order_count,
			COALESCE(SUM(total_amount), 0) AS total_revenue,
			COALESCE(SUM(discount_amount), 0) AS total_discount,
			COALESCE(SUM(tax), 0) AS total_tax,
			COALESCE(AVG(total_amount), 0) AS avg_order_value
		FROM orders
		WHERE status IN ('PAID', 'CONFIRMED')
			AND DATE(created_at) BETWEEN $1 AND $2
	`

	args := []interface{}{from, to}
	if branchID != "" {
		query += " AND branch_id = $3"
		args = append(args, branchID)
	} else if orgID != "" {
		query += " AND organization_id = $3"
		args = append(args, orgID)
	}

	query += " GROUP BY DATE(created_at) ORDER BY date DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to get sales report: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	reports := []SalesReport{}
	for rows.Next() {
		var r SalesReport
		err := rows.Scan(&r.Date, &r.OrderCount, &r.TotalRevenue, &r.TotalDiscount, &r.TotalTax, &r.AvgOrderValue)
		if err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}
		reports = append(reports, r)
	}

	writeJSON(w, http.StatusOK, reports)
}

func getTopItems(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	limitStr := r.URL.Query().Get("limit")
	branchID, orgID, _ := tenantContext(r)

	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}
	limit := 10
	if limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	query := `
		SELECT 
			oi.menu_item_name,
			SUM(oi.quantity) AS quantity_sold,
			SUM(oi.item_total) AS total_revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE o.status IN ('PAID', 'CONFIRMED')
			AND DATE(o.created_at) BETWEEN $1 AND $2
	`

	args := []interface{}{from, to}
	argPos := 3

	if branchID != "" {
		query += fmt.Sprintf(" AND o.branch_id = $%d", argPos)
		args = append(args, branchID)
		argPos++
	} else if orgID != "" {
		query += fmt.Sprintf(" AND o.organization_id = $%d", argPos)
		args = append(args, orgID)
		argPos++
	}

	query += fmt.Sprintf(" GROUP BY oi.menu_item_name ORDER BY quantity_sold DESC LIMIT $%d", argPos)
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to get top items: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	items := []TopItem{}
	for rows.Next() {
		var item TopItem
		err := rows.Scan(&item.MenuItemName, &item.QuantitySold, &item.TotalRevenue)
		if err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, items)
}

func getHourlySales(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date") // YYYY-MM-DD
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	branchID, orgID, _ := tenantContext(r)

	query := `
		SELECT 
			EXTRACT(HOUR FROM created_at)::INT AS hour,
			COUNT(DISTINCT id) AS order_count,
			COALESCE(SUM(total_amount), 0) AS total_revenue
		FROM orders
		WHERE status IN ('PAID', 'CONFIRMED')
			AND DATE(created_at) = $1
	`

	args := []interface{}{date}
	argPos := 2

	if branchID != "" {
		query += fmt.Sprintf(" AND branch_id = $%d", argPos)
		args = append(args, branchID)
		argPos++
	} else if orgID != "" {
		query += fmt.Sprintf(" AND organization_id = $%d", argPos)
		args = append(args, orgID)
		argPos++
	}

	query += " GROUP BY hour ORDER BY hour"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to get hourly sales: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	sales := []HourlySales{}
	for rows.Next() {
		var s HourlySales
		err := rows.Scan(&s.Hour, &s.OrderCount, &s.TotalRevenue)
		if err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}
		sales = append(sales, s)
	}

	writeJSON(w, http.StatusOK, sales)
}

func listProducts(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	_, orgID, _ := tenantContext(r)
	
	// For public access (QR menu), allow organization_id from query param
	if orgID == "" {
		orgID = r.URL.Query().Get("organization_id")
	}
	
	if orgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organization_required"})
		return
	}

	category := r.URL.Query().Get("category")
	availableOnly := r.URL.Query().Get("available_only")
	branchID := r.URL.Query().Get("branch_id") // For public access (QR menu)

	query := `
		SELECT id, organization_id, name, description, price, category, image_url, 
		       is_available, sort_order, created_at, updated_at
		FROM products
		WHERE organization_id = $1
	`
	args := []interface{}{orgID}
	argPos := 2

	if category != "" {
		query += fmt.Sprintf(" AND category = $%d", argPos)
		args = append(args, category)
		argPos++
	}

	if availableOnly == "true" || branchID != "" {
		query += fmt.Sprintf(" AND is_available = true")
	}

	query += " ORDER BY sort_order, name LIMIT 500"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to list products: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var desc, cat, img sql.NullString
		err := rows.Scan(&p.ID, &p.OrganizationID, &p.Name, &desc, &p.Price, &cat, &img,
			&p.IsAvailable, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			log.Printf("Failed to scan product: %v", err)
			continue
		}
		if desc.Valid {
			p.Description = desc.String
		}
		if cat.Valid {
			p.Category = cat.String
		}
		if img.Valid {
			p.ImageURL = img.String
		}

		// Load options
		optRows, err := db.Query(`
			SELECT id, product_id, option_group, option_name, price_modifier, 
			       is_required, sort_order, created_at
			FROM product_options
			WHERE product_id = $1
			ORDER BY option_group, sort_order
		`, p.ID)
		if err == nil {
			defer optRows.Close()
			for optRows.Next() {
				var opt ProductOption
				err := optRows.Scan(&opt.ID, &opt.ProductID, &opt.OptionGroup, &opt.OptionName,
					&opt.PriceModifier, &opt.IsRequired, &opt.SortOrder, &opt.CreatedAt)
				if err == nil {
					p.Options = append(p.Options, opt)
				}
			}
		}

		products = append(products, p)
	}

	writeJSON(w, http.StatusOK, map[string]any{"products": products})
}

func getProduct(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	_, orgID, _ := tenantContext(r)

	var p Product
	var desc, cat, img sql.NullString
	err := db.QueryRow(`
		SELECT id, organization_id, name, description, price, category, image_url,
		       is_available, sort_order, created_at, updated_at
		FROM products
		WHERE id = $1 AND organization_id = $2
	`, id, orgID).Scan(&p.ID, &p.OrganizationID, &p.Name, &desc, &p.Price, &cat, &img,
		&p.IsAvailable, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "product_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get product: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	if desc.Valid {
		p.Description = desc.String
	}
	if cat.Valid {
		p.Category = cat.String
	}
	if img.Valid {
		p.ImageURL = img.String
	}

	// Load options
	optRows, err := db.Query(`
		SELECT id, product_id, option_group, option_name, price_modifier,
		       is_required, sort_order, created_at
		FROM product_options
		WHERE product_id = $1
		ORDER BY option_group, sort_order
	`, p.ID)
	if err == nil {
		defer optRows.Close()
		for optRows.Next() {
			var opt ProductOption
			err := optRows.Scan(&opt.ID, &opt.ProductID, &opt.OptionGroup, &opt.OptionName,
				&opt.PriceModifier, &opt.IsRequired, &opt.SortOrder, &opt.CreatedAt)
			if err == nil {
				p.Options = append(p.Options, opt)
			}
		}
	}

	writeJSON(w, http.StatusOK, p)
}

func createProduct(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	_, orgID, userID := tenantContext(r)
	if orgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organization_required"})
		return
	}

	// Check role - only MANAGER can create products
	role := r.Header.Get("X-User-Role")
	if role != "MANAGER" && role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "unauthorized"})
		return
	}

	var req CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.Name == "" || req.Price <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	productID := uuid.New().String()
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO products (id, organization_id, name, description, price, category, 
		                     image_url, is_available, sort_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
	`, productID, orgID, req.Name, nullable(req.Description), req.Price,
		nullable(req.Category), nullable(req.ImageURL), req.IsAvailable, req.SortOrder)

	if err != nil {
		log.Printf("Failed to create product: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	// Create options
	for _, optReq := range req.Options {
		optID := uuid.New().String()
		_, err := tx.Exec(`
			INSERT INTO product_options (id, product_id, option_group, option_name, 
			                            price_modifier, is_required, sort_order, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		`, optID, productID, optReq.OptionGroup, optReq.OptionName,
			optReq.PriceModifier, optReq.IsRequired, optReq.SortOrder)
		if err != nil {
			log.Printf("Failed to create product option: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	publishEvent("product_created", map[string]interface{}{
		"product_id": productID,
		"name":       req.Name,
	}, "", orgID)

	writeJSON(w, http.StatusCreated, map[string]string{"id": productID})
}

func updateProduct(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	_, orgID, _ := tenantContext(r)

	// Check role
	role := r.Header.Get("X-User-Role")
	if role != "MANAGER" && role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "unauthorized"})
		return
	}

	var req UpdateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argPos))
		args = append(args, *req.Name)
		argPos++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argPos))
		args = append(args, nullable(*req.Description))
		argPos++
	}
	if req.Price != nil {
		updates = append(updates, fmt.Sprintf("price = $%d", argPos))
		args = append(args, *req.Price)
		argPos++
	}
	if req.Category != nil {
		updates = append(updates, fmt.Sprintf("category = $%d", argPos))
		args = append(args, nullable(*req.Category))
		argPos++
	}
	if req.ImageURL != nil {
		updates = append(updates, fmt.Sprintf("image_url = $%d", argPos))
		args = append(args, nullable(*req.ImageURL))
		argPos++
	}
	if req.IsAvailable != nil {
		updates = append(updates, fmt.Sprintf("is_available = $%d", argPos))
		args = append(args, *req.IsAvailable)
		argPos++
	}
	if req.SortOrder != nil {
		updates = append(updates, fmt.Sprintf("sort_order = $%d", argPos))
		args = append(args, *req.SortOrder)
		argPos++
	}

	if len(updates) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no_updates"})
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, id, orgID)

	query := fmt.Sprintf(`
		UPDATE products
		SET %s
		WHERE id = $%d AND organization_id = $%d
	`, strings.Join(updates, ", "), argPos, argPos+1)

	res, err := db.Exec(query, args...)
	if err != nil {
		log.Printf("Failed to update product: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "product_not_found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func deleteProduct(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	_, orgID, _ := tenantContext(r)

	// Check role
	role := r.Header.Get("X-User-Role")
	if role != "MANAGER" && role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "unauthorized"})
		return
	}

	res, err := db.Exec(`
		DELETE FROM products
		WHERE id = $1 AND organization_id = $2
	`, id, orgID)

	if err != nil {
		log.Printf("Failed to delete product: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "product_not_found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func publishEvent(eventType string, data map[string]interface{}, branchID, orgID string) {
	if notificationServiceURL == "" {
		return
	}

	event := map[string]interface{}{
		"type":            eventType,
		"data":            data,
		"branch_id":       branchID,
		"organization_id": orgID,
	}

	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal event: %v", err)
		return
	}

	go func() {
		resp, err := http.Post(
			fmt.Sprintf("%s/api/events", notificationServiceURL),
			"application/json",
			bytes.NewBuffer(jsonData),
		)
		if err != nil {
			log.Printf("Failed to publish event: %v", err)
			return
		}
		defer resp.Body.Close()
	}()
}
