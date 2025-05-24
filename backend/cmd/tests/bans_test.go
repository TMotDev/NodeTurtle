package tests

import (
	"NodeTurtleAPI/internal/services"
	"log"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func setupBansService() (services.IBanService, TestData, func()) {
	testData, db, err := createTestData()

	if err != nil {
		log.Fatalf("Failed setup test data: %v", err)
	}

	return services.NewBanService(db), *testData, func() { db.Close() }
}

func TestBan(t *testing.T) {
	s, td, close := setupBansService()
	defer close()

	tests := map[string]struct {
		userId     uuid.UUID
		bannedBy   uuid.UUID
		expires_at time.Time
		reason     string
		err        error
	}{
		"Successful ban": {
			userId:     td.Users[0].ID,
			bannedBy:   td.Users[3].ID,
			expires_at: time.Now().Add(time.Hour),
			reason:     "test ban",
			err:        nil,
		},
		"Self ban (self account deactivation)": {
			userId:     td.Users[0].ID,
			bannedBy:   td.Users[0].ID,
			expires_at: time.Now().Add(time.Hour),
			reason:     "test self ban",
			err:        nil,
		},
		"Ban receiver ID not found": {
			userId:     uuid.New(),
			bannedBy:   td.Users[3].ID,
			expires_at: time.Now().Add(time.Hour),
			reason:     "test ban",
			err:        services.ErrUserNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			ban, err := s.Ban(tt.userId, tt.bannedBy, tt.expires_at, tt.reason)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)

				if ban.IsValid() {
					assert.Equal(t, ban.ExpiresAt, tt.expires_at)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}
