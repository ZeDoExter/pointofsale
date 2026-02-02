FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o promotion-service .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/promotion-service .
EXPOSE 8084
CMD ["./promotion-service"]
