FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /auth-service .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /auth-service /auth-service
EXPOSE 8082
CMD ["/auth-service"]
