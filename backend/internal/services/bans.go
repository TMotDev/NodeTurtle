package services

import (
	"NodeTurtleAPI/internal/data"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// IBanService defines the interface for user banning operations.
type IBanService interface {
	BanUser(userId uuid.UUID, bannedBy uuid.UUID, expires_at time.Time, reason string) (*data.Ban, error)
	UnbanUser(userId uuid.UUID) error
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

func (s BanService) BanUser(userId uuid.UUID, bannedBy uuid.UUID, expires_at time.Time, reason string) (*data.Ban, error) {
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
		// Foreign key violation (user_id not found)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23503" {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &ban, nil
}

func (s BanService) UnbanUser(userId uuid.UUID) error {
	query := `
        DELETE FROM banned_users
        WHERE user_id = $1;
    `

	result, err := s.db.Exec(query, userId)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrUserNotFound
	}

	return nil
}
