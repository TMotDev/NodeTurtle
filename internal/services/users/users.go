// Package users provides functionality for managing user accounts.
package users

import (
	"crypto/sha256"
	"database/sql"
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
	GetUserByUsername(username string) (*data.User, error)
	ListUsers(filters data.UserFilter) ([]data.User, int, error)
	UpdateUser(userID uuid.UUID, updates data.UserUpdate) error
	DeleteUser(userID uuid.UUID) error
	GetForToken(tokenScope data.TokenScope, tokenPlaintext string) (*data.User, error)
	UsernameExists(username string) (bool, error)
	EmailExists(email string) (bool, error)
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

	exists, err := s.EmailExists(reg.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, services.ErrDuplicateEmail
	}

	exists, err = s.UsernameExists(reg.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, services.ErrDuplicateUsername
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
		&user.IsActivated,
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

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(oldPassword)); err != nil {
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
		&user.ID, &user.Email, &user.Username, &user.IsActivated, &user.CreatedAt, &user.LastLogin,
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
		&user.ID, &user.Email, &user.Username, &user.IsActivated, &user.CreatedAt, &user.LastLogin,
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

// GetUserByUsername retrieves a user by their username.
// It returns the user or ErrUserNotFound if no matching user exists.
func (s UserService) GetUserByUsername(username string) (*data.User, error) {
	var user data.User
	var role data.Role

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.username = $1
	`

	err := s.db.QueryRow(query, username).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsActivated, &user.CreatedAt, &user.LastLogin,
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
func (s UserService) ListUsers(filters data.UserFilter) ([]data.User, int, error) {
	// Calculate offset for pagination
	offset := (filters.Page - 1) * filters.Limit

	// Build WHERE clause and args for filtering
	whereClause := []string{}
	args := []interface{}{}
	argCount := 1

	// Filter by activation status
	if filters.ActivationStatus != nil {
		whereClause = append(whereClause, "u.activated = $"+fmt.Sprint(argCount))
		args = append(args, *filters.ActivationStatus)
		argCount++
	}

	// Filter by role
	if filters.Role != nil {
		whereClause = append(whereClause, "u.role_id = $"+fmt.Sprint(argCount))
		roleId := filters.Role.ToID()
		args = append(args, roleId)
		argCount++
	}

	// Filter by username (partial match)
	if filters.Username != nil && *filters.Username != "" {
		whereClause = append(whereClause, "u.username ILIKE $"+fmt.Sprint(argCount))
		args = append(args, "%"+*filters.Username+"%")
		argCount++
	}

	// Filter by email (partial match)
	if filters.Email != nil && *filters.Email != "" {
		whereClause = append(whereClause, "u.email ILIKE $"+fmt.Sprint(argCount))
		args = append(args, "%"+*filters.Email+"%")
		argCount++
	}

	// Filter by creation time
	if filters.CreatedAfter != nil {
		whereClause = append(whereClause, "u.created_at >= $"+fmt.Sprint(argCount))
		args = append(args, *filters.CreatedAfter)
		argCount++
	}
	if filters.CreatedBefore != nil {
		whereClause = append(whereClause, "u.created_at <= $"+fmt.Sprint(argCount))
		args = append(args, *filters.CreatedBefore)
		argCount++
	}

	// Filter by last login time
	if filters.LastLoginAfter != nil {
		whereClause = append(whereClause, "u.last_login >= $"+fmt.Sprint(argCount))
		args = append(args, *filters.LastLoginAfter)
		argCount++
	}
	if filters.LastLoginBefore != nil {
		whereClause = append(whereClause, "u.last_login <= $"+fmt.Sprint(argCount))
		args = append(args, *filters.LastLoginBefore)
		argCount++
	}

	// Construct the final WHERE clause
	where := ""
	if len(whereClause) > 0 {
		where = "WHERE " + strings.Join(whereClause, " AND ")
	}

	// Count total matching users
	countQuery := "SELECT COUNT(*) FROM users u " + where
	var total int
	err := s.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Build the SELECT query
	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.last_login,
		       r.id, r.name
		FROM users u
		JOIN roles r ON u.role_id = r.id
		` + where + `
		ORDER BY u.` + filters.SortField + ` ` + filters.SortOrder + `
		LIMIT $` + fmt.Sprint(argCount) + ` OFFSET $` + fmt.Sprint(argCount+1)

	// Add the limit and offset args
	args = append(args, filters.Limit, offset)

	// Execute the query
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	// Process the results
	users := []data.User{}
	for rows.Next() {
		var user data.User
		var role data.Role
		var lastLogin sql.NullTime

		err := rows.Scan(
			&user.ID, &user.Email, &user.Username, &user.IsActivated, &user.CreatedAt, &lastLogin,
			&role.ID, &role.Name,
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
func (s UserService) UpdateUser(userID uuid.UUID, updates data.UserUpdate) error {
	assignments := []string{}
	args := []interface{}{}
	argCount := 1

	if updates.Username != nil {
		assignments = append(assignments, fmt.Sprintf("username = $%d", argCount))
		args = append(args, *updates.Username)
		argCount++
	}
	if updates.Email != nil {
		assignments = append(assignments, fmt.Sprintf("email = $%d", argCount))
		args = append(args, *updates.Email)
		argCount++
	}
	if updates.Activated != nil {
		assignments = append(assignments, fmt.Sprintf("activated = $%d", argCount))
		args = append(args, *updates.Activated)
		argCount++
	}
	if updates.Role != nil {
		assignments = append(assignments, fmt.Sprintf("role_id = $%d", argCount))
		args = append(args, *updates.Role)
		argCount++
	}

	if len(assignments) == 0 {
		return services.ErrNoFields
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = s.GetUserByID(userID)
	if err != nil {
		return err
	}

	query := "UPDATE users SET " + strings.Join(assignments, ", ")
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, userID)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteUser removes a user from the database by their ID.
// It returns ErrUserNotFound if no matching user exists.
func (s UserService) DeleteUser(userID uuid.UUID) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.Exec("DELETE FROM users WHERE id = $1", userID)
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

	return tx.Commit()

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
		&user.IsActivated,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, services.ErrRecordNotFound
		}
		return nil, err
	}

	return &user, nil
}

func (s UserService) EmailExists(email string) (bool, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
	if err != nil {
		return false, services.ErrRecordNotFound
	}
	return exists, nil
}

func (s UserService) UsernameExists(username string) (bool, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", username).Scan(&exists)
	if err != nil {
		return false, services.ErrRecordNotFound
	}
	return exists, nil
}
