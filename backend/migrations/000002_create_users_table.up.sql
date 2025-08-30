CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email citext UNIQUE NOT NULL,
    username text UNIQUE NOT NULL,
    password bytea NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    activated bool NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);
