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
	ID          uuid.UUID    `json:"id"`
	Email       string       `json:"email"`
	Username    string       `json:"username"`
	Password    Password     `json:"-"`
	RoleID      int64        `json:"-"`
	Role        Role         `json:"role,omitempty"`
	IsActivated bool         `json:"activated"`
	LastLogin   sql.NullTime `json:"last_login,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	Ban         *Ban         `json:"ban,omitempty"`
}

type Ban struct {
	ID        int64     `json:"id"`
	BannedAt  time.Time `json:"banned_at"`
	Reason    string    `json:"reason"`
	BannedBy  uuid.UUID `json:"banned_by,omitempty"`
	ExpiresAt time.Time `json:"expires_at"`
}

// for reading from database and checking if user has any bans
type OptionalBan struct {
	ID        *int64
	BannedAt  *time.Time
	Reason    *string
	BannedBy  *uuid.UUID
	ExpiresAt *time.Time
}

func (ob *OptionalBan) NotNull() bool {
	return ob.ID != nil &&
		ob.ExpiresAt != nil &&
		ob.Reason != nil &&
		ob.BannedAt != nil &&
		ob.BannedBy != nil
}

// IsValid checks if the ban is still active.
func (b *Ban) IsValid() bool {
	if b == nil {
		return false
	}

	return b.ExpiresAt.After(time.Now().UTC())
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
		Ban       *Ban    `json:"ban,omitempty"`
		Alias
	}{
		LastLogin: lastLogin,
		Role:      u.Role.Name,
		Ban:       u.Ban,
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

// UserUpdate represents fields that can be updated for a user.
type UserUpdate struct {
	Username  *string   `json:"username,omitempty" validate:"omitempty,min=3,max=20,alphanum"`
	Email     *string   `json:"email,omitempty" validate:"omitempty,email"`
	Activated *bool     `json:"activated,omitempty"`
	Role      *RoleType `json:"role,omitempty"`
}

type UserFilter struct {
	// Pagination
	Page  int `query:"page" validate:"omitempty,min=1"`
	Limit int `query:"limit" validate:"omitempty,min=1,max=100"`

	// Filters
	ActivationStatus *bool     `query:"activated"`
	Role             *RoleType `query:"role" validate:"omitempty"`
	Username         *string   `query:"username" validate:"omitempty"`
	Email            *string   `query:"email" validate:"omitempty"`

	// Time fields
	CreatedBefore   *time.Time `query:"created_before" validate:"omitempty"`
	CreatedAfter    *time.Time `query:"created_after" validate:"omitempty"`
	LastLoginBefore *time.Time `query:"last_login_before" validate:"omitempty"`
	LastLoginAfter  *time.Time `query:"last_login_after" validate:"omitempty"`
	BannedBefore    *time.Time `query:"banned_before" validate:"omitempty"`
	BannedAfter     *time.Time `query:"banned_after" validate:"omitempty"`

	SortField string `query:"sort_field" validate:"omitempty,oneof=id email username activated created_at last_login"`
	SortOrder string `query:"sort_order" validate:"omitempty,oneof=asc desc"`
}

func DefaultUserFilter() UserFilter {
	return UserFilter{
		Page:      1,
		Limit:     10,
		SortField: "created_at",
		SortOrder: "desc",
	}
}
