# Database connection info
DB_HOST 	?= host
DB_PORT 	?= 1234
DB_USER 	?= user
DB_PASSWORD ?= password
DB_NAME 	?= name
DB_URL 		:= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

# Test Database connection info
TEST_DB_HOST 	 ?= host
TEST_DB_PORT 	 ?= 1234
TEST_DB_USER 	 ?= user
TEST_DB_PASSWORD ?= password
TEST_DB_NAME 	 ?= name
TEST_DB_URL 	 := postgres://$(TEST_DB_USER):$(TEST_DB_PASSWORD)@$(TEST_DB_HOST):$(TEST_DB_PORT)/$(TEST_DB_NAME)?sslmode=disable

# Migration variables
MIGRATIONS_DIR := migrations

# Build variables
BIN_DIR := bin
APP_NAME := NodeTurtleAPI
BUILD_DIR := build

.PHONY: all build clean run db/psql db/migrations/new db/migrations/up db/migrations/down db/migrations/migrate-down-1 db/create db/drop db/reset test/run test/coverage docs/generate fmt lint deps dev-tools dev help test/db/create test/db/drop test/db/migrate/up test/db/migrate/down

# Help command
help:
	@echo "Available commands:"
	@echo "  make build             			- Build the application"
	@echo "  make clean             			- Clean build artifacts"
	@echo "  make run               			- Run the application"
	@echo "  make db/create         			- Create main database"
	@echo "  make db/drop           			- Drop main database"
	@echo "  make db/migrations/up  			- Migrate main database up"
	@echo "  make test/db/create    			- Create test database"
	@echo "  make test/db/drop      			- Drop test database"
	@echo "  make test/db/migrate/up			- Migrate test database up"

all: build

# Build the application
build:
	@echo "Building application..."
	@if not exist $(BUILD_DIR) mkdir $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME).exe ./cmd/server

# Clean build artifacts (Windows compatible)
clean:
	@echo "Cleaning build artifacts..."
	@if exist $(BUILD_DIR) rd /s /q $(BUILD_DIR)

# Run the application
run:
	@echo "Running application..."
	go run ./cmd/server/main.go

## db/migrations/new name=$1: create a new database migration
db/migrations/new:
	@echo "Creating migration files for ${name}..."
	migrate create -seq -ext=.sql -dir=$(MIGRATIONS_DIR) ${name}

db/psql:
	psql ${DB_URL}

# --- MAIN DATABASE COMMANDS ---

# Apply all migrations
db/migrations/up:
	@echo "Running up migrations..."
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" -verbose up

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
	@set PGPASSWORD=$(DB_PASSWORD) && createdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)

# Drop database
db/drop:
	@echo "Dropping database..."
	@set PGPASSWORD=$(DB_PASSWORD) && dropdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)

# Reset database (drop, create, migrate)
db/reset: db/drop db/create db/migrations/up
	@echo "Database reset complete"

# --- TEST DATABASE COMMANDS ---

# Create Test database
test/db/create:
	@echo "Creating TEST database..."
	@set PGPASSWORD=$(TEST_DB_PASSWORD) && createdb -h $(TEST_DB_HOST) -p $(TEST_DB_PORT) -U $(TEST_DB_USER) $(TEST_DB_NAME)

# Drop Test database
test/db/drop:
	@echo "Dropping TEST database..."
	@set PGPASSWORD=$(TEST_DB_PASSWORD) && dropdb -h $(TEST_DB_HOST) -p $(TEST_DB_PORT) -U $(TEST_DB_USER) $(TEST_DB_NAME)

# Apply migrations to Test DB
test/db/migrate/up:
	@echo "Running up migrations for TEST DB..."
	migrate -path $(MIGRATIONS_DIR) -database "$(TEST_DB_URL)" -verbose up

# Rollback migrations on Test DB
test/db/migrate/down:
	@echo "Rolling back migrations for TEST DB..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(TEST_DB_URL)" -verbose down

# Reset Test Database
test/db/reset: test/db/drop test/db/create test/db/migrate/up
	@echo "Test Database reset complete"

# --- TESTING & TOOLS ---

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