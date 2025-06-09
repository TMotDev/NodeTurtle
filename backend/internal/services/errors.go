package services

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrInactiveAccount    = errors.New("account is not activated")
	ErrAccountSuspended   = errors.New("account is suspended")
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrDuplicateEmail     = errors.New("email already in use")
	ErrDuplicateUsername  = errors.New("username already in use")
	ErrRecordNotFound     = errors.New("record not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrExpiredToken       = errors.New("token has expired")
	ErrEditConflict       = errors.New("edit conflict")
	ErrInternal           = errors.New("internal server error")
	ErrInvalidData        = errors.New("invalid data: the provided input does not match the expected format")
	ErrNoFields           = errors.New("no fields provided")
)

func BanMessage(reason string, expiresAt time.Time) error {
	return fmt.Errorf("account is suspended. Reason: %s. Expires at: %s", reason, expiresAt.Local().Format("2006-01-02"))
}
