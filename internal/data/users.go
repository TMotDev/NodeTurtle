// Package data provides data models and structures for the application.
package data

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system with their associated details.
type User struct {
	ID        uuid.UUID    `json:"id"`
	Email     string       `json:"email"`
	Username  string       `json:"username"`
	Password  Password     `json:"-"`
	RoleID    int64        `json:"-"`
	Role      Role         `json:"role,omitempty"`
	Activated bool         `json:"activated"`
	LastLogin sql.NullTime `json:"last_login,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
}

// MarshalJSON provides custom JSON serialization for User.
// It ensures LastLogin is properly formatted and handles the nil case.
func (u User) MarshalJSON() ([]byte, error) {
	type Alias User
	var lastLogin *string
	if u.LastLogin.Valid {
		str := u.LastLogin.Time.UTC().Format(time.RFC3339Nano)
		lastLogin = &str
	}

	return json.Marshal(&struct {
		LastLogin *string `json:"last_login,omitempty"`
		Role      string  `json:"role"`
		Alias
	}{
		LastLogin: lastLogin,
		Role:      u.Role.Name,
		Alias:     (Alias)(u),
	})
}

// Password represents a user password with both plaintext (for temporary usage) and hash values.
type Password struct {
	Plaintext *string
	Hash      []byte
}

// Set creates a bcrypt hash from a plaintext password and stores both.
// Returns an error if hashing fails.
func (p *Password) Set(plaintextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintextPassword), 12)
	if err != nil {
		return err
	}

	p.Plaintext = &plaintextPassword
	p.Hash = hash

	return nil
}

// Matches checks whether a plaintext password matches the stored hash.
// Returns true if the password matches, false otherwise, and any error that occurred.
func (p *Password) Matches(plaintextPassword string) (bool, error) {
	err := bcrypt.CompareHashAndPassword(p.Hash, []byte(plaintextPassword))
	if err != nil {
		switch {
		case errors.Is(err, bcrypt.ErrMismatchedHashAndPassword):
			return false, nil
		default:
			return false, err
		}
	}

	return true, nil
}

// UserRegistration represents the data required for user registration.
type UserRegistration struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=20,alphanum"`
	Password string `json:"password" validate:"required,min=8"`
}

// UserLogin represents the data required for user login.

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// PasswordReset represents the data required to initiate a password reset.
type PasswordReset struct {
	Email string `json:"email" validate:"required,email"`
}

// UserUpdate represents fields that can be updated for a user.
type UserUpdate struct {
	Username  *string   `json:"username,omitempty" validate:"omitempty,min=3,max=20,alphanum"`
	Email     *string   `json:"email,omitempty" validate:"omitempty,email"`
	Activated *bool     `json:"activated,omitempty"`
	Role      *RoleType `json:"role,omitempty"`
}
