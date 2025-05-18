package tests

import (
	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/database"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/utils"
	"database/sql"
	"log"
	"time"

	"github.com/google/uuid"
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
	Role      data.RoleType
	Activated bool
	Ban       *data.Ban
}

func createTestData() (*TestData, *sql.DB, error) {

	adminID := uuid.New()
	testUsers := []TestUser{
		{
			ID:        uuid.New(),
			Email:     "alice@example.com",
			Username:  "alice",
			Password:  "password1234",
			Role:      data.RoleUser,
			Activated: true,
		},
		{
			ID:        uuid.New(),
			Email:     "bob@example.com",
			Username:  "bob",
			Password:  "password1234",
			Role:      data.RoleUser,
			Activated: true,
		},
		{
			ID:        uuid.New(),
			Email:     "john@example.com",
			Username:  "john",
			Password:  "password1234",
			Role:      data.RolePremium,
			Activated: false,
		},
		{
			ID:        adminID,
			Email:     "chris@example.com",
			Username:  "chris",
			Password:  "password1234",
			Role:      data.RoleModerator,
			Activated: true,
		},
		{
			ID:        uuid.New(),
			Email:     "tom@example.com",
			Username:  "tom",
			Password:  "password1234",
			Role:      data.RolePremium,
			Activated: true,
			Ban: utils.Ptr(data.Ban{
				BannedBy:  adminID,
				Reason:    "Self-deactivated",
				BannedAt:  time.Now().UTC(),
				ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
			}),
		},
		{
			ID:        uuid.New(),
			Email:     "frank@example.com",
			Username:  "frank",
			Password:  "password1234",
			Role:      data.RoleUser,
			Activated: true,
			Ban: utils.Ptr(data.Ban{
				BannedBy:  adminID,
				Reason:    "Self-deactivated",
				BannedAt:  time.Now().UTC(),
				ExpiresAt: time.Now().UTC().Add(-24 * time.Hour), // expired ban
			}),
		},
	}

	t1, _ := tokens.GenerateToken(testUsers[2].ID, time.Hour, data.ScopeUserActivation)
	t2, _ := tokens.GenerateToken(testUsers[1].ID, time.Hour, data.ScopePasswordReset)
	t3, _ := tokens.GenerateToken(testUsers[0].ID, time.Microsecond, data.ScopePasswordReset)
	t4, _ := tokens.GenerateToken(testUsers[4].ID, time.Hour, data.ScopePasswordReset)

	t3.ExpiresAt = time.Now().UTC().Add(-time.Hour)

	testTokens := map[string]*data.Token{
		"john_valid_activation":        t1,
		"bob_valid_password_reset":     t2,
		"alice_expired_password_reset": t3,
		"tom_account_suspended":        t4,
	}

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
	for _, u := range testUsers {
		var pwd data.Password
		if err := pwd.Set(u.Password); err != nil {
			return nil, nil, err
		}

		_, err = db.Exec(`
            INSERT INTO users (id, email, username, password, role_id, activated, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, u.ID, u.Email, u.Username, pwd.Hash, u.Role, u.Activated)

		if err != nil {
			return nil, nil, err
		}
	}

	// insert tokens
	for _, tk := range testTokens {
		_, err = db.Exec(`
            INSERT INTO tokens (hash, user_id, scope, created_at, expires_at)
            VALUES ($1, $2, $3, NOW(), $4)
        `, tk.Hash, tk.UserID, tk.Scope, tk.ExpiresAt)
		if err != nil {
			return nil, nil, err
		}
	}

	// insert bans
	for _, tk := range testUsers {
		if tk.Ban != nil {
			_, err = db.Exec(`
				INSERT INTO banned_users (user_id, banned_at, reason, expires_at)
				VALUES ($1, $2, $3, $4)
			`, tk.ID, tk.Ban.BannedAt, tk.Ban.Reason, tk.Ban.ExpiresAt)
			if err != nil {
				return nil, nil, err
			}
		}
	}

	return &TestData{
		Users:  testUsers,
		Tokens: testTokens,
	}, db, nil
}
