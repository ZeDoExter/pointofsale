FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o auth-service .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/auth-service .
EXPOSE 8082
CMD ["./auth-service"]
