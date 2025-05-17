package tests

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/tokens"
	"database/sql"
	"log"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func setupTokenService() (tokens.ITokenService, TestData, *sql.DB, func()) {
	testData, db, err := createTestData()

	if err != nil {
		log.Fatalf("Failed setup test data: %v", err)
	}

	return tokens.NewTokenService(db), *testData, db, func() { db.Close() }
}

func TestGenerateToken(t *testing.T) {
	userID := uuid.New()
	ttl := 24 * time.Hour
	scope := data.ScopeRefresh

	token, err := tokens.GenerateToken(userID, ttl, scope)

	assert.NoError(t, err)
	assert.NotNil(t, token)
	assert.Equal(t, userID, token.UserID)
	assert.Equal(t, scope, token.Scope)
	assert.NotEmpty(t, token.Plaintext)
	assert.NotEmpty(t, token.Hash)
	assert.WithinDuration(t, time.Now().UTC().Add(ttl), token.ExpiresAt, time.Second*5)
}

func TestTokenService_New(t *testing.T) {
	s, td, db, close := setupTokenService()
	defer close()

	userID := td.Users[0].ID
	ttl := 1 * time.Hour
	scope := data.ScopePasswordReset

	token, err := s.New(userID, ttl, scope)

	assert.NoError(t, err)
	assert.NotNil(t, token)
	assert.Equal(t, userID, token.UserID)
	assert.Equal(t, scope, token.Scope)
	assert.NotEmpty(t, token.Plaintext)
	assert.NotEmpty(t, token.Hash)
	assert.WithinDuration(t, time.Now().UTC().Add(ttl), token.ExpiresAt, time.Second*5)

	// Verify the token was actually inserted into the DB
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM tokens WHERE hash = $1 AND user_id = $2", token.Hash, userID).Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 1, count, "Token should be inserted into the database")
}

func TestTokenService_DeleteAllForUser(t *testing.T) {
	s, td, db, close := setupTokenService()
	defer close()

	// Test Case 1: Delete existing tokens (John's activation token)
	userIDToDelete := td.Tokens["john_valid_activation"].UserID
	scopeToDelete := data.ScopeUserActivation

	// Verify token exists before deletion
	var countBefore int
	err := db.QueryRow("SELECT COUNT(*) FROM tokens WHERE user_id = $1 AND scope = $2", userIDToDelete, scopeToDelete).Scan(&countBefore)
	assert.NoError(t, err)
	assert.True(t, countBefore > 0, "Test token should exist before deletion")

	err = s.DeleteAllForUser(scopeToDelete, userIDToDelete)
	assert.NoError(t, err)

	// Verify token is deleted
	var countAfter int
	err = db.QueryRow("SELECT COUNT(*) FROM tokens WHERE user_id = $1 AND scope = $2", userIDToDelete, scopeToDelete).Scan(&countAfter)
	assert.NoError(t, err)
	assert.Equal(t, 0, countAfter, "Token should be deleted")

	// Test Case 2: Delete non-existent tokens (different scope for the same user)
	err = s.DeleteAllForUser(data.ScopeRefresh, userIDToDelete)
	assert.NoError(t, err, "Deleting non-existent tokens should not return an error")

	// Test Case 3: Delete for a user with no tokens of that scope
	otherUserID := td.Users[0].ID
	err = s.DeleteAllForUser(data.ScopeUserActivation, otherUserID)
	assert.NoError(t, err, "Deleting non-existent tokens for a user should not return an error")
}
