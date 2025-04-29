package services

import "errors"

// Common errors
var (
	ErrInactiveAccount    = errors.New("account is not activated")
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrDuplicateEmail     = errors.New("email already in use")
	ErrRecordNotFound     = errors.New("record not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrExpiredToken       = errors.New("token has expired")
	ErrEditConflict       = errors.New("edit conflict")
	ErrInternal           = errors.New("internal server error")
)
