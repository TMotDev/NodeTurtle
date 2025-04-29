package handlers

import (
	"net/http"
	"strconv"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/users"

	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	userService users.IUserService
	authService auth.IAuthService
}

func NewUserHandler(userService users.IUserService, authService auth.IAuthService) UserHandler {
	return UserHandler{
		userService: userService,
		authService: authService,
	}
}

func (h *UserHandler) GetCurrentUser(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)

	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	return c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateCurrentUser(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
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

func (h *UserHandler) ChangePassword(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	var passwordData data.PasswordChange
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

func (h *UserHandler) GetUser(c echo.Context) error {
	idStr := c.Param("id")

	id, err := strconv.ParseInt(idStr, 10, 64)
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

func (h *UserHandler) UpdateUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)

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

	var updateData struct {
		Username  string `json:"username"`
		Email     string `json:"email"`
		Activated *bool  `json:"activated"`
		RoleID    *int64 `json:"role_id"`
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
	if updateData.Activated != nil {
		updates["activated"] = *updateData.Activated
	}
	if updateData.RoleID != nil {
		updates["role_id"] = *updateData.RoleID
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
