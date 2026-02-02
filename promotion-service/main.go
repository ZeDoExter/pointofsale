package main

import (
"context"
"database/sql"
"fmt"
"log"
"net/http"
"os"
"os/signal"
"syscall"

"github.com/gin-gonic/gin"
_ "github.com/lib/pq"
"github.com/navap/pointofsale/promotion-service/internal/config"
"github.com/navap/pointofsale/promotion-service/internal/handler"
"github.com/navap/pointofsale/promotion-service/internal/repository"
"github.com/navap/pointofsale/promotion-service/internal/service"
)

func main() {
cfg := config.LoadConfig()

db, err := sql.Open("postgres", cfg.DatabaseURL)
if err != nil {
log.Fatalf("Failed to connect to database: %v", err)
}
defer db.Close()

if err := db.Ping(); err != nil {
log.Fatalf("Database ping failed: %v", err)
}

router := gin.Default()

promotionRepo := repository.NewPromotionRepository(db)
promotionService := service.NewPromotionService(promotionRepo)
promotionHandler := handler.NewPromotionHandler(promotionService)

promotionHandler.RegisterRoutes(router)

server := &http.Server{
Addr:    fmt.Sprintf(":%s", cfg.Port),
Handler: router,
}

go func() {
sigch := make(chan os.Signal, 1)
signal.Notify(sigch, syscall.SIGTERM, syscall.SIGINT)
<-sigch
server.Shutdown(context.Background())
}()

log.Printf("Promotion service starting on port %s", cfg.Port)
if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
log.Fatalf("Server error: %v", err)
}
}
