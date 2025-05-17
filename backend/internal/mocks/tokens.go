package mocks

import (
	"NodeTurtleAPI/internal/data"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockTokenService struct {
	mock.Mock
}

func (m *MockTokenService) New(userID uuid.UUID, ttl time.Duration, scope data.TokenScope) (*data.Token, error) {
	args := m.Called(userID, ttl, scope)

	var token *data.Token
	if args.Get(0) != nil {
		token = args.Get(0).(*data.Token)
	}
	return token, args.Error(1)
}

func (m *MockTokenService) Insert(token *data.Token) error {
	args := m.Called(token)
	return args.Error(0)
}

func (m *MockTokenService) DeleteAllForUser(scope data.TokenScope, userID uuid.UUID) error {
	args := m.Called(scope, userID)
	return args.Error(0)
}
