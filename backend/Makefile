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

# PostgreSQL bin directory (adjust this to your PostgreSQL installation path)
PG_BIN ?= C:/Program Files/PostgreSQL/16/bin/

# Migration variables
MIGRATIONS_DIR := migrations

# Build variables
BUILD_DIR := build
APP_NAME := NodeTurtleAPI

.PHONY: help build clean run db/create db/drop db/migrations/new db/migrations/up db/migrations/down db/reset test/db/create test/db/drop test/db/migrations/up test/db/reset setup/all

# Help command
help:
	@echo "Available commands:"
	@echo "  make build                  - Build the application"
	@echo "  make clean                  - Clean build artifacts"
	@echo "  make run                    - Run the application"
	@echo ""
	@echo "Main Database:"
	@echo "  make db/create              - Create main database"
	@echo "  make db/drop                - Drop main database"
	@echo "  make db/migrations/new      - Create new migration (use name=your_migration_name)"
	@echo "  make db/migrations/up       - Run all migrations"
	@echo "  make db/migrations/down     - Rollback all migrations"
	@echo "  make db/reset               - Drop, create, and migrate main database"
	@echo ""
	@echo "Test Database:"
	@echo "  make test/db/create         - Create test database"
	@echo "  make test/db/drop           - Drop test database"
	@echo "  make test/db/migrations/up  - Run all migrations on test database"
	@echo "  make test/db/reset          - Drop, create, and migrate test database"
	@echo ""
	@echo "Quick Setup:"
	@echo "  make setup/all              - Create and migrate both databases"

# Build the application
build:
	@echo "Building application..."
	@if not exist $(BUILD_DIR) mkdir $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME).exe ./cmd/server

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@if exist $(BUILD_DIR) rd /s /q $(BUILD_DIR)

# Run the application
run:
	@echo "Running application..."
	@go run ./cmd/server/main.go

# Create new migration
db/migrations/new:
	@echo "Creating migration files for ${name}..."
	@migrate create -seq -ext=.sql -dir=$(MIGRATIONS_DIR) ${name}

# --- MAIN DATABASE ---

db/create:
	@echo "Creating main database..."
	@set PGPASSWORD=$(DB_PASSWORD)&& "$(PG_BIN)createdb" -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)
	@echo "Main database created successfully!"

db/drop:
	@echo "Dropping main database..."
	@set PGPASSWORD=$(DB_PASSWORD)&& "$(PG_BIN)dropdb" -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)
	@echo "Main database dropped!"

db/migrations/up:
	@echo "Running migrations on main database..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" -verbose up
	@echo "Migrations completed!"

db/migrations/down:
	@echo "Rolling back all migrations on main database..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" -verbose down

db/reset: db/drop db/create db/migrations/up
	@echo "Main database reset complete!"

# --- TEST DATABASE ---

test/db/create:
	@echo "Creating test database..."
	@set PGPASSWORD=$(TEST_DB_PASSWORD)&& "$(PG_BIN)createdb" -h $(TEST_DB_HOST) -p $(TEST_DB_PORT) -U $(TEST_DB_USER) $(TEST_DB_NAME)
	@echo "Test database created successfully!"

test/db/drop:
	@echo "Dropping test database..."
	@set PGPASSWORD=$(TEST_DB_PASSWORD)&& "$(PG_BIN)dropdb" -h $(TEST_DB_HOST) -p $(TEST_DB_PORT) -U $(TEST_DB_USER) $(TEST_DB_NAME)
	@echo "Test database dropped!"

test/db/migrations/up:
	@echo "Running migrations on test database..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(TEST_DB_URL)" -verbose up
	@echo "Test migrations completed!"

test/db/migrations/down:
	@echo "Rolling back all migrations on test database..."
	@migrate -path $(MIGRATIONS_DIR) -database "$(TEST_DB_URL)" -verbose down

test/db/reset: test/db/drop test/db/create test/db/migrations/up
	@echo "Test database reset complete!"

# --- QUICK SETUP ---

setup/all: db/create test/db/create db/migrations/up test/db/migrations/up
	@echo ""
	@echo "=========================================="
	@echo "Setup complete!"
	@echo "Main database and test database created and migrated."
	@echo "=========================================="