package projects

import (
	"NodeTurtleAPI/internal/data"
	"database/sql"

	"github.com/google/uuid"
)

// IProjectService defines the interface for project management operations.
type IProjectService interface {
	CreateProject(p data.ProjectCreate) (*data.Project, error)
	GetProject(projectID uuid.UUID) (*data.Project, error)
	GetUserProjects(userID uuid.UUID) ([]data.Project, error)
	GetFeaturedProjects(limit, offset int) ([]data.Project, error)
	GetLikedProjects(userID uuid.UUID) ([]data.Project, error)
	LikeProject(projectID, userID uuid.UUID) error
	UnlikeProject(projectID, userID uuid.UUID) error
	UpdateProject(p data.ProjectUpdate) (*data.Project, error)
	DeleteProject(projectID uuid.UUID) error
}

// UserService implements the IUserService interface for managing users.
type ProjectService struct {
	db *sql.DB
}

// NewProjectService creates a new ProjectService with the provided database connection.
func NewProjectService(db *sql.DB) ProjectService {
	return ProjectService{
		db: db,
	}
}
