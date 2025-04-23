package models

import (
	"database/sql"
	"time"
)

// Role represents a user role in the system
// @Description User role information including permissions and timestamps
type Role struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

const (
	RoleUser      = "user"
	RolePremium   = "premium"
	RoleModerator = "moderator"
	RoleAdmin     = "admin"
)

// User represents a user in the system
// @Description Complete user account information including role and status
type User struct {
	ID                 int            `json:"id"`
	Email              string         `json:"email"`
	Username           string         `json:"username"`
	Password           string         `json:"-"`
	PasswordResetToken sql.NullString `json:"-"`
	PasswordResetAt    sql.NullTime   `json:"-"`
	RoleID             int            `json:"-"`
	Role               Role           `json:"role,omitempty"`
	Active             bool           `json:"active"`
	ActivationToken    sql.NullString `json:"-"`
	LastLogin          sql.NullTime   `json:"last_login,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
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
