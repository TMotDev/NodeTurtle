package mocks

import (
	"NodeTurtleAPI/internal/data"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockBanService struct {
	mock.Mock
}

func (m *MockBanService) BanUser(userId uuid.UUID, bannedBy uuid.UUID, expires_at time.Time, reason string) (*data.Ban, error) {
	args := m.Called(userId, bannedBy, expires_at, reason)

	var user *data.Ban
	if args.Get(0) != nil {
		user = args.Get(0).(*data.Ban)
	}

	return user, args.Error(1)
}

func (m *MockBanService) UnbanUser(userId uuid.UUID) error {
	args := m.Called(userId)

	return args.Error(0)
}
