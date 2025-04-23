package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/models"

	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

// Common errors
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInactiveAccount    = errors.New("account is not activated")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// Role constants
const (
	RoleUser      = "user"
	RolePremium   = "premium"
	RoleModerator = "moderator"
	RoleAdmin     = "admin"
)

// Claims represents JWT claims
type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// Service provides authentication functionality
type Service struct {
	db     *sql.DB
	jwtKey []byte
	jwtExp int
}

// NewService creates a new authentication service
func NewService(db *sql.DB, jwtConfig config.JWTConfig) *Service {
	return &Service{
		db:     db,
		jwtKey: []byte(jwtConfig.Secret),
		jwtExp: jwtConfig.ExpireTime,
	}
}

// Login authenticates a user and returns a JWT token
func (s *Service) Login(email, password string) (string, *models.User, error) {
	var user models.User
	var hashedPassword string
	var role models.Role

	query := `
		SELECT u.id, u.email, u.username, u.password, u.active,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.email = $1
	`

	err := s.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &hashedPassword, &user.Active,
		&role.ID, &role.Name, &role.Description,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// Check if account is activated
	if !user.Active {
		return "", nil, ErrInactiveAccount
	}

	// Update last login time
	_, err = s.db.Exec("UPDATE users SET last_login = NOW() WHERE id = $1", user.ID)
	if err != nil {
		// Non-critical error, continue
		fmt.Printf("Failed to update last login time: %v\n", err)
	}

	// Create token
	user.Role = role
	token, err := s.createToken(user)
	if err != nil {
		return "", nil, err
	}

	return token, &user, nil
}

// VerifyToken verifies a JWT token and returns the claims
func (s *Service) VerifyToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return s.jwtKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// createToken creates a new JWT token
func (s *Service) createToken(user models.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.jwtExp) * time.Hour)

	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role.Name,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
