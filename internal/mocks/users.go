package mocks

import (
	"NodeTurtleAPI/internal/data"

	"github.com/stretchr/testify/mock"
)

type MockUserService struct {
	mock.Mock
}

func (m *MockUserService) CreateUser(reg data.UserRegistration) (*data.User, error) {
	args := m.Called(reg)

	// Handle nil user case
	var user *data.User
	if args.Get(0) != nil {
		user = args.Get(0).(*data.User)
	}

	return user, args.Error(1)
}

func (m *MockUserService) ResetPassword(token, newPassword string) error {
	args := m.Called(token, newPassword)
	return args.Error(0)
}
func (m *MockUserService) ChangePassword(userID int64, oldPassword, newPassword string) error {
	args := m.Called(userID, oldPassword, newPassword)
	return args.Error(0)
}

func (m *MockUserService) GetUserByID(userID int64) (*data.User, error) {
	args := m.Called(userID)
	return args.Get(0).(*data.User), args.Error(1)
}

func (m *MockUserService) GetUserByEmail(email string) (*data.User, error) {
	args := m.Called(email)

	if args.Get(0) == nil {
		return nil, args.Error(1)
	}

	return args.Get(0).(*data.User), args.Error(1)

}

func (m *MockUserService) ListUsers(page, limit int) ([]data.User, int, error) {
	args := m.Called(page, limit)

	var users []data.User
	if args.Get(0) != nil {
		users = args.Get(0).([]data.User)
	}

	return users, args.Int(1), args.Error(2)
}

func (m *MockUserService) UpdateUser(userID int64, updates map[string]interface{}) error {
	args := m.Called(userID, updates)
	return args.Error(0)
}

func (m *MockUserService) DeleteUser(userID int) error {
	args := m.Called(userID)
	return args.Error(0)
}

func (m *MockUserService) GetForToken(tokenScope data.TokenScope, tokenPlaintext string) (*data.User, error) {
	args := m.Called(tokenScope, tokenPlaintext)

	var user *data.User
	if args.Get(0) != nil {
		user = args.Get(0).(*data.User)
	}

	return user, args.Error(1)
}
