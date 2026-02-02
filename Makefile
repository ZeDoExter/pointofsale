.PHONY: help build up down logs test clean mod-tidy

help:
	@echo "POS System Commands"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services (tilt up)"
	@echo "  make down       - Stop all services"
	@echo "  make logs       - Show logs"
	@echo "  make test       - Run tests"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make mod-tidy   - Tidy go.mod in all services"

build:
	docker compose build

up:
	tilt up

down:
	tilt down || true
	docker compose down -v

logs:
	docker compose logs -f

test:
	go test ./...

clean:
	rm -f api-gateway/api-gateway
	rm -f auth-service/auth-service
	rm -f order-service/order-service
	rm -f promotion-service/promotion-service
	rm -f payment-service/payment-service

mod-tidy:
	cd api-gateway && go mod tidy && cd ..
	cd auth-service && go mod tidy && cd ..
	cd order-service && go mod tidy && cd ..
	cd promotion-service && go mod tidy && cd ..
	cd payment-service && go mod tidy && cd ..
