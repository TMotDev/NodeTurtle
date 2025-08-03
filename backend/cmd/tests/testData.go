package tests

import (
	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/database"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/utils"
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
)

type TestData struct {
	Users    []TestUser
	Tokens   map[string]*data.Token
	Projects []TestProject
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

type TestProject struct {
	ID              uuid.UUID
	Title           string
	Description     string
	Data            json.RawMessage
	CreatorID       uuid.UUID
	CreatorUsername string
	LikesCount      int
	FeaturedUntil   *time.Time
	CreatedAt       time.Time
	LastEditedAt    time.Time
	IsPublic        bool
	LikedByUsers    []uuid.UUID
}

func createTestData() (*TestData, *sql.DB, error) {
	adminID := uuid.New()

	now := time.Now().UTC()

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
			Role:      data.RoleAdmin,
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
				Reason:    "test ban",
				BannedAt:  now,
				ExpiresAt: now.Add(24 * time.Hour),
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
				Reason:    "test expired ban",
				BannedAt:  now,
				ExpiresAt: now.Add(-24 * time.Hour), // expired ban
			}),
		},
	}

	emptyFlowData := json.RawMessage(`{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}`)

	testProjects := []TestProject{
		{
			ID:              uuid.New(),
			Title:           "Alice's Public Project",
			Description:     "A public project by Alice that everyone can see",
			Data:            emptyFlowData,
			CreatorID:       testUsers[0].ID, // alice
			CreatorUsername: testUsers[0].Username,
			LikesCount:      2,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-72 * time.Hour),
			LastEditedAt:    now.Add(-24 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{testUsers[1].ID, testUsers[3].ID}, // bob and chris
		},
		{
			ID:              uuid.New(),
			Title:           "Alice's Private Project",
			Description:     "A private project by Alice that only she can see",
			Data:            emptyFlowData,
			CreatorID:       testUsers[0].ID, // alice
			CreatorUsername: testUsers[0].Username,
			LikesCount:      0,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-48 * time.Hour),
			LastEditedAt:    now.Add(-12 * time.Hour),
			IsPublic:        false,
			LikedByUsers:    []uuid.UUID{},
		},
		{
			ID:              uuid.New(),
			Title:           "Bob's Featured Project",
			Description:     "Bob's amazing project that is currently featured",
			Data:            emptyFlowData,
			CreatorID:       testUsers[1].ID, // bob
			CreatorUsername: testUsers[1].Username,
			LikesCount:      3,
			FeaturedUntil:   utils.Ptr(now.Add(24 * time.Hour)),
			CreatedAt:       now.Add(-96 * time.Hour),
			LastEditedAt:    now.Add(-6 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{testUsers[0].ID, testUsers[3].ID, testUsers[5].ID}, // alice, chris, frank
		},
		{
			ID:              uuid.New(),
			Title:           "Bob's Private Liked Project",
			Description:     "A private project by Bob that has likes somehow",
			Data:            emptyFlowData,
			CreatorID:       testUsers[1].ID, // bob
			CreatorUsername: testUsers[1].Username,
			LikesCount:      1,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-36 * time.Hour),
			LastEditedAt:    now.Add(-2 * time.Hour),
			IsPublic:        false,
			LikedByUsers:    []uuid.UUID{testUsers[0].ID}, // alice (had access before project went private)
		},
		{
			ID:              uuid.New(),
			Title:           "John's Unactivated User Project",
			Description:     "Project by John who hasn't activated his account",
			Data:            emptyFlowData,
			CreatorID:       testUsers[2].ID, // john (unactivated)
			CreatorUsername: testUsers[2].Username,
			LikesCount:      0,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-12 * time.Hour),
			LastEditedAt:    now.Add(-1 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{},
		},
		{
			ID:              uuid.New(),
			Title:           "Chris's Admin Project",
			Description:     "An admin's public project with lots of likes",
			Data:            emptyFlowData,
			CreatorID:       testUsers[3].ID, // chris (admin)
			CreatorUsername: testUsers[3].Username,
			LikesCount:      4,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-120 * time.Hour),
			LastEditedAt:    now.Add(-8 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{testUsers[0].ID, testUsers[1].ID, testUsers[4].ID, testUsers[5].ID}, // alice, bob, tom, frank
		},
		{
			ID:              uuid.New(),
			Title:           "Tom's Banned User Project",
			Description:     "Project by Tom who is currently banned",
			Data:            emptyFlowData,
			CreatorID:       testUsers[4].ID, // tom (banned)
			CreatorUsername: testUsers[4].Username,
			LikesCount:      0,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-6 * time.Hour),
			LastEditedAt:    now.Add(-30 * time.Minute),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{},
		},
		{
			ID:              uuid.New(),
			Title:           "Frank's Expired Featured Project",
			Description:     "Frank's project that was featured but expired",
			Data:            emptyFlowData,
			CreatorID:       testUsers[5].ID, // frank
			CreatorUsername: testUsers[5].Username,
			LikesCount:      1,
			FeaturedUntil:   utils.Ptr(now.Add(-12 * time.Hour)), // expired 12 hours ago
			CreatedAt:       now.Add(-168 * time.Hour),           // 1 week ago
			LastEditedAt:    now.Add(-72 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{testUsers[1].ID}, // bob
		},
		{
			ID:              uuid.New(),
			Title:           "Frank's Private Featured Project",
			Description:     "Frank's project that was featured but has been privated",
			Data:            emptyFlowData,
			CreatorID:       testUsers[5].ID, // frank
			CreatorUsername: testUsers[5].Username,
			LikesCount:      1,
			FeaturedUntil:   utils.Ptr(now.Add(5 * time.Hour)),
			CreatedAt:       now.Add(-168 * time.Hour), // 1 week ago
			LastEditedAt:    now.Add(-72 * time.Hour),
			IsPublic:        false,
			LikedByUsers:    []uuid.UUID{testUsers[1].ID}, // bob
		},
		{
			ID:              uuid.New(),
			Title:           "Multi User Liked Project",
			Description:     "A public project liked by multiple users",
			Data:            emptyFlowData,
			CreatorID:       testUsers[0].ID, // alice
			CreatorUsername: testUsers[0].Username,
			LikesCount:      5,
			FeaturedUntil:   nil,
			CreatedAt:       now.Add(-200 * time.Hour),
			LastEditedAt:    now.Add(-48 * time.Hour),
			IsPublic:        true,
			LikedByUsers:    []uuid.UUID{testUsers[1].ID, testUsers[2].ID, testUsers[3].ID, testUsers[4].ID, testUsers[5].ID}, // everyone except alice
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
				INSERT INTO banned_users (user_id, banned_at, reason, banned_by, expires_at)
				VALUES ($1, $2, $3, $4, $5)
			`, tk.ID, tk.Ban.BannedAt, tk.Ban.Reason, tk.Ban.BannedBy, tk.Ban.ExpiresAt)
			if err != nil {
				return nil, nil, err
			}
		}
	}

	// insert projects
	for _, p := range testProjects {
		_, err = db.Exec(`
			INSERT INTO projects (id, title, description, is_public, creator_id, data, likes_count, featured_until, created_at, last_edited_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, p.ID, p.Title, p.Description, p.IsPublic, p.CreatorID, p.Data, p.LikesCount, p.FeaturedUntil, p.CreatedAt, p.LastEditedAt)
		if err != nil {
			return nil, nil, err
		}

		// insert project likes
		for _, userID := range p.LikedByUsers {
			_, err = db.Exec(`
				INSERT INTO project_likes (project_id, user_id, created_at)
				VALUES ($1, $2, NOW())
			`, p.ID, userID)
			if err != nil {
				return nil, nil, err
			}
		}
	}

	return &TestData{
		Users:    testUsers,
		Tokens:   testTokens,
		Projects: testProjects,
	}, db, nil
}
