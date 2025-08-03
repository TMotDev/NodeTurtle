package tests

import (
	"errors"
	"log"
	"testing"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func setupAuthService() (auth.IAuthService, TestData, func()) {
	testData, db, err := createTestData()

	if err != nil {
		log.Fatalf("Failed setup test data: %v", err)
	}

	jwtConfig := config.JWTConfig{
		Secret:     "test-secret",
		ExpireTime: 24,
	}

	return auth.NewService(db, jwtConfig), *testData, func() { db.Close() }
}

func TestLogin(t *testing.T) {
	s, td, close := setupAuthService()
	defer close()

	tests := map[string]struct {
		email    string
		password string
		err      error
	}{
		"Successful login": {
			email:    td.Users[UserAlice].Email,
			password: td.Users[UserAlice].Password,
			err:      nil,
		},
		"Invalid credentials - wrong email": {
			email:    "nonexistent@example.com",
			password: "password1234",
			err:      services.ErrInvalidCredentials,
		},
		"Invalid credentials - wrong password": {
			email:    td.Users[UserAlice].Email,
			password: "wrongpassword",
			err:      services.ErrInvalidCredentials,
		},
		"Inactive account": {
			email:    td.Users[UserJohn].Email,
			password: td.Users[UserJohn].Password,
			err:      services.ErrInactiveAccount,
		},
		"Suspended account": {
			email:    td.Users[UserTom].Email,
			password: td.Users[UserTom].Password,
			err:      services.ErrAccountSuspended,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			token, user, err := s.Login(tt.email, tt.password)

			if tt.err != nil {
				assert.Error(t, err)
				assert.True(t, errors.Is(err, tt.err))
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
	s, td, close := setupAuthService()
	defer close()

	tests := map[string]struct {
		user data.User
		err  error
	}{
		"Successful token creation": {
			user: data.User{
				ID:       td.Users[UserAlice].ID,
				Email:    td.Users[UserAlice].Email,
				Username: td.Users[UserAlice].Username,
				Role:     data.Role{ID: data.RoleUser.ToID(), Name: "user"},
			},
			err: nil,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			token, err := s.CreateAccessToken(tt.user)

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
	s, td, close := setupAuthService()
	defer close()

	user := data.User{
		ID:       td.Users[UserAlice].ID,
		Email:    td.Users[UserAlice].Email,
		Username: td.Users[UserAlice].Username,
		Role:     data.Role{ID: data.RoleUser.ToID(), Name: "user"},
	}
	validToken, err := s.CreateAccessToken(user)
	assert.NoError(t, err)

	invalidService := auth.AuthService{
		JwtKey: []byte("different-secret"),
		JwtExp: 24,
	}
	invalidToken, err := invalidService.CreateAccessToken(user)
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
				assert.Equal(t, user.ID, uuid.MustParse(claims.Subject))
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
				err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(tt.password))
				assert.NoError(t, err)
			}
		})
	}
}
