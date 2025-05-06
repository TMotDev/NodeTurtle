package tests

import (
	"log"
	"testing"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/database"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

// Reusing TestData, TestUser from users_test.go
func setupAuthService(t *testing.T) (auth.IAuthService, TestData, func()) {
	testData := createTestData()

	dbConfig := config.DatabaseConfig{
		Host:     config.GetEnv("TEST_DB_HOST", "localhost"),
		Port:     config.GetEnvAsInt("TEST_DB_PORT", 5432),
		User:     config.GetEnv("TEST_DB_USER", "postgres"),
		Password: config.GetEnv("TEST_DB_PASSWORD", "admin"),
		Name:     config.GetEnv("TEST_DB_NAME", "NodeTurtle_Test"),
		SSLMode:  config.GetEnv("TEST_DB_SSLMODE", "disable"),
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	_, err = db.Exec(`TRUNCATE tokens, users RESTART IDENTITY CASCADE;`)
	if err != nil {
		log.Fatalf("Failed to erase test database: %v", err)
	}

	// Insert test users
	for _, u := range testData.Users {
		var pwd data.Password
		err := pwd.Set(u.Password)
		assert.NoError(t, err)

		_, err = db.Exec(`
			INSERT INTO users (id, email, username, password, role_id, activated, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, NOW())
		`, u.ID, u.Email, u.Username, pwd.Hash, u.Role, u.Activated)
		assert.NoError(t, err)
	}

	// Insert tokens
	for _, tk := range testData.Tokens {
		_, err = db.Exec(`
			INSERT INTO tokens (hash, user_id, scope, created_at, expires_at)
			VALUES ($1, $2, $3, NOW(), $4)
		`, tk.Hash, tk.UserID, tk.Scope, tk.ExpiresAt)
		assert.NoError(t, err)
	}

	jwtConfig := config.JWTConfig{
		Secret:     "test-secret",
		ExpireTime: 24,
	}

	return auth.NewService(db, jwtConfig), testData, func() { db.Close() }
}

func TestLogin(t *testing.T) {
	s, td, close := setupAuthService(t)
	defer close()

	tests := map[string]struct {
		email    string
		password string
		err      error
	}{
		"Successful login": {
			email:    td.Users[0].Email,
			password: td.Users[0].Password,
			err:      nil,
		},
		"Invalid credentials - wrong email": {
			email:    "nonexistent@example.com",
			password: "password1234",
			err:      services.ErrInvalidCredentials,
		},
		"Invalid credentials - wrong password": {
			email:    td.Users[0].Email,
			password: "wrongpassword",
			err:      services.ErrInvalidCredentials,
		},
		"Inactive account": {
			email:    td.Users[2].Email,
			password: td.Users[2].Password,
			err:      services.ErrInactiveAccount,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			token, user, err := s.Login(tt.email, tt.password)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
				assert.Empty(t, token)
				assert.Nil(t, user)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, token)
				assert.NotNil(t, user)
				assert.Equal(t, tt.email, user.Email)
			}
		})
	}
}

func TestCreateJWTToken(t *testing.T) {
	s, td, close := setupAuthService(t)
	defer close()

	tests := map[string]struct {
		user data.User
		err  error
	}{
		"Successful token creation": {
			user: data.User{
				ID:       td.Users[0].ID,
				Email:    td.Users[0].Email,
				Username: td.Users[0].Username,
				Role:     data.Role{ID: int64(data.RoleUser), Name: "user"},
			},
			err: nil,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			token, err := s.CreateJWTToken(tt.user)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
				assert.Empty(t, token)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, token)
			}
		})
	}
}

func TestVerifyToken(t *testing.T) {
	s, td, close := setupAuthService(t)
	defer close()

	user := data.User{
		ID:       td.Users[0].ID,
		Email:    td.Users[0].Email,
		Username: td.Users[0].Username,
		Role:     data.Role{ID: int64(data.RoleUser), Name: "user"},
	}
	validToken, err := s.CreateJWTToken(user)
	assert.NoError(t, err)

	invalidService := auth.AuthService{
		JwtKey: []byte("different-secret"),
		JwtExp: 24,
	}
	invalidToken, err := invalidService.CreateJWTToken(user)
	assert.NoError(t, err)

	tests := map[string]struct {
		token string
		err   error
	}{
		"Valid token": {
			token: validToken,
			err:   nil,
		},
		"Invalid token format": {
			token: "not.a.validtoken",
			err:   services.ErrInvalidToken,
		},
		"Token with wrong signature": {
			token: invalidToken,
			err:   services.ErrInvalidToken,
		},
		"Empty token": {
			token: "",
			err:   services.ErrInvalidToken,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			claims, err := s.VerifyToken(tt.token)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Nil(t, claims)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
				assert.Equal(t, user.ID, claims.UserID)
				assert.Equal(t, user.Email, claims.Email)
				assert.Equal(t, user.Role.Name, claims.Role)
			}
		})
	}
}

func TestHashPassword(t *testing.T) {
	tests := map[string]struct {
		password string
		err      error
	}{
		"Successful password hash": {
			password: "password1234",
			err:      nil,
		},
		"Empty password": {
			password: "",
			err:      nil,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			hash, err := auth.HashPassword(tt.password)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
				assert.Empty(t, hash)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, hash)
				// Verify the hash works for the password
				err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(tt.password))
				assert.NoError(t, err)
			}
		})
	}
}
