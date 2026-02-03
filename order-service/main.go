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
	"bytes"

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
	TableID   string            `json:"table_id"`
	Items     []CreateOrderItem `json:"items"`
	CreatedBy string            `json:"created_by"`
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

	// Extract scope from headers (set by API gateway)
	branchID := r.Header.Get("X-Branch-ID")
	organizationID := r.Header.Get("X-Organization-ID")

	if branchID == "" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "branch_required"})
		return
	}

	// If no created_by provided (guest order), use NULL
	var createdBy *string
	if req.CreatedBy != "" {
		createdBy = &req.CreatedBy
	}

	var tableID *int
	if req.TableID != "" {
		id := 0
		_, err := fmt.Sscanf(req.TableID, "%d", &id)
		if err == nil {
			tableID = &id
		}
	}

	var orderNumber int
	err := db.QueryRow("SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE branch_id = $1", branchID).Scan(&orderNumber)
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
		INSERT INTO orders (id, organization_id, branch_id, table_id, order_number, status, subtotal, tax, total_amount, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7, $8, $9, NOW(), NOW())
	`, orderID, organizationID, branchID, tableID, orderNumber, subtotal, tax, subtotal+tax, createdBy)

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
		`, itemID, orderID, uuid.New().String(), item.ItemName, item.Quantity, item.Price, itemTotal, createdBy)
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
	}, branchID, organizationID)

	writeJSON(w, http.StatusCreated, map[string]any{
		"order_id":     orderID,
		"order_number": orderNumber,
		"status":       "OPEN",
		"total_amount": subtotal + tax,
	})
}

func getOrder(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	branchID := r.Header.Get("X-Branch-ID")

	var order Order
	err := db.QueryRow(`
		SELECT id, table_id, order_number, status, subtotal, tax, discount_amount, 
		       total_amount, created_by, created_at, updated_at
		FROM orders WHERE id = $1 AND branch_id = $2
	`, id, branchID).Scan(
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

	var req AddItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.AddedBy == "" {
		req.AddedBy = uuid.New().String()
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
	branchID := r.Header.Get("X-Branch-ID")
	status := r.URL.Query().Get("status")
	tableID := r.URL.Query().Get("table_id")

	query := `SELECT id, table_id, order_number, status, subtotal, tax, discount_amount, 
	       total_amount, created_by, created_at, updated_at FROM orders WHERE branch_id = $1`
	var args []interface{}
	args = append(args, branchID)

	if status != "" {
		query += ` AND status = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, status)
	}
	if tableID != "" {
		query += ` AND table_id = $` + fmt.Sprintf("%d", len(args)+1)
		args = append(args, tableID)
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
	branchID := r.Header.Get("X-Branch-ID")

	var itemTotal float64
	err := db.QueryRow(`
		SELECT oi.item_total FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE oi.id = $1 AND oi.order_id = $2 AND o.branch_id = $3
	`, itemID, orderID, branchID).Scan(&itemTotal)
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
	branchID := r.Header.Get("X-Branch-ID")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	_, err := db.Exec(`
		UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND branch_id = $3
	`, req.Status, orderID, branchID)

	if err != nil {
		log.Printf("Failed to update status: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	// Publish event
	organizationID := r.Header.Get("X-Organization-ID")
	publishEvent("order_status_updated", map[string]interface{}{
		"order_id": orderID,
		"status":   req.Status,
	}, branchID, organizationID)

	writeJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func getSalesReport(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	branchID := r.Header.Get("X-Branch-ID")
	organizationID := r.Header.Get("X-Organization-ID")
	role := r.Header.Get("X-User-Role")

	// Parse query params
	from := r.URL.Query().Get("from") // YYYY-MM-DD
	to := r.URL.Query().Get("to")     // YYYY-MM-DD

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
	argPos := 3

	if role == "ADMIN" {
		// Admin sees all
	} else if role == "MANAGER" && organizationID != "" {
		query += fmt.Sprintf(" AND organization_id = $%d", argPos)
		args = append(args, organizationID)
		argPos++
	} else if branchID != "" {
		query += fmt.Sprintf(" AND branch_id = $%d", argPos)
		args = append(args, branchID)
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
	branchID := r.Header.Get("X-Branch-ID")
	organizationID := r.Header.Get("X-Organization-ID")
	role := r.Header.Get("X-User-Role")

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	limitStr := r.URL.Query().Get("limit")

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

	if role == "ADMIN" {
		// Admin sees all
	} else if role == "MANAGER" && organizationID != "" {
		query += fmt.Sprintf(" AND o.organization_id = $%d", argPos)
		args = append(args, organizationID)
		argPos++
	} else if branchID != "" {
		query += fmt.Sprintf(" AND o.branch_id = $%d", argPos)
		args = append(args, branchID)
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
	branchID := r.Header.Get("X-Branch-ID")
	organizationID := r.Header.Get("X-Organization-ID")
	role := r.Header.Get("X-User-Role")

	date := r.URL.Query().Get("date") // YYYY-MM-DD
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

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

	if role == "ADMIN" {
		// Admin sees all
	} else if role == "MANAGER" && organizationID != "" {
		query += fmt.Sprintf(" AND organization_id = $%d", argPos)
		args = append(args, organizationID)
		argPos++
	} else if branchID != "" {
		query += fmt.Sprintf(" AND branch_id = $%d", argPos)
		args = append(args, branchID)
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
