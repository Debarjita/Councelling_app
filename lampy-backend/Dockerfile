# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git and other dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install sqlite and ca-certificates
RUN apk --no-cache add ca-certificates sqlite

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Create necessary directories
RUN mkdir -p uploads/profiles uploads/verification uploads/age_verification

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]