package mocks

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/stretchr/testify/mock"
)

type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Login(email, password string) (string, *data.User, error) {
	args := m.Called(email, password)

	var user *data.User
	if args.Get(1) != nil {
		user = args.Get(1).(*data.User)
	}

	return args.String(0), user, args.Error(2)
}

func (m *MockAuthService) CreateAccessToken(user data.User) (string, error) {
	args := m.Called(user)
	return args.String(0), args.Error(1)
}

func (m *MockAuthService) VerifyToken(tokenString string) (*auth.Claims, error) {
	args := m.Called(tokenString)

	var claims *auth.Claims
	if args.Get(0) != nil {
		claims = args.Get(0).(*auth.Claims)
	}

	return claims, args.Error(1)
}
