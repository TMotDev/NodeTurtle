CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    activation_token VARCHAR(100),
    password_reset_token VARCHAR(100),
    password_reset_at TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_activation_token ON users(activation_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
