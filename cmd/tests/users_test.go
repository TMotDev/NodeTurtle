package tests

import (
	"log"
	"testing"
	"time"

	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/database"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type TestData struct {
	Users  []TestUser
	Tokens map[string]*data.Token
}

type TestUser struct {
	ID        uuid.UUID
	Email     string
	Username  string
	Password  string
	Role      int
	Activated bool
}

func createTestData() TestData {
	testUsers := []TestUser{
		{
			ID:        uuid.New(),
			Email:     "alice@example.com",
			Username:  "alice",
			Password:  "password1234",
			Role:      int(data.RoleUser),
			Activated: true,
		},
		{
			ID:        uuid.New(),
			Email:     "bob@example.com",
			Username:  "bob",
			Password:  "password1234",
			Role:      int(data.RoleUser),
			Activated: true,
		},
		{
			ID:        uuid.New(),
			Email:     "john@example.com",
			Username:  "john",
			Password:  "password1234",
			Role:      int(data.RoleUser),
			Activated: false,
		},
	}

	t1, _ := tokens.GenerateToken(testUsers[2].ID, time.Hour, data.ScopeUserActivation)
	t2, _ := tokens.GenerateToken(testUsers[1].ID, time.Hour, data.ScopePasswordReset)
	t3, _ := tokens.GenerateToken(testUsers[0].ID, time.Microsecond, data.ScopePasswordReset)

	t3.ExpiresAt = time.Now().UTC().Add(-time.Hour)

	testTokens := map[string]*data.Token{
		"john_valid_activation":        t1,
		"bob_valid_password_reset":     t2,
		"alice_expired_password_reset": t3,
	}

	return TestData{
		Users:  testUsers,
		Tokens: testTokens,
	}
}

func setupService(t *testing.T) (users.IUserService, TestData, func()) {
	testData := createTestData()

	config := config.DatabaseConfig{
		Host:     config.GetEnv("TEST_DB_HOST", "localhost"),
		Port:     config.GetEnvAsInt("TEST_DB_PORT", 5432),
		User:     config.GetEnv("TEST_DB_USER", "postgres"),
		Password: config.GetEnv("TEST_DB_PASSWORD", "admin"),
		Name:     config.GetEnv("TEST_DB_NAME", "NodeTurtle_Test"),
		SSLMode:  config.GetEnv("TEST_DB_SSLMODE", "disable"),
	}

	db, err := database.Connect(config)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	_, err = db.Exec(`TRUNCATE tokens, users RESTART IDENTITY CASCADE;`)
	if err != nil {
		log.Fatalf("Failed to erase test database: %v", err)
	}

	// insert users
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

	// insert tokens
	for _, tk := range testData.Tokens {
		_, err = db.Exec(`
            INSERT INTO tokens (hash, user_id, scope, created_at, expires_at)
            VALUES ($1, $2, $3, NOW(), $4)
        `, tk.Hash, tk.UserID, tk.Scope, tk.ExpiresAt)
		assert.NoError(t, err)
	}

	return users.NewUserService(db), testData, func() { db.Close() }
}

func TestCreateUser(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		reg data.UserRegistration
		err error
	}{
		"Successful user creation": {
			reg: data.UserRegistration{
				Email:    "test@example.com",
				Username: "testuser",
				Password: "password123",
			},
			err: nil,
		},
		"Duplicate email": {
			reg: data.UserRegistration{
				Email:    td.Users[1].Email,
				Username: "newbob",
				Password: "duplicate123",
			},
			err: services.ErrDuplicateEmail,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.CreateUser(tt.reg)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}

}

func TestResetPassword(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		token       string
		newPassword string
		err         error
	}{
		"Successful password reset": {
			token:       td.Tokens["bob_valid_password_reset"].Plaintext,
			newPassword: "newPassword1234",
			err:         nil,
		},
		"Expired token": {
			token:       td.Tokens["alice_expired_password_reset"].Plaintext,
			newPassword: "newPassword1234",
			err:         services.ErrExpiredToken,
		},
		"Wrong token": {
			token:       td.Tokens["john_valid_activation"].Plaintext,
			newPassword: "newPassword1234",
			err:         services.ErrInvalidToken,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			err := s.ResetPassword(tt.token, tt.newPassword)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestChangePassword(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		userId      uuid.UUID
		oldPassword string
		newPassword string
		err         error
	}{
		"Successful password reset": {
			userId:      td.Users[0].ID,
			oldPassword: "password1234",
			newPassword: "newPassword1234",
			err:         nil,
		},
		"User ID not found": {
			userId:      uuid.New(),
			oldPassword: "password1234",
			newPassword: "newPassword1234",
			err:         services.ErrUserNotFound,
		},
		"Wrong old password": {
			userId:      td.Users[0].ID,
			oldPassword: "wrongPassword",
			newPassword: "newPassword1234",
			err:         services.ErrInvalidCredentials,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			err := s.ChangePassword(tt.userId, tt.oldPassword, tt.newPassword)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestGetUserById(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		userId uuid.UUID
		err    error
	}{
		"Successful user fetch": {
			userId: td.Users[0].ID,
			err:    nil,
		},
		"User ID not found": {
			userId: uuid.New(),
			err:    services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.GetUserByID(tt.userId)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestGetUserByEmail(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		email string
		err   error
	}{
		"Successful user fetch": {
			email: td.Users[0].Email,
			err:   nil,
		},
		"User ID not found": {
			email: "notfound@example.com",
			err:   services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.GetUserByEmail(tt.email)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestListUsers(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		page          int
		limit         int
		expectedCount int
		err           error
	}{
		"Successful user list fetch": {
			page:          1,
			limit:         2,
			expectedCount: 2,
			err:           nil,
		},
		"Negative params": {
			page:          -1,
			limit:         -99,
			expectedCount: len(td.Users),
			err:           nil,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			u, _, err := s.ListUsers(tt.page, tt.limit)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedCount, len(u))
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestUpdateUser(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		userID  uuid.UUID
		updates map[string]interface{}
		err     error
	}{
		"Successful user update": {
			userID:  td.Users[0].ID,
			updates: map[string]interface{}{"username": "newUsername", "email": "newEmail@example.com", "activated": true, "role_id": data.RolePremium},
			err:     nil,
		},
		"No updates provided": {
			userID:  td.Users[0].ID,
			updates: map[string]interface{}{},
			err:     services.ErrNoFields,
		},
		"Incorect updates provided": {
			userID:  td.Users[0].ID,
			updates: map[string]interface{}{"USERNAME": "NEWUSERNAME", "Email": "NEWEMAIL@example.com", "active": true},
			err:     services.ErrInvalidData,
		},
		"No user found": {
			userID:  uuid.New(),
			updates: map[string]interface{}{"username": "newUsername", "email": "newEmail@example.com", "activated": true, "role_id": data.RolePremium},
			err:     services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			err := s.UpdateUser(tt.userID, tt.updates)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestDeleteUser(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		userId uuid.UUID
		err    error
	}{
		"Successful user delete": {
			userId: td.Users[0].ID,
			err:    nil,
		},
		"User ID not found": {
			userId: uuid.New(),
			err:    services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			err := s.DeleteUser(tt.userId)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestGetForToken(t *testing.T) {
	s, td, close := setupService(t)
	defer close()

	tests := map[string]struct {
		tokenScope     data.TokenScope
		tokenPlaintext string
		err            error
	}{
		"Successful user fetch": {
			tokenScope:     data.ScopePasswordReset,
			tokenPlaintext: td.Tokens["bob_valid_password_reset"].Plaintext,
			err:            nil,
		},
		"Invalid token format": {
			tokenScope:     data.ScopePasswordReset,
			tokenPlaintext: "asdf",
			err:            services.ErrRecordNotFound,
		},
		"Expired token": {
			tokenScope:     data.ScopePasswordReset,
			tokenPlaintext: td.Tokens["alice_expired_password_reset"].Plaintext,
			err:            services.ErrRecordNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.GetForToken(tt.tokenScope, tt.tokenPlaintext)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}
