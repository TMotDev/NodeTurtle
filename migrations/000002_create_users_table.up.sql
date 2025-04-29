CREATE TABLE users (
    id bigserial PRIMARY KEY,
    email citext UNIQUE NOT NULL,
    username text NOT NULL,
    password bytea NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    activated bool NOT NULL,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);