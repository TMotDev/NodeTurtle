package handlers

import (
	"errors"
	"net/http"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// UserHandler handles HTTP requests related to user operations.
type UserHandler struct {
	userService  users.IUserService
	authService  auth.IAuthService
	tokenService tokens.ITokenService
}

// NewUserHandler creates a new UserHandler with the provided services.
func NewUserHandler(userService users.IUserService, authService auth.IAuthService, tokenService tokens.ITokenService) UserHandler {
	return UserHandler{
		userService:  userService,
		authService:  authService,
		tokenService: tokenService,
	}
}

// GetCurrentUser handles the request to fetch the currently authenticated user's information.
// It returns the user data or an error if the user is not authenticated or not found.
func (h *UserHandler) GetCurrentUser(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)

	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	return c.JSON(http.StatusOK, user)
}

// CheckEmail handles checking if provided email is valid and is taken or not
func (h *UserHandler) CheckEmail(c echo.Context) error {
	type EmailParam struct {
		Email string `validate:"required,email"`
	}
	param := EmailParam{Email: c.Param("email")}

	if err := c.Validate(&param); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	exists, err := h.userService.EmailExists(param.Email)
	if err != nil && err != services.ErrUserNotFound {
		c.Logger().Errorf("Internal email validation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to validate email")
	}

	return c.JSON(http.StatusOK, map[string]bool{"exists": exists})
}

// CheckEmail handles checking if provided username is valid and is taken or not
func (h *UserHandler) CheckUsername(c echo.Context) error {
	type UsernameParam struct {
		Username string `validate:"required,min=3,max=20,alphanum"`
	}
	param := UsernameParam{Username: c.Param("username")}

	if err := c.Validate(&param); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	exists, err := h.userService.UsernameExists(param.Username)
	if err != nil && err != services.ErrUserNotFound {
		c.Logger().Errorf("Internal username validation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to validate username")
	}

	return c.JSON(http.StatusOK, map[string]bool{"exists": exists})
}

// UpdateCurrentUser handles the request to update the currently authenticated user's information.
// It validates the updates, ensures the user is activated, and applies the changes.
// Returns an error if the user is not authenticated, not found, not activated, or if the update fails.
func (h *UserHandler) UpdateCurrentUser(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user fetch error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	if !user.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	var payload struct {
		data.UserUpdate
		Password string `json:"password" validate:"required"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Password revalidation
	ok, err = user.Password.Matches(payload.Password)
	if err != nil {
		c.Logger().Errorf("Internal password matching error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to verify password")
	}
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Password is incorrect")
	}

	if payload.Username == nil && payload.Email == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "No updates provided")
	}

	// Check if email is taken
	if payload.Email != nil {
		existingUser, err := h.userService.GetUserByEmail(*payload.Email)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user update error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return echo.NewHTTPError(http.StatusConflict, "Email already in use")
		}
	}

	// Check if username is taken
	if payload.Username != nil {
		existingUser, err := h.userService.GetUserByUsername(*payload.Username)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user retrieval error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return echo.NewHTTPError(http.StatusConflict, "Username already in use")
		}
	}

	if err := h.userService.UpdateUser(user.ID, payload.UserUpdate); err != nil {
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User updated successfully",
	})
}

// ChangePassword handles the request to change a user's password.
// It verifies the old password, updates to the new one, and invalidates all refresh tokens.
// Returns an error if the user is not authenticated, not found, not activated,
// if the old password is incorrect, or if the change fails.
func (h *UserHandler) ChangePassword(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	user, err := h.userService.GetUserByID(contextUser.ID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	if !user.IsActivated {
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
		if errors.Is(err, services.ErrInvalidCredentials) {
			return echo.NewHTTPError(http.StatusBadRequest, "Current password is incorrect")
		}
		c.Logger().Errorf("Internal password change error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to change password")
	}

	if err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, contextUser.ID); err != nil {
		c.Logger().Errorf("Internal token deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to change password")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}

// ListUsers handles the request to retrieve a paginated list of all users.
//
// uses data.UserFilter for filtering options
func (h *UserHandler) ListUsers(c echo.Context) error {
	filters := data.DefaultUserFilter()

	if err := c.Bind(&filters); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&filters); err != nil {
		c.Logger().Errorf("Filter validation error: %v", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	users, total, err := h.userService.ListUsers(filters)
	if err != nil {
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve users")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"users": users,
		"meta": map[string]interface{}{
			"total": total,
			"page":  filters.Page,
		},
	})
}

// GetUser handles the request to fetch a specific user by ID.
// It parses the user ID from the URL parameter and returns the user data.
// Returns an error if the ID is invalid or if the user is not found.
func (h *UserHandler) GetUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	user, err := h.userService.GetUserByID(id)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user")
	}

	return c.JSON(http.StatusOK, user)
}

// UpdateUser handles the request to update a specific user's information.
// It validates the provided updates and applies them to the specified user.
// Returns an error if the user ID is invalid, if the user is not found,
// if no valid updates are provided, or if the update fails.
func (h *UserHandler) UpdateUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	user, err := h.userService.GetUserByID(id)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
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

	// Check if email is taken
	if updates.Email != nil {
		existingUser, err := h.userService.GetUserByEmail(*updates.Email)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user retrieval error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return echo.NewHTTPError(http.StatusConflict, "Email already in use")
		}
	}

	// Check if username is taken
	if updates.Username != nil {
		existingUser, err := h.userService.GetUserByUsername(*updates.Username)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user retrieval error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return echo.NewHTTPError(http.StatusConflict, "Username already in use")
		}
	}

	if err := h.userService.UpdateUser(user.ID, updates); err != nil {
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User updated successfully",
	})
}

// DeleteUser handles the request to remove a user from the system.
// It deletes the user identified by the ID in the URL parameter.
// Returns an error if the user ID is invalid, if the user is not found,
// or if the deletion fails.
func (h *UserHandler) DeleteUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	if err := h.userService.DeleteUser(id); err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User deleted successfully",
	})
}
