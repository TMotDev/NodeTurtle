package users

import (
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

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

type UserService struct {
	db *sql.DB
}

func NewUserService(db *sql.DB) UserService {
	return UserService{
		db: db,
	}
}

func (s UserService) CreateUser(reg data.UserRegistration) (*data.User, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", reg.Email).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, services.ErrUserExists
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
	INSERT INTO users (email, username, password, role_id, activated, created_at, updated_at)
	VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	RETURNING id, email, username, activated, created_at, updated_at
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
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &user, nil
}

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

	if time.Now().After(expiresAt) {
		return services.ErrInvalidToken
	}

	hashedPassword, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
		hashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

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
		"UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
		newHashedPassword, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s UserService) GetUserByID(userID uuid.UUID) (*data.User, error) {
	var user data.User
	var role data.Role

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.updated_at, u.last_login,
		       r.id, r.name, r.description, r.created_at, r.updated_at
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1
	`

	err := s.db.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &user.UpdatedAt, &user.LastLogin,
		&role.ID, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt,
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

func (s UserService) GetUserByEmail(email string) (*data.User, error) {
	var user data.User
	var role data.Role

	query := `
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.updated_at, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.email = $1
	`

	err := s.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &user.UpdatedAt, &user.LastLogin,
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
		SELECT u.id, u.email, u.username, u.activated, u.created_at, u.updated_at, u.last_login,
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
			&user.ID, &user.Email, &user.Username, &user.Activated, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
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

func (s UserService) UpdateUser(userID uuid.UUID, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return errors.New("no fields to update")
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
		case "activated":
			query += fmt.Sprintf(", activated = $%d", argCount)
			args = append(args, value)
			argCount++
		case "role_id":
			query += fmt.Sprintf(", role_id = $%d", argCount)
			args = append(args, value)
			argCount++
		}
	}

	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, user.ID)

	fmt.Println(query)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return err
	}

	return tx.Commit()
}

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

	args := []any{tokenHash[:], tokenScope, time.Now()}

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
