package data

import "time"

// Token represents an activation/reset token for passwords or email verification
// @Description Token information including user association and expiration
type Token struct {
	Plaintext string     `json:"token"`
	Hash      []byte     `json:"-"`
	UserID    int64      `json:"user_id"`
	Scope     TokenScope `json:"scope"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt time.Time  `json:"expires_at"`
}

type TokenScope string

const (
	ScopeUserActivation TokenScope = "user_activation"
	ScopePasswordReset  TokenScope = "password_reset"
)
