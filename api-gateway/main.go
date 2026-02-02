package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"syscall"

	"github.com/gorilla/mux"
)

var services = map[string]string{
	"auth":      "http://localhost:8082",
	"order":     "http://localhost:8083",
	"promotion": "http://localhost:8084",
	"payment":   "http://localhost:8085",
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if u := os.Getenv("AUTH_SERVICE_URL"); u != "" {
		services["auth"] = u
	}
	if u := os.Getenv("ORDER_SERVICE_URL"); u != "" {
		services["order"] = u
	}
	if u := os.Getenv("PROMOTION_SERVICE_URL"); u != "" {
		services["promotion"] = u
	}
	if u := os.Getenv("PAYMENT_SERVICE_URL"); u != "" {
		services["payment"] = u
	}

	router := mux.NewRouter()

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods(http.MethodGet)

	router.PathPrefix("/api/auth").Handler(proxyTo(services["auth"]))
	router.PathPrefix("/api/orders").Handler(proxyTo(services["order"]))
	router.PathPrefix("/api/promotions").Handler(proxyTo(services["promotion"]))
	router.PathPrefix("/api/payments").Handler(proxyTo(services["payment"]))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: corsMiddleware(router),
	}

	go func() {
		sigch := make(chan os.Signal, 1)
		signal.Notify(sigch, syscall.SIGTERM, syscall.SIGINT)
		<-sigch
		server.Shutdown(context.Background())
	}()

	log.Printf("API Gateway on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func proxyTo(target string) http.Handler {
	u, _ := url.Parse(target)
	proxy := httputil.NewSingleHostReverseProxy(u)
	return proxy
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
