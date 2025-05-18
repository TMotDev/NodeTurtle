package services

import (
	"NodeTurtleAPI/internal/data"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// IBanService defines the interface for user banning operations.
type IBanService interface {
	Ban(userId uuid.UUID, bannedBy uuid.UUID, expires_at time.Time, reason string) (*data.Ban, error)
}

// BanService implements the IBanService interface for handling user bans.
type BanService struct {
	db *sql.DB
}

// NewService creates a new AuthService with the provided database connection and JWT configuration.
func NewBanService(db *sql.DB) BanService {
	return BanService{
		db: db,
	}
}

func (s BanService) Ban(userId uuid.UUID, bannedBy uuid.UUID, expires_at time.Time, reason string) (*data.Ban, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var ban data.Ban

	query := `
		INSERT INTO banned_users (user_id, reason, banned_by, expires_at)
  			VALUES ($1, $2, $3, $4)
  		ON CONFLICT (user_id) DO UPDATE
  			SET reason = EXCLUDED.reason,
      		banned_by = EXCLUDED.banned_by,
      		expires_at = EXCLUDED.expires_at
  		RETURNING id, reason, banned_by, expires_at;
	`

	err = tx.QueryRow(query, userId, reason, bannedBy, expires_at).Scan(
		&ban.ID, &ban.Reason, &ban.BannedBy, &ban.ExpiresAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &ban, nil
}
