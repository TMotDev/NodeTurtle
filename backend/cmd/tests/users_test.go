package tests

import (
	"errors"
	"fmt"
	"log"
	"testing"
	"time"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/users"
	"NodeTurtleAPI/internal/utils"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func setupUserService() (users.IUserService, TestData, func()) {
	testData, db, err := createTestData()

	if err != nil {
		log.Fatalf("Failed setup test data: %v", err)
	}

	return users.NewUserService(db), *testData, func() { db.Close() }
}

func TestCreateUser(t *testing.T) {
	s, td, close := setupUserService()
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
		"Duplicate username": {
			reg: data.UserRegistration{
				Email:    "test2@example.com",
				Username: td.Users[UserBob].Username,
				Password: "duplicate123",
			},
			err: services.ErrDuplicateUsername,
		},
		"Duplicate email": {
			reg: data.UserRegistration{
				Email:    td.Users[UserBob].Email,
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
	s, td, close := setupUserService()
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
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		userId      uuid.UUID
		oldPassword string
		newPassword string
		err         error
	}{
		"Successful password reset": {
			userId:      td.Users[UserAlice].ID,
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
			userId:      td.Users[UserAlice].ID,
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
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		userId uuid.UUID
		err    error
	}{
		"Successful user fetch": {
			userId: td.Users[UserAlice].ID,
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
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		email string
		err   error
	}{
		"Successful user fetch": {
			email: td.Users[UserAlice].Email,
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

func TestGetUserByUsername(t *testing.T) {
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		username string
		err      error
	}{
		"Successful user fetch": {
			username: td.Users[UserAlice].Username,
			err:      nil,
		},
		"User not found": {
			username: "notfound",
			err:      services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.GetUserByUsername(tt.username)

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
	s, _, close := setupUserService()
	defer close()

	tests := map[string]struct {
		filters data.UserFilter
		err     error
	}{
		"Successful user list fetch": {
			filters: data.UserFilter{
				Page:      1,
				Limit:     10,
				SortField: "created_at",
				SortOrder: "desc",
			},
			err: nil,
		},
		"Get only premium users": {
			filters: data.UserFilter{
				Page:      1,
				Limit:     10,
				Role:      utils.Ptr(data.RolePremium),
				SortField: "created_at",
				SortOrder: "desc",
			},
			err: nil,
		},
		"Partial email search": {
			filters: data.UserFilter{
				Page:      1,
				Limit:     10,
				Email:     utils.Ptr("lice"),
				SortField: "created_at",
				SortOrder: "desc",
			},
			err: nil,
		},
		"Partial username search": {
			filters: data.UserFilter{
				Page:      1,
				Limit:     10,
				Username:  utils.Ptr("ohn"),
				SortField: "created_at",
				SortOrder: "desc",
			},
			err: nil,
		},
		"Search inactive accounts": {
			filters: data.UserFilter{
				Page:             1,
				Limit:            10,
				ActivationStatus: utils.Ptr(false),
				SortField:        "created_at",
				SortOrder:        "desc",
			},
			err: nil,
		},
		"Filter by created_at before a specific time": {
			filters: data.UserFilter{
				Page:          1,
				Limit:         10,
				CreatedBefore: utils.Ptr(time.Now().Add(-24 * time.Hour)),
				SortField:     "created_at",
				SortOrder:     "desc",
			},
			err: nil,
		},
		"Filter by created_at after a specific time": {
			filters: data.UserFilter{
				Page:         1,
				Limit:        10,
				CreatedAfter: utils.Ptr(time.Now().Add(-7 * 24 * time.Hour)),
				SortField:    "created_at",
				SortOrder:    "asc",
			},
			err: nil,
		},
		"Filter by last_login before a specific time": {
			filters: data.UserFilter{
				Page:            1,
				Limit:           10,
				LastLoginBefore: utils.Ptr(time.Now().Add(-30 * 24 * time.Hour)),
				SortField:       "last_login",
				SortOrder:       "desc",
			},
			err: nil,
		},
		"Filter by last_login after a specific time": {
			filters: data.UserFilter{
				Page:           1,
				Limit:          10,
				LastLoginAfter: utils.Ptr(time.Now().Add(-1 * time.Hour)),
				SortField:      "last_login",
				SortOrder:      "asc",
			},
			err: nil,
		},
		"Filter by banned_before": {
			filters: data.UserFilter{
				Page:         1,
				Limit:        10,
				BannedBefore: utils.Ptr(time.Now().Add(-15 * 24 * time.Hour)),
				SortField:    "created_at",
				SortOrder:    "desc",
			},
			err: nil,
		},
		"Filter by banned_after": {
			filters: data.UserFilter{
				Page:        1,
				Limit:       10,
				BannedAfter: utils.Ptr(time.Now().Add(-10 * 24 * time.Hour)),
				SortField:   "created_at",
				SortOrder:   "asc",
			},
			err: nil,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			u, _, err := s.ListUsers(tt.filters)

			fmt.Println(u)

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

func TestUpdateUser(t *testing.T) {
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		userID  uuid.UUID
		updates *data.UserUpdate
		err     error
	}{
		"Successful user update": {
			userID: td.Users[UserAlice].ID,
			updates: &data.UserUpdate{
				Username:  utils.Ptr("newUsername"),
				Email:     utils.Ptr("newEmail@example.com"),
				Activated: utils.Ptr(true),
				Role:      utils.Ptr(data.RolePremium),
			},
			err: nil,
		},
		"No updates provided": {
			userID:  td.Users[UserAlice].ID,
			updates: &data.UserUpdate{},
			err:     services.ErrNoFields,
		},
		"No user found": {
			userID: uuid.New(),
			updates: &data.UserUpdate{
				Username:  utils.Ptr("newUsername"),
				Email:     utils.Ptr("newEmail@example.com"),
				Activated: utils.Ptr(true),
				Role:      utils.Ptr(data.RolePremium),
			},
			err: services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			_, err := s.UpdateUser(tt.userID, *tt.updates)

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
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		userId uuid.UUID
		err    error
	}{
		"Successful user delete": {
			userId: td.Users[UserAlice].ID,
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
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		tokenScope     data.TokenScope
		tokenPlaintext string
		err            error
	}{
		"Successful user fetch": {
			tokenScope:     data.ScopePasswordReset,
			tokenPlaintext: td.Tokens["tom_account_suspended"].Plaintext,
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
				assert.True(t, errors.Is(err, tt.err))
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestEmailExists(t *testing.T) {
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		email  string
		exists bool
	}{
		"Email exists": {
			email:  td.Users[UserAlice].Email,
			exists: true,
		},
		"Email does not exist": {
			email:  "available@test.test",
			exists: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			exists, err := s.EmailExists(tt.email)

			assert.Equal(t, tt.exists, exists)
			assert.NoError(t, err)
		})
	}
}
func TestUsernameExists(t *testing.T) {
	s, td, close := setupUserService()
	defer close()

	tests := map[string]struct {
		username string
		exists   bool
	}{
		"Username exists": {
			username: td.Users[UserAlice].Username,
			exists:   true,
		},
		"Username does not exist": {
			username: "username",
			exists:   false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			exists, err := s.UsernameExists(tt.username)

			assert.Equal(t, tt.exists, exists)
			assert.NoError(t, err)
		})
	}
}
