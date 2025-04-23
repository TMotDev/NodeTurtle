package handlers

import (
	"net/http"
	"strconv"

	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/users"

	"github.com/labstack/echo/v4"
)

// UserHandler handles user-related requests
type UserHandler struct {
	userService *users.Service
	authService *auth.Service
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *users.Service, authService *auth.Service) *UserHandler {
	return &UserHandler{
		userService: userService,
		authService: authService,
	}
}

// GetCurrentUser returns the current authenticated user
// @Summary Get current user
// @Description Get information about the currently logged in user
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User "User information"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 404 {object} echo.HTTPError "User not found"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /users/me [get]
func (h *UserHandler) GetCurrentUser(c echo.Context) error {
	user, ok := c.Get("user").(*models.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	fullUser, err := h.userService.GetUserByID(user.ID)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	return c.JSON(http.StatusOK, fullUser)
}

// UpdateCurrentUser updates the current authenticated user
// @Summary Update current user
// @Description Update profile information for the currently logged in user
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param userData body object{username=string,email=string} true "User Data"
// @Success 200 {object} map[string]string "User updated successfully"
// @Failure 400 {object} echo.HTTPError "Invalid request"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /users/me [put]
func (h *UserHandler) UpdateCurrentUser(c echo.Context) error {
	user, ok := c.Get("user").(*models.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var updateData struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	if err := c.Bind(&updateData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	updates := make(map[string]interface{})
	if updateData.Username != "" {
		updates["username"] = updateData.Username
	}
	if updateData.Email != "" {
		updates["email"] = updateData.Email
	}

	if len(updates) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "No updates provided")
	}

	if err := h.userService.UpdateUser(user.ID, updates); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User updated successfully",
	})
}

// ChangePassword changes the password for the current authenticated user
// @Summary Change password
// @Description Change password for the currently logged in user
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param passwords body models.PasswordChange true "Password Change"
// @Success 200 {object} map[string]string "Password changed successfully"
// @Failure 400 {object} echo.HTTPError "Invalid request or incorrect current password"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /users/me/password [post]
func (h *UserHandler) ChangePassword(c echo.Context) error {
	user, ok := c.Get("user").(*models.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var passwordData models.PasswordChange
	if err := c.Bind(&passwordData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&passwordData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.userService.ChangePassword(user.ID, passwordData.OldPassword, passwordData.NewPassword); err != nil {
		if err == services.ErrInvalidCredentials {
			return echo.NewHTTPError(http.StatusBadRequest, "Current password is incorrect")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to change password")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}

// ListUsers returns a list of all users (admin only)
// @Summary List all users
// @Description Get a paginated list of all users (admin only)
// @Tags admin,users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Results per page (default: 10)"
// @Success 200 {object} object{users=[]models.User,meta=object{total=int,page=int,limit=int}} "List of users with pagination metadata"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 403 {object} echo.HTTPError "Forbidden - Admin role required"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /admin/users [get]
func (h *UserHandler) ListUsers(c echo.Context) error {
	pageStr := c.QueryParam("page")
	limitStr := c.QueryParam("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	users, total, err := h.userService.ListUsers(page, limit)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve users")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"users": users,
		"meta": map[string]interface{}{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// GetUser returns a specific user by ID (admin only)
// @Summary Get user by ID
// @Description Get a specific user by their ID (admin only)
// @Tags admin,users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} models.User "User information"
// @Failure 400 {object} echo.HTTPError "Invalid user ID"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 403 {object} echo.HTTPError "Forbidden - Admin role required"
// @Failure 404 {object} echo.HTTPError "User not found"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /admin/users/{id} [get]
func (h *UserHandler) GetUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	user, err := h.userService.GetUserByID(id)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	return c.JSON(http.StatusOK, user)
}

// UpdateUser updates a specific user by ID (admin only)
// @Summary Update user
// @Description Update a specific user by their ID (admin only)
// @Tags admin,users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param userData body object{username=string,email=string,active=boolean,role_id=int} true "User Data"
// @Success 200 {object} map[string]string "User updated successfully"
// @Failure 400 {object} echo.HTTPError "Invalid request"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 403 {object} echo.HTTPError "Forbidden - Admin role required"
// @Failure 404 {object} echo.HTTPError "User not found"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /admin/users/{id} [put]
func (h *UserHandler) UpdateUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	var updateData struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Active   *bool  `json:"active"`
		RoleID   *int   `json:"role_id"`
	}

	if err := c.Bind(&updateData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	updates := make(map[string]interface{})
	if updateData.Username != "" {
		updates["username"] = updateData.Username
	}
	if updateData.Email != "" {
		updates["email"] = updateData.Email
	}
	if updateData.Active != nil {
		updates["active"] = *updateData.Active
	}
	if updateData.RoleID != nil {
		updates["role_id"] = *updateData.RoleID
	}

	if len(updates) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "No updates provided")
	}

	if err := h.userService.UpdateUser(id, updates); err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User updated successfully",
	})
}

// DeleteUser deletes a specific user by ID (admin only)
// @Summary Delete user
// @Description Delete a specific user by their ID (admin only)
// @Tags admin,users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} map[string]string "User deleted successfully"
// @Failure 400 {object} echo.HTTPError "Invalid user ID"
// @Failure 401 {object} echo.HTTPError "Unauthorized"
// @Failure 403 {object} echo.HTTPError "Forbidden - Admin role required"
// @Failure 404 {object} echo.HTTPError "User not found"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /admin/users/{id} [delete]
func (h *UserHandler) DeleteUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	if err := h.userService.DeleteUser(id); err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User deleted successfully",
	})
}
