CREATE TABLE roles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('user', 'Regular user with basic privileges'),
    ('premium', 'Premium user with additional features'),
    ('moderator', 'User with moderation privileges'),
    ('admin', 'Administrator with full access');