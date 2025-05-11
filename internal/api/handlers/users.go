package handlers

import (
	"net/http"
	"strconv"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	userService  users.IUserService
	authService  auth.IAuthService
	tokenService tokens.ITokenService
}

func NewUserHandler(userService users.IUserService, authService auth.IAuthService, tokenService tokens.ITokenService) UserHandler {
	return UserHandler{
		userService:  userService,
		authService:  authService,
		tokenService: tokenService,
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

	if !user.Activated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	var updates data.UserUpdate
	if err := c.Bind(&updates); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&updates); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if updates.Username == nil && updates.Email == nil {
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

	if !user.Activated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	var payload struct {
		OldPassword string `json:"old_password" validate:"required"`
		NewPassword string `json:"new_password" validate:"required,min=8"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.userService.ChangePassword(user.ID, payload.OldPassword, payload.NewPassword); err != nil {
		if err == services.ErrInvalidCredentials {
			return echo.NewHTTPError(http.StatusBadRequest, "Current password is incorrect")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to change password")
	}

	err = h.tokenService.DeleteAllForUser(data.ScopeRefresh, contextUser.ID)
	if err != nil {
		c.Logger().Errorf("Failed to invalidate refresh tokens: %v", err)
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
	id, err := uuid.Parse(idStr)
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
	id, err := uuid.Parse(idStr)
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

	var updates data.UserUpdate

	if err := c.Bind(&updates); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&updates); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if updates.Username == nil && updates.Email == nil && updates.Activated == nil && updates.Role == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "No updates provided")
	}

	err = h.userService.UpdateUser(user.ID, updates)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User updated successfully",
	})
}

func (h *UserHandler) DeleteUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
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
