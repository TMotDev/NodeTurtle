package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/projects"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ProjectHandler handles HTTP requests related to project operations.
type ProjectHandler struct {
	projectService projects.IProjectService
}

// NewProjectHandler creates a new UserHandler with the provided services.
func NewProjectHandler(projectService projects.IProjectService) ProjectHandler {
	return ProjectHandler{
		projectService: projectService,
	}
}

// Get handles the request to retrieve a single project.
func (h *ProjectHandler) Get(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	idStr := c.Param("id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	project, err := h.projectService.GetProject(projectID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve project")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"project": project,
	})
}

// GetFeatured handles the request to retrieve a list of featured projects.
// It supports pagination through query parameters.
func (h *ProjectHandler) GetFeatured(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	page, _ := strconv.Atoi(c.QueryParam("page"))

	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}

	projects, err := h.projectService.GetFeaturedProjects(limit, page)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve featured projects")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"projects": projects,
	})
}

// Create handles the request to create a new project.
// If no project data is provided, the handler creates it
func (h *ProjectHandler) Create(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	var payload struct {
		Title       string          `json:"title" validate:"required,min=3,max=100"`
		Description string          `json:"description" validate:"max=5000"`
		Data        json.RawMessage `json:"data,omitempty"`
		IsPublic    bool            `json:"is_public"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	var flowData json.RawMessage
	if payload.Data != nil {
		flowData = payload.Data
	} else {
		flowData = json.RawMessage([]byte("{}"))
	}

	p := data.ProjectCreate{
		Title:       payload.Title,
		CreatorID:   contextUser.ID,
		Description: payload.Description,
		Data:        flowData,
		IsPublic:    payload.IsPublic,
	}

	project, err := h.projectService.CreateProject(p)
	if err != nil {
		c.Logger().Errorf("Internal project creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create project")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"project": project,
	})
}

// Delete handles the request to delete a project.
// To delete a project user must be logged in, activated and owner of the project.
func (h *ProjectHandler) Delete(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	idStr := c.Param("id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	isOwner, err := h.projectService.IsOwner(projectID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete project")
	}

	if !isOwner {
		return echo.NewHTTPError(http.StatusForbidden, "You do not have permission to delete this project")
	}

	err = h.projectService.DeleteProject(projectID)

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete project")
	}

	return c.NoContent(http.StatusNoContent)
}

// Update handles the request to update a project.
// Update payload includes title, description, public status and data.
// If data is not provided, empty json object {} is created.
func (h *ProjectHandler) Update(c echo.Context) error {
	// user validation
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	// param validation
	idStr := c.Param("id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	// project ownership check
	isOwner, err := h.projectService.IsOwner(projectID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update project")
	}
	if !isOwner {
		return echo.NewHTTPError(http.StatusForbidden, "You do not have permission to update this project")
	}

	var payload struct {
		Title       *string         `json:"title,omitempty" validate:"omitempty,min=3,max=100"`
		Description *string         `json:"description,omitempty" validate:"omitempty,max=5000"`
		IsPublic    *bool           `json:"is_public,omitempty"`
		Data        json.RawMessage `json:"data,omitempty"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	updates := data.ProjectUpdate{
		ID:          projectID,
		Title:       payload.Title,
		Description: payload.Description,
		IsPublic:    payload.IsPublic,
		Data:        payload.Data,
	}

	updatedProject, err := h.projectService.UpdateProject(updates)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update project")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"project": updatedProject,
	})
}

// Like handles the request to like a project.
func (h *ProjectHandler) Like(c echo.Context) error {
	// user validation
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	// param validation
	idStr := c.Param("id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	// project ownership check, owners cannot like their own projects
	isOwner, err := h.projectService.IsOwner(projectID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to like a project")
	}
	if isOwner {
		return echo.NewHTTPError(http.StatusForbidden, "Project owners cannot like their own projects")
	}

	err = h.projectService.LikeProject(projectID, contextUser.ID)

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to like a project")
	}

	return c.NoContent(http.StatusCreated)
}

func (h *ProjectHandler) Unlike(c echo.Context) error {
	// user validation
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	// param validation
	idStr := c.Param("id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	// project ownership check, owners cannot like and unlike their own projects
	isOwner, err := h.projectService.IsOwner(projectID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to unlike a project")
	}
	if isOwner {
		return echo.NewHTTPError(http.StatusForbidden, "Project owners cannot unlike their own projects")
	}

	err = h.projectService.UnlikeProject(projectID, contextUser.ID)

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to unlike a project")
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *ProjectHandler) GetUserProjects(c echo.Context) error {
	// user validation
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	// param validation
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	projects, err := h.projectService.GetUserProjects(userID, contextUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user projects")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"projects": projects,
	})
}

func (h *ProjectHandler) GetLikedProjects(c echo.Context) error {
	// user validation
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	// param validation
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	projects, err := h.projectService.GetLikedProjects(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get liked projects")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"projects": projects,
	})
}

// GetPublic handles the request to retrieve a paginated and filtered list of public projects.
func (h *ProjectHandler) GetPublic(c echo.Context) error {
	filters := data.DefaultProjectFilter()

	if err := c.Bind(&filters); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&filters); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	projects, total, err := h.projectService.GetPublicProjects(filters)
	if err != nil {
		c.Logger().Errorf("Internal project retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve public projects")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"projects": projects,
		"meta": map[string]interface{}{
			"total": total,
			"page":  filters.Page,
			"limit": filters.Limit,
		},
	})
}
