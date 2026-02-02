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

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

type CheckoutRequest struct {
	OrderID        string  `json:"order_id"`
	Amount         float64 `json:"amount"`
	PromotionCode  string  `json:"promotion_code"`
	IdempotencyKey string  `json:"idempotency_key"`
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

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("DB connect failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("DB ping failed: %v", err)
	}

	router := mux.NewRouter()

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/payments/checkout", func(w http.ResponseWriter, r *http.Request) {
		var req CheckoutRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		writeJSON(w, http.StatusOK, map[string]any{
			"order_id": req.OrderID,
			"status":   "CONFIRMED",
			"amount":   req.Amount,
		})
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/payments/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		writeJSON(w, http.StatusOK, map[string]any{
			"id":     id,
			"status": "PENDING",
		})
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
