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
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Organization struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	ContactEmail string    `json:"contact_email"`
	ContactPhone string    `json:"contact_phone"`
	PlanType     string    `json:"plan_type"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Branch struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Address        string    `json:"address"`
	City           string    `json:"city"`
	Province       string    `json:"province"`
	PostalCode     string    `json:"postal_code"`
	Phone          string    `json:"phone"`
	Email          string    `json:"email"`
	OpeningTime    string    `json:"opening_time"`
	ClosingTime    string    `json:"closing_time"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateOrgRequest struct {
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	ContactEmail string `json:"contact_email"`
	ContactPhone string `json:"contact_phone"`
	PlanType     string `json:"plan_type"`
}

type CreateBranchRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Address     string `json:"address"`
	City        string `json:"city"`
	Province    string `json:"province"`
	PostalCode  string `json:"postal_code"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	OpeningTime string `json:"opening_time"`
	ClosingTime string `json:"closing_time"`
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

	// Organizations
	router.HandleFunc("/api/organizations", func(w http.ResponseWriter, r *http.Request) {
		listOrganizations(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/organizations", func(w http.ResponseWriter, r *http.Request) {
		createOrganization(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/organizations/{id}", func(w http.ResponseWriter, r *http.Request) {
		getOrganization(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/organizations/{id}", func(w http.ResponseWriter, r *http.Request) {
		updateOrganization(db, w, r)
	}).Methods(http.MethodPut)

	// Branches
	router.HandleFunc("/api/organizations/{orgId}/branches", func(w http.ResponseWriter, r *http.Request) {
		listBranches(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/organizations/{orgId}/branches", func(w http.ResponseWriter, r *http.Request) {
		createBranch(db, w, r)
	}).Methods(http.MethodPost)

	router.HandleFunc("/api/organizations/{orgId}/branches/{id}", func(w http.ResponseWriter, r *http.Request) {
		getBranch(db, w, r)
	}).Methods(http.MethodGet)

	router.HandleFunc("/api/organizations/{orgId}/branches/{id}", func(w http.ResponseWriter, r *http.Request) {
		updateBranch(db, w, r)
	}).Methods(http.MethodPut)

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

// Organizations
func listOrganizations(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin_required"})
		return
	}

	rows, err := db.Query(`
		SELECT id, name, slug, contact_email, contact_phone, plan_type, is_active, created_at, updated_at
		FROM organizations WHERE is_active = true ORDER BY created_at DESC LIMIT 100
	`)
	if err != nil {
		log.Printf("Failed to list orgs: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var orgs []Organization
	for rows.Next() {
		var org Organization
		rows.Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.ContactPhone, &org.PlanType, &org.IsActive, &org.CreatedAt, &org.UpdatedAt)
		orgs = append(orgs, org)
	}

	writeJSON(w, http.StatusOK, map[string]any{"organizations": orgs})
}

func createOrganization(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin_required"})
		return
	}

	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.Name == "" || req.Slug == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_and_slug_required"})
		return
	}

	orgID := uuid.New().String()
	planType := req.PlanType
	if planType == "" {
		planType = "FREE"
	}

	_, err := db.Exec(`
		INSERT INTO organizations (id, name, slug, contact_email, contact_phone, plan_type, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
	`, orgID, req.Name, req.Slug, req.ContactEmail, req.ContactPhone, planType)

	if err != nil {
		log.Printf("Failed to create org: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": orgID, "name": req.Name})
}

func getOrganization(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	role := r.Header.Get("X-User-Role")
	organizationID := r.Header.Get("X-Organization-ID")

	var org Organization
	err := db.QueryRow(`
		SELECT id, name, slug, contact_email, contact_phone, plan_type, is_active, created_at, updated_at
		FROM organizations WHERE id = $1
	`, id).Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.ContactPhone, &org.PlanType, &org.IsActive, &org.CreatedAt, &org.UpdatedAt)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "org_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get org: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	if role == "MANAGER" && organizationID != id {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}

	writeJSON(w, http.StatusOK, org)
}

func updateOrganization(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "ADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin_required"})
		return
	}

	id := mux.Vars(r)["id"]
	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	_, err := db.Exec(`
		UPDATE organizations SET name = $1, slug = $2, contact_email = $3, contact_phone = $4, plan_type = $5, updated_at = NOW()
		WHERE id = $6
	`, req.Name, req.Slug, req.ContactEmail, req.ContactPhone, req.PlanType, id)

	if err != nil {
		log.Printf("Failed to update org: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Branches
func listBranches(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	orgID := mux.Vars(r)["orgId"]
	role := r.Header.Get("X-User-Role")
	userOrgID := r.Header.Get("X-Organization-ID")

	if role == "MANAGER" && userOrgID != orgID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}

	rows, err := db.Query(`
		SELECT id, organization_id, name, slug, address, city, province, postal_code, phone, email, 
		       opening_time, closing_time, is_active, created_at, updated_at
		FROM branches WHERE organization_id = $1 AND is_active = true ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		log.Printf("Failed to list branches: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}
	defer rows.Close()

	var branches []Branch
	for rows.Next() {
		var b Branch
		var openingTime, closingTime sql.NullString
		rows.Scan(&b.ID, &b.OrganizationID, &b.Name, &b.Slug, &b.Address, &b.City, &b.Province, &b.PostalCode, &b.Phone, &b.Email,
			&openingTime, &closingTime, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
		if openingTime.Valid {
			b.OpeningTime = openingTime.String
		}
		if closingTime.Valid {
			b.ClosingTime = closingTime.String
		}
		branches = append(branches, b)
	}

	writeJSON(w, http.StatusOK, map[string]any{"branches": branches})
}

func createBranch(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	orgID := mux.Vars(r)["orgId"]
	role := r.Header.Get("X-User-Role")
	userOrgID := r.Header.Get("X-Organization-ID")

	if role == "MANAGER" && userOrgID != orgID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}
	if role == "CASHIER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "cashier_cannot_create"})
		return
	}

	var req CreateBranchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if req.Name == "" || req.Slug == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_and_slug_required"})
		return
	}

	branchID := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO branches (id, organization_id, name, slug, address, city, province, postal_code, phone, email,
		                      opening_time, closing_time, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
	`, branchID, orgID, req.Name, req.Slug, req.Address, req.City, req.Province, req.PostalCode, req.Phone, req.Email,
		req.OpeningTime, req.ClosingTime)

	if err != nil {
		log.Printf("Failed to create branch: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": branchID, "name": req.Name})
}

func getBranch(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID := vars["orgId"]
	id := vars["id"]
	role := r.Header.Get("X-User-Role")
	userOrgID := r.Header.Get("X-Organization-ID")
	userBranchID := r.Header.Get("X-Branch-ID")

	if role == "MANAGER" && userOrgID != orgID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}
	if role == "CASHIER" && userBranchID != id {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}

	var b Branch
	var openingTime, closingTime sql.NullString
	err := db.QueryRow(`
		SELECT id, organization_id, name, slug, address, city, province, postal_code, phone, email,
		       opening_time, closing_time, is_active, created_at, updated_at
		FROM branches WHERE id = $1 AND organization_id = $2
	`, id, orgID).Scan(&b.ID, &b.OrganizationID, &b.Name, &b.Slug, &b.Address, &b.City, &b.Province, &b.PostalCode, &b.Phone, &b.Email,
		&openingTime, &closingTime, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "branch_not_found"})
		return
	}
	if err != nil {
		log.Printf("Failed to get branch: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	if openingTime.Valid {
		b.OpeningTime = openingTime.String
	}
	if closingTime.Valid {
		b.ClosingTime = closingTime.String
	}

	writeJSON(w, http.StatusOK, b)
}

func updateBranch(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID := vars["orgId"]
	id := vars["id"]
	role := r.Header.Get("X-User-Role")
	userOrgID := r.Header.Get("X-Organization-ID")

	if role == "MANAGER" && userOrgID != orgID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "access_denied"})
		return
	}
	if role == "CASHIER" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "cashier_cannot_update"})
		return
	}

	var req CreateBranchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	_, err := db.Exec(`
		UPDATE branches SET name = $1, slug = $2, address = $3, city = $4, province = $5, postal_code = $6,
		                   phone = $7, email = $8, opening_time = $9, closing_time = $10, updated_at = NOW()
		WHERE id = $11 AND organization_id = $12
	`, req.Name, req.Slug, req.Address, req.City, req.Province, req.PostalCode, req.Phone, req.Email,
		req.OpeningTime, req.ClosingTime, id, orgID)

	if err != nil {
		log.Printf("Failed to update branch: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
