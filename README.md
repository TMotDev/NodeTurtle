# 🚧 In Development

**Turtle Graphics Project** — uses a **node-based interface** (like Blender) instead of code (like PyTurtle) or visual blocks (like Scratch).

## Overview
- **Server**: Go (Echo framework) + PostgreSQL
- **Client**: React + React Flow

## Requirements
- `go 1.23.4`
- `golang migrate v4` (github.com/golang-migrate/migrate)
- `node v22.17.0`
- `psql 17.2`
- `pnpm 8.15.0`
- `GNU make 4.4.1`

## Setup Instructions

### Backend Setup
1. Update `Makefile` variables with your database connection variables and `psql` binary location.
2. Create `.env` files for both backend and client following the structure from `.env.example` examples.
3. From the `backend` directory, run:

   ```sh
   make setup/all
   ```
   This will create databases and apply migrations.

### Client Setup
1. From the `client` directory, build the files using:

   ```sh
   pnpm build
   ```

### Running the Application
1. From the `backend` directory, run:

   ```sh
   make run
   ```