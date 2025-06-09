CREATE TABLE banned_users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    banned_at TIMESTAMP NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
    reason TEXT,
    banned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP
);