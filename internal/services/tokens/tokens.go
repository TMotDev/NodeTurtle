// Package tokens provides functionality for managing password reset, authentication, activation and other tokens.
package tokens

import (
	"NodeTurtleAPI/internal/data"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"time"

	"github.com/google/uuid"
)

// ITokenService defines the interface for token management operations.
type ITokenService interface {
	New(userID uuid.UUID, ttl time.Duration, scope data.TokenScope) (*data.Token, error)
	Insert(token *data.Token) error
	DeleteAllForUser(scope data.TokenScope, userID uuid.UUID) error
}

// TokenService implements the ITokenService interface for managing tokens.
type TokenService struct {
	db *sql.DB
}

// NewTokenService creates a new TokenService with the provided database connection.
func NewTokenService(db *sql.DB) TokenService {
	return TokenService{
		db: db,
	}
}

// New creates and stores a new token for a specific user.
// It returns the created token or an error if the operation fails.
func (s TokenService) New(userID uuid.UUID, ttl time.Duration, scope data.TokenScope) (*data.Token, error) {
	token, err := GenerateToken(userID, ttl, scope)
	if err != nil {
		return nil, err
	}

	err = s.Insert(token)
	return token, err
}

// Insert adds a token to the database.
// Returns an error if the database operation fails.
func (s TokenService) Insert(token *data.Token) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
        INSERT INTO tokens (hash, user_id, expires_at, scope)
        VALUES ($1, $2, $3, $4)`

	args := []interface{}{token.Hash, token.UserID, token.ExpiresAt, token.Scope}

	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteAllForUser removes all tokens with the specified scope for a given user.
// Returns an error if the database operation fails.
func (s TokenService) DeleteAllForUser(scope data.TokenScope, userID uuid.UUID) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
        DELETE FROM tokens
        WHERE scope = $1 AND user_id = $2`

	args := []interface{}{scope, userID}

	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GenerateToken creates a new token for the specified user with the given time-to-live and scope.
// It generates a secure random plaintext token and its corresponding hash.
// Returns the created token or an error if generation fails.
func GenerateToken(userID uuid.UUID, ttl time.Duration, scope data.TokenScope) (*data.Token, error) {
	token := &data.Token{
		UserID:    userID,
		ExpiresAt: time.Now().UTC().Add(ttl),
		Scope:     scope,
	}

	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return nil, err
	}

	token.Plaintext = base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes)

	hash := sha256.Sum256([]byte(token.Plaintext))
	token.Hash = hash[:]

	return token, nil
}
