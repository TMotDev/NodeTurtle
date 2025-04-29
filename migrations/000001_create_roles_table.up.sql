CREATE TABLE roles (
    id bigserial PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('user', 'Regular user with basic privileges'),
    ('premium', 'Premium user with additional features'),
    ('moderator', 'User with moderation privileges'),
    ('admin', 'Administrator with full access');