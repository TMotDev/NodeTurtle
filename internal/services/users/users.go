// Package users provides functionality for managing user accounts.
package users

import (
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// IUserService defines the interface for user management operations.
type IUserService interface {
	CreateUser(reg data.UserRegistration) (*data.User, error)
	ResetPassword(token, newPassword string) error
	ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error
	GetUserByID(userID uuid.UUID) (*data.User, error)
	GetUserByEmail(email string) (*data.User, error)
	ListUsers(page, limit int) ([]data.User, int, error)
	UpdateUser(userID uuid.UUID, updates map[string]interface{}) error
	DeleteUser(userID uuid.UUID) error
	GetForToken(tokenScope data.TokenScope, tokenPlaintext string) (*data.User, error)
}

// UserService implements the IUserService interface for managing users.
type UserService struct {
	db *sql.DB
}

// NewUserService creates a new UserService with the provided database connection.
func NewUserService(db *sql.DB) UserService {
	return UserService{
		db: db,
	}
}

// CreateUser creates a new user with the provided registration data.
// It returns the created user or an error if the operation fails.
// If an email already exists in the system, it returns ErrDuplicateEmail.
func (s UserService) CreateUser(reg data.UserRegistration) (*data.User, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", reg.Email).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, services.ErrDuplicateEmail
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	hashedPassword, err := auth.HashPassword(reg.Password)
	if err != nil {
		return nil, err
	}

	var user data.User
	query := `
	INSERT INTO users (email, username, password, role_id, activated, created_at)
	VALUES ($1, $2, $3, $4, $5, NOW())
	RETURNING id, email, username, activated, created_at
	`
	err = tx.QueryRow(
		query,
		reg.Email,
		reg.Username,
		hashedPassword,
		data.RoleUser,
		false,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Activated,
		&user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &user, nil
}

// ResetPassword updates a user's password using a valid password reset token.
// It returns an error if the token is invalid, expired, or if the password
// update fails. Used when the user can't remember their password
func (s UserService) ResetPassword(token, newPassword string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	tokenHash := sha256.Sum256([]byte(token))

	var userID uuid.UUID
	var expiresAt time.Time
	query := "SELECT user_id, expires_at FROM tokens WHERE hash = $1 AND scope = $2"
	err = tx.QueryRow(query, tokenHash[:], data.ScopePasswordReset).Scan(&userID, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return services.ErrInvalidToken
		}
		return err
	}

	if time.Now().UTC().After(expiresAt.UTC()) {
		return services.ErrExpiredToken
	}

	hashedPassword, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"UPDATE users SET password = $1 WHERE id = $2",
		hashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ChangePassword updates a user's password after verifying their old password.
// It returns ErrUserNotFound if the user doesn't exist or ErrInvalidCredentials
// if the old password is incorrect.
func (s UserService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var hashedPassword string
	err = s.db.QueryRow("SELECT password FROM users WHERE id = $1", userID).Scan(&hashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			return services.ErrUserNotFound
		}
		return err
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(oldPassword))
	if err != nil {
		return services.ErrInvalidCredentials
	}

	newHashedPassword, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(
		"UPDATE users SET password = $1 WHERE id = $2",
		newHashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetUserByID retrieves a user by their UUID.
// It returns ErrUserNotFound if the user doesn't exist or ErrInvalidCredentials
// if the old password is incorrect.
func (s UserService) GetUserByID(userID uuid.UUID) (*data.User, error) {
	var user data.User
	var role data.Role

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.last_login,
		       r.id, r.name, r.description, r.created_at
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1
	`

	err := s.db.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &user.LastLogin,
		&role.ID, &role.Name, &role.Description, &role.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, services.ErrUserNotFound
		}
		return nil, err
	}

	user.Role = role
	return &user, nil
}

// GetUserByEmail retrieves a user by their email address.
// It returns the user or ErrUserNotFound if no matching user exists.
func (s UserService) GetUserByEmail(email string) (*data.User, error) {
	var user data.User
	var role data.Role

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.email = $1
	`

	err := s.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &user.LastLogin,
		&role.ID, &role.Name, &role.Description,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, services.ErrUserNotFound
		}
		return nil, err
	}

	user.Role = role
	return &user, nil
}

// ListUsers returns a paginated list of users and the total count.
// The page parameter specifies which page to return (starting from 1),
// and limit controls how many users to include per page.
func (s UserService) ListUsers(page, limit int) ([]data.User, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	offset := (page - 1) * limit

	var total int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		ORDER BY u.id
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := []data.User{}
	for rows.Next() {
		var user data.User
		var role data.Role
		var lastLogin sql.NullTime

		err := rows.Scan(
			&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &lastLogin,
			&role.ID, &role.Name, &role.Description,
		)
		if err != nil {
			return nil, 0, err
		}

		user.LastLogin = lastLogin
		user.Role = role
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// UpdateUser modifies a user's fields based on the provided updates map.
// Valid keys for the updates map are "username", "email", "activated", and "role_id".
// It returns ErrNoFields if the updates map is empty or ErrUserNotFound if the user doesn't exist.
func (s UserService) UpdateUser(userID uuid.UUID, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return services.ErrNoFields
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	user, err := s.GetUserByID(userID)
	if err != nil {
		if err == services.ErrUserNotFound {
			return services.ErrUserNotFound
		}
	}

	assignments := []string{}
	args := []interface{}{}
	argCount := 1

	for key, value := range updates {
		switch key {
		case "username":
			assignments = append(assignments, fmt.Sprintf("username = $%d", argCount))
			args = append(args, value)
			argCount++
		case "email":
			assignments = append(assignments, fmt.Sprintf("email = $%d", argCount))
			args = append(args, value)
			argCount++
		case "activated":
			assignments = append(assignments, fmt.Sprintf("activated = $%d", argCount))
			args = append(args, value)
			argCount++
		case "role_id":
			assignments = append(assignments, fmt.Sprintf("role_id = $%d", argCount))
			args = append(args, value)
			argCount++
		}
	}

	if len(assignments) == 0 {
		return services.ErrInvalidData
	}

	query := "UPDATE users SET " + strings.Join(assignments, ", ")
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, user.ID)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteUser removes a user from the database by their ID.
// It returns ErrUserNotFound if no matching user exists.
func (s UserService) DeleteUser(userID uuid.UUID) error {
	result, err := s.db.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return services.ErrUserNotFound
	}

	return nil
}

// GetForToken retrieves a user associated with a valid token.
// It verifies the token's scope and expiration before returning the user.
// Returns ErrRecordNotFound if no valid token exists.
func (s UserService) GetForToken(tokenScope data.TokenScope, tokenPlaintext string) (*data.User, error) {
	tokenHash := sha256.Sum256([]byte(tokenPlaintext))

	query := `
        SELECT users.id, users.created_at, users.username, users.email, users.password, users.activated
        FROM users
        INNER JOIN tokens
        ON users.id = tokens.user_id
        WHERE tokens.hash = $1
        AND tokens.scope = $2
        AND tokens.expires_at > $3`

	args := []any{tokenHash[:], tokenScope, time.Now().UTC()}

	var user data.User

	err := s.db.QueryRow(query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Username,
		&user.Email,
		&user.Password.Hash,
		&user.Activated,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, services.ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}
