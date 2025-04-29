package tokens

import (
	"NodeTurtleAPI/internal/data"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"time"
)

type ITokenService interface {
	New(userID int64, ttl time.Duration, scope data.TokenScope) (*data.Token, error)
	Insert(token *data.Token) error
	DeleteAllForUser(scope data.TokenScope, userID int64) error
}

type TokenService struct {
	db *sql.DB
}

func NewTokenService(db *sql.DB) TokenService {
	return TokenService{
		db: db,
	}
}

func (s TokenService) New(userID int64, ttl time.Duration, scope data.TokenScope) (*data.Token, error) {
	token, err := generateToken(userID, ttl, scope)
	if err != nil {
		return nil, err
	}

	err = s.Insert(token)
	return token, err
}

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

func (s TokenService) DeleteAllForUser(scope data.TokenScope, userID int64) error {
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

func generateToken(userID int64, ttl time.Duration, scope data.TokenScope) (*data.Token, error) {

	token := &data.Token{
		UserID:    userID,
		ExpiresAt: time.Now().Add(ttl),
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
