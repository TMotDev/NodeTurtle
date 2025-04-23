package users

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/mail"

	"golang.org/x/crypto/bcrypt"
)

// Common errors
var (
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

// Service provides user management functionality
type Service struct {
	db          *sql.DB
	mailService *mail.Service
}

// NewService creates a new user service
func NewService(db *sql.DB, mailService *mail.Service) *Service {
	return &Service{
		db:          db,
		mailService: mailService,
	}
}

// CreateUser creates a new user
func (s *Service) CreateUser(reg models.UserRegistration) (*models.User, error) {
	// Check if user already exists
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", reg.Email).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrUserExists
	}

	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Hash password
	hashedPassword, err := auth.HashPassword(reg.Password)
	if err != nil {
		return nil, err
	}

	// Generate activation token
	activationToken, err := generateToken()
	if err != nil {
		return nil, err
	}

	// Get default role (user)
	var roleID int
	err = tx.QueryRow("SELECT id FROM roles WHERE name = $1", "user").Scan(&roleID)
	if err != nil {
		return nil, err
	}

	// Create user
	var user models.User
	query := `
		INSERT INTO users (email, username, password, role_id, active, activation_token, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, email, username, active, created_at, updated_at
	`
	err = tx.QueryRow(
		query,
		reg.Email,
		reg.Username,
		hashedPassword,
		roleID,
		false, // Not active until confirmed
		activationToken,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.Active,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// Send activation email
	activationLink := fmt.Sprintf("http://yourwebsite.com/activate/%s", activationToken)
	emailData := map[string]interface{}{
		"Username":       user.Username,
		"ActivationLink": activationLink,
	}

	go s.mailService.SendEmail(user.Email, "Activate Your Account", "activation", emailData)

	return &user, nil
}

// ActivateUser activates a user account using an activation token
func (s *Service) ActivateUser(token string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID int
	query := "SELECT id FROM users WHERE activation_token = $1 AND active = false"
	err = tx.QueryRow(query, token).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrInvalidToken
		}
		return err
	}

	_, err = tx.Exec("UPDATE users SET active = true, activation_token = NULL, updated_at = NOW() WHERE id = $1", userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Service) ResetPassword(token, newPassword string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID int
	var resetTime time.Time
	query := "SELECT id, password_reset_at FROM users WHERE password_reset_token = $1"
	err = tx.QueryRow(query, token).Scan(&userID, &resetTime)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrInvalidToken
		}
		return err
	}

	// Check if token is expired (24 hours)
	if time.Since(resetTime) > 24*time.Hour {
		return ErrInvalidToken
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update password and clear reset token
	_, err = tx.Exec(
		"UPDATE users SET password = $1, password_reset_token = NULL, password_reset_at = NULL, updated_at = NOW() WHERE id = $2",
		hashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ChangePassword changes a user's password
func (s *Service) ChangePassword(userID int, oldPassword, newPassword string) error {
	var hashedPassword string
	err := s.db.QueryRow("SELECT password FROM users WHERE id = $1", userID).Scan(&hashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrUserNotFound
		}
		return err
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(oldPassword))
	if err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	newHashedPassword, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update password
	_, err = s.db.Exec(
		"UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
		newHashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return nil
}

// GetUserByID retrieves a user by ID
func (s *Service) GetUserByID(userID int) (*models.User, error) {
	var user models.User
	var role models.Role

	query := `
		SELECT u.id, u.email, u.username, u.active, u.created_at, u.updated_at, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1
	`

	err := s.db.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.Active, &user.CreatedAt, &user.UpdatedAt, &user.LastLogin,
		&role.ID, &role.Name, &role.Description,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	user.Role = role
	return &user, nil
}

// ListUsers retrieves a list of users with pagination
func (s *Service) ListUsers(page, limit int) ([]models.User, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Get total count
	var total int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get users
	query := `
		SELECT u.id, u.email, u.username, u.active, u.created_at, u.updated_at, u.last_login,
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

	users := []models.User{}
	for rows.Next() {
		var user models.User
		var role models.Role
		var lastLogin sql.NullTime

		err := rows.Scan(
			&user.ID, &user.Email, &user.Username, &user.Active, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
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

// RequestPasswordReset initiates a password reset process
func (s *Service) RequestPasswordReset(email string) error {
	var user models.User
	query := "SELECT id, email, username FROM users WHERE email = $1 AND active = true"
	err := s.db.QueryRow(query, email).Scan(&user.ID, &user.Email, &user.Username)
	if err != nil {
		if err == sql.ErrNoRows {
			// We don't want to reveal if the email exists or not
			return nil
		}
		return err
	}

	// Generate reset token
	resetToken, err := generateToken()
	if err != nil {
		return err
	}

	// Update user with reset token
	_, err = s.db.Exec(
		"UPDATE users SET password_reset_token = $1, password_reset_at = NOW(), updated_at = NOW() WHERE id = $2",
		resetToken, user.ID,
	)
	if err != nil {
		return err
	}

	// Send reset email
	resetLink := fmt.Sprintf("http://yourwebsite.com/reset-password/%s", resetToken)
	emailData := map[string]interface{}{
		"Username":  user.Username,
		"ResetLink": resetLink,
	}

	go s.mailService.SendEmail(user.Email, "Reset Your Password", "reset", emailData)

	return nil
}

// UpdateUser updates a user's information
func (s *Service) UpdateUser(userID int, updates map[string]interface{}) error {
	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Check if user exists
	var exists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return ErrUserNotFound
	}

	// Build query and args
	query := "UPDATE users SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 1

	for key, value := range updates {
		switch key {
		case "username":
			query += fmt.Sprintf(", username = $%d", argCount)
			args = append(args, value)
			argCount++
		case "email":
			query += fmt.Sprintf(", email = $%d", argCount)
			args = append(args, value)
			argCount++
		case "active":
			query += fmt.Sprintf(", active = $%d", argCount)
			args = append(args, value)
			argCount++
		case "role_id":
			query += fmt.Sprintf(", role_id = $%d", argCount)
			args = append(args, value)
			argCount++
		}
	}

	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, userID)

	// Execute update
	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteUser deletes a user
func (s *Service) DeleteUser(userID int) error {
	result, err := s.db.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrUserNotFound
	}

	return nil
}

// Helper functions

// generateToken generates a random token for activation or password reset
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
