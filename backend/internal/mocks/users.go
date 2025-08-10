package mocks

import (
	"NodeTurtleAPI/internal/data"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockUserService struct {
	mock.Mock
}

func (m *MockUserService) CreateUser(reg data.UserRegistration) (*data.User, error) {
	args := m.Called(reg)
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
func (m *MockUserService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	args := m.Called(userID, oldPassword, newPassword)
	return args.Error(0)
}

func (m *MockUserService) GetUserByID(userID uuid.UUID) (*data.User, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*data.User), args.Error(1)
}
func (m *MockUserService) GetUserByUsername(username string) (*data.User, error) {
	args := m.Called(username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*data.User), args.Error(1)
}

func (m *MockUserService) GetUserByEmail(email string) (*data.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*data.User), args.Error(1)
}

func (m *MockUserService) ListUsers(filters data.UserFilter) ([]data.User, int, error) {
	args := m.Called(filters)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]data.User), args.Int(1), args.Error(2)
}

func (m *MockUserService) UpdateUser(userID uuid.UUID, updates data.UserUpdate) (*data.User, error) {
	args := m.Called(userID, updates)
	var user *data.User
	if args.Get(0) != nil {
		user = args.Get(0).(*data.User)
	}
	return user, args.Error(1)
}

func (m *MockUserService) DeleteUser(userID uuid.UUID) error {
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

func (m *MockUserService) UsernameExists(username string) (bool, error) {
	args := m.Called(username)

	return args.Get(0).(bool), args.Error(1)
}
func (m *MockUserService) EmailExists(email string) (bool, error) {
	args := m.Called(email)

	return args.Get(0).(bool), args.Error(1)
}
