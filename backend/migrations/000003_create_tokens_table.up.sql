CREATE TABLE tokens (
    hash bytea PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope text NOT NULL, -- 'activation', 'reset', etc.
    created_at TIMESTAMP NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
    expires_at TIMESTAMP NOT NULL
);