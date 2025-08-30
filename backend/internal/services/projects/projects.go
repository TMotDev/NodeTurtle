// Package projects provides functionality for managing user projects.
package projects

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// IProjectService defines the interface for project management operations.
type IProjectService interface {
	CreateProject(p data.ProjectCreate) (*data.Project, error)
	GetProject(projectID, requestingUserID uuid.UUID) (*data.Project, error)
	GetUserProjects(profileUserID, requestingUserID uuid.UUID) ([]data.Project, error)
	GetFeaturedProjects(limit, offset int) ([]data.Project, error)
	GetLikedProjects(userID uuid.UUID) ([]data.Project, error)
	LikeProject(projectID, userID uuid.UUID) error
	UnlikeProject(projectID, userID uuid.UUID) error
	UpdateProject(p data.ProjectUpdate) (*data.Project, error)
	DeleteProject(projectID uuid.UUID) error
	IsOwner(projectID, userID uuid.UUID) (bool, error)
	GetPublicProjects(filters data.ProjectFilter) ([]data.Project, int, error)
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

// CreateProject creates a new project with the provided data for a specific user.
func (s ProjectService) CreateProject(p data.ProjectCreate) (*data.Project, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var project data.Project
	query := `
		INSERT INTO projects (title, description, data, creator_id, is_public)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, title, description, data, creator_id, (SELECT username FROM users WHERE id = $4), likes_count, featured_until, created_at, last_edited_at, is_public`

	err = tx.QueryRow(
		query,
		p.Title,
		p.Description,
		p.Data,
		p.CreatorID,
		p.IsPublic,
	).Scan(
		&project.ID,
		&project.Title,
		&project.Description,
		&project.Data,
		&project.CreatorID,
		&project.CreatorUsername,
		&project.LikesCount,
		&project.FeaturedUntil,
		&project.CreatedAt,
		&project.LastEditedAt,
		&project.IsPublic,
	)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &project, nil
}

// GetProject retrieves a single project by its ID, ensuring the requesting user has permission to view it.
func (s ProjectService) GetProject(projectID, requestingUserID uuid.UUID) (*data.Project, error) {
	var project data.Project
	query := `
		SELECT p.id, p.title, p.description, p.data, p.creator_id, u.username, p.likes_count, p.featured_until, p.created_at, p.last_edited_at, p.is_public
		FROM projects p
		JOIN users u ON p.creator_id = u.id
		WHERE p.id = $1 AND (p.is_public = TRUE OR p.creator_id = $2)`

	err := s.db.QueryRow(query, projectID, requestingUserID).Scan(
		&project.ID,
		&project.Title,
		&project.Description,
		&project.Data,
		&project.CreatorID,
		&project.CreatorUsername,
		&project.LikesCount,
		&project.FeaturedUntil,
		&project.CreatedAt,
		&project.LastEditedAt,
		&project.IsPublic,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, services.ErrRecordNotFound
		}
		return nil, err
	}

	return &project, nil
}

// GetUserProjects retrieves projects for a given user profile.
// It returns all projects if the requester is the owner, otherwise it only returns public projects.
func (s ProjectService) GetUserProjects(profileUserID, requestingUserID uuid.UUID) ([]data.Project, error) {
	query := `
		SELECT p.id, p.title, p.description, p.data, p.creator_id, u.username, p.likes_count, p.featured_until, p.created_at, p.last_edited_at, p.is_public
		FROM projects p
		JOIN users u ON p.creator_id = u.id
		WHERE p.creator_id = $1`

	args := []interface{}{profileUserID}

	// If the requester is not the owner of the projects, only show public ones.
	if profileUserID != requestingUserID {
		query += " AND p.is_public = TRUE"
	}

	query += " ORDER BY p.last_edited_at DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return []data.Project{}, err
	}
	defer rows.Close()

	projects := make([]data.Project, 0)
	for rows.Next() {
		var project data.Project
		if err := rows.Scan(
			&project.ID,
			&project.Title,
			&project.Description,
			&project.Data,
			&project.CreatorID,
			&project.CreatorUsername,
			&project.LikesCount,
			&project.FeaturedUntil,
			&project.CreatedAt,
			&project.LastEditedAt,
			&project.IsPublic,
		); err != nil {
			return []data.Project{}, err
		}
		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		return []data.Project{}, err
	}

	return projects, nil
}

// GetFeaturedProjects retrieves a paginated list of featured projects.
func (s ProjectService) GetFeaturedProjects(limit, page int) ([]data.Project, error) {
	offset := (page - 1) * limit

	query := `
		SELECT p.id, p.title, p.description, p.data, p.creator_id, u.username, p.likes_count, p.featured_until, p.created_at, p.last_edited_at, p.is_public
		FROM projects p
		JOIN users u ON p.creator_id = u.id
		WHERE p.featured_until IS NOT NULL AND p.featured_until > NOW() AND p.is_public = TRUE
		ORDER BY p.featured_until DESC, p.likes_count DESC
		LIMIT $1 OFFSET $2`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]data.Project, 0)
	for rows.Next() {
		var project data.Project
		if err := rows.Scan(
			&project.ID,
			&project.Title,
			&project.Description,
			&project.Data,
			&project.CreatorID,
			&project.CreatorUsername,
			&project.LikesCount,
			&project.FeaturedUntil,
			&project.CreatedAt,
			&project.LastEditedAt,
			&project.IsPublic,
		); err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

// GetLikedProjects retrieves all projects liked by a specific user.
func (s ProjectService) GetLikedProjects(userID uuid.UUID) ([]data.Project, error) {
	query := `
		SELECT p.id, p.title, p.description, p.data, p.creator_id, u.username, p.likes_count, p.featured_until, p.created_at, p.last_edited_at, p.is_public
		FROM projects p
		JOIN users u ON p.creator_id = u.id
		JOIN project_likes pl ON p.id = pl.project_id
		WHERE pl.user_id = $1 AND p.is_public = TRUE
		ORDER BY pl.created_at DESC`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]data.Project, 0)
	for rows.Next() {
		var project data.Project
		if err := rows.Scan(
			&project.ID,
			&project.Title,
			&project.Description,
			&project.Data,
			&project.CreatorID,
			&project.CreatorUsername,
			&project.LikesCount,
			&project.FeaturedUntil,
			&project.CreatedAt,
			&project.LastEditedAt,
			&project.IsPublic,
		); err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

// LikeProject adds a like from a user to a project and increments the project's like counter.
func (s ProjectService) LikeProject(projectID, userID uuid.UUID) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := "INSERT INTO project_likes (project_id, user_id) VALUES ($1, $2) ON CONFLICT (project_id, user_id) DO NOTHING"
	res, err := tx.Exec(query, projectID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return services.ErrRecordNotFound
	}

	if rowsAffected > 0 {
		query = "UPDATE projects SET likes_count = likes_count + 1 WHERE id = $1"
		_, err = tx.Exec(query, projectID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UnlikeProject removes a like from a user on a project and decrements the project's like counter.
func (s ProjectService) UnlikeProject(projectID, userID uuid.UUID) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec("DELETE FROM project_likes WHERE project_id = $1 AND user_id = $2", projectID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return services.ErrRecordNotFound
	}

	if rowsAffected > 0 {
		_, err = tx.Exec("UPDATE projects SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", projectID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UpdateProject updates the details of a specific project.
func (s ProjectService) UpdateProject(p data.ProjectUpdate) (*data.Project, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var setValues []string
	var args []interface{}
	argId := 1

	if p.Title != nil {
		setValues = append(setValues, fmt.Sprintf("title = $%d", argId))
		args = append(args, *p.Title)
		argId++
	}
	if p.Description != nil {
		setValues = append(setValues, fmt.Sprintf("description = $%d", argId))
		args = append(args, *p.Description)
		argId++
	}
	if p.IsPublic != nil {
		setValues = append(setValues, fmt.Sprintf("is_public = $%d", argId))
		args = append(args, *p.IsPublic)
		argId++
	}
	if p.Data != nil {
		setValues = append(setValues, fmt.Sprintf("data = $%d", argId))
		args = append(args, p.Data)
		argId++
	}

	if len(setValues) == 0 {
		return nil, services.ErrNoFields
	}

	// Update the last_edited_at timestamp on any update
	setValues = append(setValues, "last_edited_at = NOW()")

	query := fmt.Sprintf("UPDATE projects SET %s WHERE id = $%d RETURNING id, title, description, data, creator_id, (SELECT username FROM users WHERE id = creator_id), likes_count, featured_until, created_at, last_edited_at, is_public", strings.Join(setValues, ", "), argId)
	args = append(args, p.ID)

	var project data.Project
	err = tx.QueryRow(query, args...).Scan(
		&project.ID,
		&project.Title,
		&project.Description,
		&project.Data,
		&project.CreatorID,
		&project.CreatorUsername,
		&project.LikesCount,
		&project.FeaturedUntil,
		&project.CreatedAt,
		&project.LastEditedAt,
		&project.IsPublic,
	)

	fmt.Println(project.LastEditedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, services.ErrRecordNotFound
		}
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &project, nil
}

// DeleteProject deletes a project from the database.
func (s ProjectService) DeleteProject(projectID uuid.UUID) error {
	res, err := s.db.Exec("DELETE FROM projects WHERE id = $1", projectID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return services.ErrRecordNotFound
	}

	return nil
}

// GetPublicProjects retrieves a paginated and filtered list of public projects.
func (s ProjectService) GetPublicProjects(filters data.ProjectFilter) ([]data.Project, int, error) {
	offset := (filters.Page - 1) * filters.Limit

	baseQuery := `
        FROM projects p
        JOIN users u ON p.creator_id = u.id
    `

	whereClause := []string{"p.is_public = TRUE"}
	args := []interface{}{}

	// Filter by search term (partial match in project title and creator username)
	if filters.SearchTerm != "" {
		whereClause = append(whereClause, "(p.title ILIKE $"+fmt.Sprint(len(args)+1)+" OR u.username ILIKE $"+fmt.Sprint(len(args)+2)+")")
		searchTerm := "%" + filters.SearchTerm + "%"
		args = append(args, searchTerm, searchTerm)
	}

	// Construct the final WHERE clause
	where := "WHERE " + strings.Join(whereClause, " AND ")

	// Count total matching projects
	countQuery := "SELECT COUNT(*) " + baseQuery + where
	var total int
	err := s.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
        SELECT p.id, p.title, p.description, p.data, p.creator_id, u.username, p.likes_count, p.featured_until, p.created_at, p.last_edited_at, p.is_public
    ` + baseQuery + where + `
        ORDER BY p.` + filters.SortField + ` ` + filters.SortOrder + `
        LIMIT $` + fmt.Sprint(len(args)+1) + ` OFFSET $` + fmt.Sprint(len(args)+2)

	args = append(args, filters.Limit, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []data.Project
	for rows.Next() {
		var project data.Project
		if err := rows.Scan(
			&project.ID,
			&project.Title,
			&project.Description,
			&project.Data,
			&project.CreatorID,
			&project.CreatorUsername,
			&project.LikesCount,
			&project.FeaturedUntil,
			&project.CreatedAt,
			&project.LastEditedAt,
			&project.IsPublic,
		); err != nil {
			return nil, 0, err
		}
		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

// IsOwner checks to see if a user is the creator of a project.
func (s ProjectService) IsOwner(projectID, userID uuid.UUID) (bool, error) {
	query := "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND creator_id = $2)"
	var exists bool
	err := s.db.QueryRow(query, projectID, userID).Scan(&exists)
	return exists, err
}
