package tests

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/tokens"
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
