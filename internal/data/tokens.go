// Package data provides data models and structures for the application.
package data

import (
	"time"

	"github.com/google/uuid"
)

// Token represents an authentication or verification token in the system.
type Token struct {
	Plaintext string     `json:"token"`
	Hash      []byte     `json:"-"`
	UserID    uuid.UUID  `json:"user_id"`
	Scope     TokenScope `json:"scope"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt time.Time  `json:"expires_at"`
}

// TokenScope defines the purpose and associated permissions of a token.
type TokenScope string

// Predefined token scopes for various authentication and verification purposes.
const (
	// ScopeUserActivation is used for verifying and activating new user accounts.
	ScopeUserActivation TokenScope = "user_activation"

	// ScopePasswordReset is used for the password reset process.
	ScopePasswordReset TokenScope = "password_reset"

	// ScopeRefresh is used for generating new JWT tokens without requiring re-authentication.
	ScopeRefresh TokenScope = "refresh"
)
