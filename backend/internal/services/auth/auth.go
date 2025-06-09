// Package auth provides authentication and authorization functionality.
package auth

import (
	"database/sql"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"

	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

// Claims represents the JWT claims structure used for authentication tokens.
// It extends the standard JWT claims with a custom Role field.
type Claims struct {
	Role string `json:"role"`
	jwt.StandardClaims
}

// IAuthService defines the interface for authentication operations.
type IAuthService interface {
	Login(email, password string) (string, *data.User, error)
	CreateAccessToken(user data.User) (string, error)
	VerifyToken(tokenString string) (*Claims, error)
}

// AuthService implements the IAuthService interface for handling authentication.
type AuthService struct {
	db     *sql.DB
	JwtKey []byte
	JwtExp int
}

// NewService creates a new AuthService with the provided database connection and JWT configuration.
func NewService(db *sql.DB, jwtConfig config.JWTConfig) AuthService {
	return AuthService{
		db:     db,
		JwtKey: []byte(jwtConfig.Secret),
		JwtExp: jwtConfig.ExpireTime,
	}
}

// Login authenticates a user with the provided email and password.
// It returns a JWT token and the authenticated user on success, or an error if authentication fails.
// Returns ErrInvalidCredentials if email/password are incorrect or ErrInactiveAccount if the account is not activated.
func (s AuthService) Login(email, password string) (string, *data.User, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return "", nil, err
	}
	defer tx.Rollback()

	var user data.User
	var role data.Role
	var ban data.OptionalBan

	query := `
		SELECT u.id, u.email, u.username, u.password, u.activated,
		       r.id, r.name, r.description,
			    bu.id, bu.expires_at, bu.banned_at, bu.reason, bu.banned_by
		FROM users u
		JOIN roles r ON u.role_id = r.id
		LEFT JOIN banned_users bu ON u.id = bu.user_id
		WHERE u.email = $1
	`

	err = tx.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.Password.Hash, &user.IsActivated,
		&role.ID, &role.Name, &role.Description,
		&ban.ID, &ban.ExpiresAt, &ban.BannedAt, &ban.Reason, &ban.BannedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil, services.ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password.Hash), []byte(password))
	if err != nil {
		return "", nil, services.ErrInvalidCredentials
	}

	if !user.IsActivated {
		return "", nil, services.ErrInactiveAccount
	}

	if ban.NotNull() {
		user.Ban = &data.Ban{
			ID:        *ban.ID,
			ExpiresAt: *ban.ExpiresAt,
			Reason:    *ban.Reason,
			BannedAt:  *ban.BannedAt,
			BannedBy:  *ban.BannedBy,
		}
	}

	if user.Ban.IsValid() {
		return "", nil, fmt.Errorf("%w (reason: %v, expires at: %v)", services.ErrAccountSuspended, user.Ban.Reason, user.Ban.ExpiresAt.Local().Format("2006-01-02"))
	}

	// Update last login time
	_, err = tx.Exec("UPDATE users SET last_login = NOW() AT TIME ZONE 'UTC' WHERE id = $1", user.ID)
	if err != nil {
		return "", nil, fmt.Errorf("failed to update last login time: %w", err)
	}

	user.Role = role
	token, err := s.CreateAccessToken(user)
	if err != nil {
		return "", nil, err
	}

	if err = tx.Commit(); err != nil {
		return "", nil, err
	}

	return token, &user, nil
}

// VerifyToken validates a JWT token string and returns the claims if valid.
// Returns ErrInvalidToken if the token is invalid or expired.
func (s AuthService) VerifyToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return s.JwtKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, services.ErrInvalidToken
	}

	return claims, nil
}

// CreateJWTToken generates a new JWT token for the given user.
// The token includes the user's role and ID, and expires based on the service's configuration.
func (s AuthService) CreateAccessToken(user data.User) (string, error) {
	expirationTime := time.Now().UTC().Add(time.Duration(s.JwtExp) * time.Hour)

	claims := &Claims{
		Role: user.Role.Name,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
			Subject:   user.ID.String(),
			IssuedAt:  time.Now().Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.JwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// HashPassword creates a bcrypt hash of the provided password.
// It returns the hashed password as a string or an error if hashing fails.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
