package services

import "errors"

// Common errors
var (
	ErrInactiveAccount    = errors.New("account is not activated")
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidCredentials = errors.New("invalid credentials")
)
