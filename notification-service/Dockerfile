FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o notification-service .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/notification-service .
EXPOSE 8086
CMD ["./notification-service"]
