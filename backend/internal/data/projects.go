package data

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Project represents a user-created project in the system.
type Project struct {
	ID              uuid.UUID       `json:"id"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	Data            json.RawMessage `json:"data"` // react-flow JSON data
	CreatorID       uuid.UUID       `json:"creator_id"`
	CreatorUsername string          `json:"creator_username"`
	LikesCount      int             `json:"likes_count"`
	FeaturedUntil   *time.Time      `json:"featured_until,omitempty"`
	LastEditedAt    time.Time       `json:"last_edited_at"`
	IsPublic        bool            `json:"is_public"`
}

// ProjectLike represents a single "like" or "bookmark" by a user on a project.
type ProjectLike struct {
	ProjectID uuid.UUID `json:"project_id"`
	UserID    uuid.UUID `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}

// ProjectCreate represents the data required to create a new project.
type ProjectCreate struct {
	Title       string           `json:"title" validate:"required,min=3,max=100,alphanum"`
	Description string           `json:"description" validate:"max=5000"`
	Data        *json.RawMessage `json:"data,omitempty"` // can be nil for new projects
	IsPublic    bool             `json:"is_public" validate:"required"`
}

// ProjectUpdate represents the fields that can be updated for a project.
type ProjectUpdate struct {
	Title       *string         `json:"title,omitempty" validate:"omitempty,min=3,max=100"`
	Description *string         `json:"description,omitempty" validate:"omitempty,max=5000"`
	IsPublic    *bool           `json:"is_public,omitempty"`
	Data        json.RawMessage `json:"data,omitempty"`
}
