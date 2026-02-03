package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

var services = map[string]string{
	"auth":      "http://auth-service:8082",
	"order":     "http://order-service:8083",
	"promotion": "http://promotion-service:8084",
	"payment":   "http://payment-service:8085",
	"org":       "http://org-service:8085",
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret"
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
	if u := os.Getenv("ORG_SERVICE_URL"); u != "" {
		services["org"] = u
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
	router.PathPrefix("/api/organizations").Handler(proxyTo(services["org"]))

	// CRITICAL: CORS must come first to handle preflight requests
	handler := corsMiddleware(router)
	handler = authMiddleware(jwtSecret, handler)
	handler = loggingMiddleware(handler)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: handler,
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
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("Upstream error: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "upstream_unavailable"})
	}
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

func authMiddleware(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for: OPTIONS, health, auth endpoints, and user endpoints (GET/POST orders for QR menu)
		if r.Method == http.MethodOptions || r.URL.Path == "/health" || strings.HasPrefix(r.URL.Path, "/api/auth") {
			next.ServeHTTP(w, r)
			return
		}

		// Allow GET /api/orders for user (list orders)
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/orders") {
			next.ServeHTTP(w, r)
			return
		}

		// Allow POST /api/orders for user (create order without login)
		if r.Method == http.MethodPost && r.URL.Path == "/api/orders" {
			next.ServeHTTP(w, r)
			return
		}

		// All other endpoints require JWT token
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing_token"})
			return
		}

		tokenStr := strings.TrimPrefix(auth, "Bearer ")
		parsed, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(secret), nil
		})
		if err != nil || !parsed.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_token"})
			return
		}

		// Extract claims from token
		claims, ok := parsed.Claims.(jwt.MapClaims)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_claims"})
			return
		}

		role, _ := claims["role"].(string)
		userID, _ := claims["sub"].(string)

		// Extract org/branch context
		organizationID, _ := claims["organization_id"].(string)
		branchID, _ := claims["branch_id"].(string)

		// Add context to request headers for downstream services
		r.Header.Set("X-User-ID", userID)
		r.Header.Set("X-User-Role", role)
		if organizationID != "" {
			r.Header.Set("X-Organization-ID", organizationID)
		}
		if branchID != "" {
			r.Header.Set("X-Branch-ID", branchID)
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			log.Printf("%s %s", r.Method, r.URL.Path)
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
