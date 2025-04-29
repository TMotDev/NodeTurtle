package data

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	RoleUser      = "user"
	RolePremium   = "premium"
	RoleModerator = "moderator"
	RoleAdmin     = "admin"
)

// Role represents a user role in the system
// @Description User role information including permissions and timestamps
type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// User represents a user in the system
// @Description Complete user account information including role and status
type User struct {
	ID        int64        `json:"id"`
	Email     string       `json:"email"`
	Username  string       `json:"username"`
	Password  password     `json:"-"`
	RoleID    int64        `json:"-"`
	Role      Role         `json:"role,omitempty"`
	Activated bool         `json:"activated"`
	LastLogin sql.NullTime `json:"last_login,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// Format LastLogin to simple time string, without validity value
func (u User) MarshalJSON() ([]byte, error) {
	type Alias User
	var lastLogin *string
	if u.LastLogin.Valid {
		str := u.LastLogin.Time.Format(time.RFC3339Nano)
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

type password struct {
	Plaintext *string
	Hash      []byte
}

func (p *password) Set(plaintextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintextPassword), 12)
	if err != nil {
		return err
	}

	p.Plaintext = &plaintextPassword
	p.Hash = hash

	return nil
}

func (p *password) Matches(plaintextPassword string) (bool, error) {
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

// UserRegistration represents data needed for user registration
// @Description Data required to register a new user account
type UserRegistration struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=50"`
	Password string `json:"password" validate:"required,min=8"`
}

// UserLogin represents data needed for user login
// @Description Data required to login a user
type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// PasswordReset represents data needed for password reset
// @Description Email required to request a password reset
type PasswordReset struct {
	Email string `json:"email" validate:"required,email"`
}

// PasswordChange represents data needed for password change
// @Description Data required to change a user's password
type PasswordChange struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}
