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
	"strings"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret"
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

	router.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.Username == "" || req.Password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing_credentials"})
			return
		}

		// Query user with org/branch context
		var userID, passwordHash, role, fullName, email string
		var organizationID, branchID sql.NullString
		var isActive bool
		err := db.QueryRow(`
			SELECT u.id, u.password_hash, u.role, u.full_name, u.email, u.organization_id, u.branch_id, u.is_active
			FROM users u
			WHERE u.username = $1
		`, req.Username).Scan(&userID, &passwordHash, &role, &fullName, &email, &organizationID, &branchID, &isActive)

		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
			return
		}
		if err != nil {
			log.Printf("DB error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}

		if !isActive {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "user_inactive"})
			return
		}

		// Update last login
		_, _ = db.Exec("UPDATE users SET last_login_at = NOW() WHERE id = $1", userID)

		// TODO: Add password verification (bcrypt)
		// For now, accepting any password for development

		// Build JWT claims with scope
		claims := jwt.MapClaims{
			"sub":      userID,
			"username": req.Username,
			"role":     role,
			"name":     fullName,
			"email":    email,
			"iat":      time.Now().Unix(),
			"exp":      time.Now().Add(8 * time.Hour).Unix(),
		}

		// Add org/branch context based on role
		if organizationID.Valid {
			claims["organization_id"] = organizationID.String
		}
		if branchID.Valid {
			claims["branch_id"] = branchID.String
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token_sign_failed"})
			return
		}

		// Prepare response
		response := map[string]any{
			"access_token": signed,
			"role":         role,
			"username":     req.Username,
			"name":         fullName,
		}

		if organizationID.Valid {
			response["organization_id"] = organizationID.String
		}
		if branchID.Valid {
			response["branch_id"] = branchID.String
		}

		writeJSON(w, http.StatusOK, response)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/auth/validate", func(w http.ResponseWriter, r *http.Request) {
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
			return []byte(jwtSecret), nil
		})
		if err != nil || !parsed.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_token"})
			return
		}

		claims, _ := parsed.Claims.(jwt.MapClaims)
		writeJSON(w, http.StatusOK, map[string]any{
			"valid": true,
			"sub":   claims["sub"],
			"role":  claims["role"],
		})
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
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
			return []byte(jwtSecret), nil
		})
		if err != nil || !parsed.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_token"})
			return
		}

		claims, _ := parsed.Claims.(jwt.MapClaims)

		// Preserve all claims in refresh token
		newClaims := jwt.MapClaims{
			"sub":      claims["sub"],
			"username": claims["username"],
			"role":     claims["role"],
			"name":     claims["name"],
			"email":    claims["email"],
			"iat":      time.Now().Unix(),
			"exp":      time.Now().Add(8 * time.Hour).Unix(),
		}

		if orgID, ok := claims["organization_id"]; ok {
			newClaims["organization_id"] = orgID
		}
		if branchID, ok := claims["branch_id"]; ok {
			newClaims["branch_id"] = branchID
		}

		newToken := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
		signed, err := newToken.SignedString([]byte(jwtSecret))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token_sign_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"access_token": signed,
		})
	}).Methods(http.MethodPost)

	// GET /api/auth/me - Get current user info
	router.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
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
			return []byte(jwtSecret), nil
		})
		if err != nil || !parsed.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_token"})
			return
		}

		claims, _ := parsed.Claims.(jwt.MapClaims)
		userID := claims["sub"].(string)

		// Get fresh user data from database
		var fullName, email, role, username string
		var organizationID, branchID sql.NullString
		var orgName, branchName sql.NullString

		err = db.QueryRow(`
			SELECT u.username, u.full_name, u.email, u.role, u.organization_id, u.branch_id,
			       o.name as org_name, b.name as branch_name
			FROM users u
			LEFT JOIN organizations o ON u.organization_id = o.id
			LEFT JOIN branches b ON u.branch_id = b.id
			WHERE u.id = $1 AND u.is_active = true
		`, userID).Scan(&username, &fullName, &email, &role, &organizationID, &branchID, &orgName, &branchName)

		if err != nil {
			log.Printf("Failed to get user: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
			return
		}

		response := map[string]any{
			"id":       userID,
			"username": username,
			"name":     fullName,
			"email":    email,
			"role":     role,
		}

		if organizationID.Valid {
			response["organization_id"] = organizationID.String
			if orgName.Valid {
				response["organization_name"] = orgName.String
			}
		}
		if branchID.Valid {
			response["branch_id"] = branchID.String
			if branchName.Valid {
				response["branch_name"] = branchName.String
			}
		}

		writeJSON(w, http.StatusOK, response)
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

	log.Printf("Auth service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
