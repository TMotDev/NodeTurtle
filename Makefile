
# Database connection info
DB_HOST 	?=
DB_PORT 	?=
DB_USER 	?=
DB_PASSWORD ?=
DB_NAME 	?=
DB_URL := postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

# Migration variables
MIGRATIONS_DIR := migrations

# Build variables
BIN_DIR := bin
APP_NAME := NodeTurtleAPI
BUILD_DIR := build

.PHONY: all build clean run db/psql db/migrations/new db/migrations/up db/migrations/down db/migrations/migrate-down-1 db/create db/drop db/reset test/run test/coverage docs/generate fmt lint deps dev-tools dev help

# Help command
help:
	@echo "Available commands:"
	@echo "  make build             			- Build the application"
	@echo "  make clean             			- Clean build artifacts"
	@echo "  make run               			- Run the application"
	@echo "  make db/migrations/new 			- Create a new migration"
	@echo "  make db/psql						- Open a PostgreSQL shell"
	@echo "  make db/migrations/up        		- Apply all migrations"
	@echo "  make db/migrations/down      		- Rollback all migrations"
	@echo "  make db/migrations/migrate-down-1  - Rollback one migration"
	@echo "  make db/create         			- Create database"
	@echo "  make db/drop           			- Drop database"
	@echo "  make db/reset          			- Reset database (drop, create, migrate)"
	@echo "  make test/run              		- Run tests"
	@echo "  make test/coverage     			- Run tests with coverage"
	@echo "  make docs/generate              	- Generate API documentation"
	@echo "  make fmt               			- Format Go code"
	@echo "  make lint              			- Run linter"
	@echo "  make deps              			- Install dependencies"
	@echo "  make dev-tools         			- Install development tools"
	@echo "  make dev               			- Start development server with hot reload"

all: build

# Build the application
build:
	@echo "Building application..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/server

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)

# Run the application
run:
	@echo "Running application..."
	go run ./cmd/server/main.go

## db/migrations/new name=$1: create a new database migration
db/migrations/new:
	@echo 'Creating migration files for ${name}...'
	migrate create -seq -ext=.sql -dir=$(MIGRATIONS_DIR) ${name}

db/psql:
	psql ${DB_URL}

# Apply all migrations
db/migrations/up:
	@echo 'Running up migrations...'
	migrate -path $(MIGRATIONS_DIR) -database ${DB_URL} -verbose up

# Rollback all migrations
db/migrations/down:
	@echo "Rolling back migrations..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" -verbose down

# Rollback one step
db/migrations/migrate-down-1:
	@echo "Rolling back one migration..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" -verbose down 1

# Create database
db/create:
	@echo "Creating database..."
	@PGPASSWORD=$(DB_PASSWORD) createdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)

# Drop database
db/drop:
	@echo "Dropping database..."
	@PGPASSWORD=$(DB_PASSWORD) dropdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) --if-exists $(DB_NAME)

# Reset database (drop, create, migrate)
db/reset: db/drop db/create db/mibrations/up
	@echo "Database reset complete"

# Run tests
test/run:
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
test/coverage:
	@echo "Running tests with coverage..."
	@go test -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html

# Generate API documentation
docs/generate:
	@echo "Generating API documentation..."
	@swag init -g cmd/server/main.go

# Format Go code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download

# Install development tools
dev-tools:
	@echo "Installing development tools..."
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Start development server with hot reload
dev:
	@echo "Starting development server with hot reload..."
	@air -c .air.toml

