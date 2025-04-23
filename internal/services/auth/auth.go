package auth

import (
	"database/sql"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services"

	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

// Claims represents JWT claims
type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

type IAuthService interface {
	Login(email, password string) (string, *models.User, error)
	CreateToken(user models.User) (string, error)
	VerifyToken(tokenString string) (*Claims, error)
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
			return "", nil, services.ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return "", nil, services.ErrInvalidCredentials
	}

	// Check if account is activated
	if !user.Active {
		return "", nil, services.ErrInactiveAccount
	}

	// Update last login time
	_, err = s.db.Exec("UPDATE users SET last_login = NOW() WHERE id = $1", user.ID)
	if err != nil {
		// Non-critical error, continue
		fmt.Printf("Failed to update last login time: %v\n", err)
	}

	// Create token
	user.Role = role
	token, err := s.CreateToken(user)
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
		return nil, services.ErrInvalidToken
	}

	return claims, nil
}

// CreateToken creates a new JWT token
func (s *Service) CreateToken(user models.User) (string, error) {
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
