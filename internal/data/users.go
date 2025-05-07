package data

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

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

// Format LastLogin to simple time string, without validity value
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

type Password struct {
	Plaintext *string
	Hash      []byte
}

func (p *Password) Set(plaintextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintextPassword), 12)
	if err != nil {
		return err
	}

	p.Plaintext = &plaintextPassword
	p.Hash = hash

	return nil
}

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

type UserRegistration struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=50"`
	Password string `json:"password" validate:"required,min=8"`
}

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type PasswordReset struct {
	Email string `json:"email" validate:"required,email"`
}
