# 🚧 In Development

**Turtle Graphics Project** — uses a **node-based interface** (like Blender) instead of code (like PyTurtle) or visual blocks (like Scratch).

- Server: Go (Echo framework) + PostgreSQL
- Client: React + React Flow

Requirements:
go 1.23.4
golang migrate v4 (github.com/golang-migrate/migrate)
node v22.17.0
psql 17.2
pnpm 8.15.0
GNU make 4.4.1

update `Makefile` variables with your database connecion variables and `psql` binary location

from `backend` directory
run `$ make setup/all` to create databases and apply migrations

from `client` directory build the files using `pnpm build`

from `backend` directory
run `make run` to run the application