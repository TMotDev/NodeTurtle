package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"time"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/mail"
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
	banService   services.IBanService
	mailService  mail.IMailService
}

// NewUserHandler creates a new UserHandler with the provided services.
func NewUserHandler(userService users.IUserService, authService auth.IAuthService, tokenService tokens.ITokenService, banService services.IBanService, mailService mail.IMailService) UserHandler {
	return UserHandler{
		userService:  userService,
		authService:  authService,
		tokenService: tokenService,
		banService:   banService,
		mailService:  mailService,
	}
}

// GetCurrent handles the request to fetch the currently authenticated user's information.
// It returns the user data or an error if the user is not authenticated or not found.
func (h *UserHandler) GetCurrent(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	return c.JSON(http.StatusOK, contextUser)
}

// CheckEmail handles checking if provided email is valid and is taken or not
func (h *UserHandler) CheckEmail(c echo.Context) error {
	type EmailParam struct {
		Email string `validate:"required,email"`
	}
	rawEmail := c.Param("email")
	email, err := url.PathUnescape(rawEmail)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid email encoding")
	}

	param := EmailParam{Email: email}

	if err := c.Validate(&param); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
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

	rawUsername := c.Param("username")
	username, err := url.PathUnescape(rawUsername)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid username encoding")
	}

	param := UsernameParam{Username: username}
	if err := c.Validate(&param); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	exists, err := h.userService.UsernameExists(param.Username)
	if err != nil && err != services.ErrUserNotFound {
		c.Logger().Errorf("Internal username validation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to validate username")
	}

	return c.JSON(http.StatusOK, map[string]bool{"exists": exists})
}

// UpdateCurrent handles the request to update the currently authenticated user's information.
// It validates the updates, ensures the user is activated, and applies the changes.
// Returns an error if the user is not authenticated, not found, not activated, or if the update fails.
func (h *UserHandler) UpdateCurrent(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	if !contextUser.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	var payload struct {
		Username *string `json:"username" validate:"omitempty,min=3,max=20,alphanum"`
		Email    *string `json:"email" validate:"omitempty,email"`
		Password string  `json:"password" validate:"required"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	// Password revalidation
	ok, err := contextUser.Password.Matches(payload.Password)
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

	var updates data.UserUpdate

	// Check if email is taken
	if payload.Email != nil {
		existingUser, err := h.userService.GetUserByEmail(*payload.Email)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user update error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != contextUser.ID {
			return echo.NewHTTPError(http.StatusConflict, "Email already in use")
		}
		updates.Email = payload.Email
	}

	// Check if username is taken
	if payload.Username != nil {
		existingUser, err := h.userService.GetUserByUsername(*payload.Username)
		if err != nil && err != services.ErrUserNotFound {
			c.Logger().Errorf("Internal user retrieval error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
		if existingUser != nil && existingUser.ID != contextUser.ID {
			return echo.NewHTTPError(http.StatusConflict, "Username already in use")
		}
		updates.Username = payload.Username
	}

	user, err := h.userService.UpdateUser(contextUser.ID, updates)

	if err != nil {
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"username": user.Username,
		"email":    user.Email,
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

	if !contextUser.IsActivated {
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
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	if err := h.userService.ChangePassword(contextUser.ID, payload.OldPassword, payload.NewPassword); err != nil {
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

	return c.NoContent(http.StatusNoContent)
}

// List handles the request to retrieve a paginated list of all users.
// binds payload to data.UserFilter for filtering options
func (h *UserHandler) List(c echo.Context) error {
	filters := data.DefaultUserFilter()

	if err := c.Bind(&filters); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&filters); err != nil {
		c.Logger().Errorf("Filter validation error: %v", err)
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
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

// Get handles the request to fetch a specific user by ID.
// It parses the user ID from the URL parameter and returns the user data.
// Returns an error if the ID is invalid or if the user is not found.
func (h *UserHandler) Get(c echo.Context) error {
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

// Update handles the request to update a specific user's information.
// It validates the provided updates and applies them to the specified user.
// Returns an error if the user ID is invalid, if the user is not found,
// if no valid updates are provided, or if the update fails.
func (h *UserHandler) Update(c echo.Context) error {
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
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
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

	user, err = h.userService.UpdateUser(user.ID, updates)

	if err != nil {
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"username":  user.Username,
		"email":     user.Email,
		"activated": user.IsActivated,
		"role":      user.Role,
	})
}

// Delete handles the request to remove a user from the system.
// It deletes the user identified by the ID in the URL parameter.
// Returns an error if the user ID is invalid, if the user is not found,
// or if the deletion fails.
func (h *UserHandler) Delete(c echo.Context) error {
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

	return c.NoContent(http.StatusNoContent)
}

// Ban handles the request to ban/deactivate specific user account.
// It bans the user identified by the ID for N amount of time (in hours).
// Returns an error if the user ID is invalid, if the user is not found,
// or if the ban fails.
func (h *UserHandler) Ban(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var payload struct {
		Reason   string    `json:"reason" validate:"required,min=1"`
		Duration int       `json:"duration" validate:"required,min=1"`
		UserID   uuid.UUID `json:"user_id" validate:"required"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	userToBan, err := h.userService.GetUserByID(payload.UserID)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
	}

	ban, err := h.banService.BanUser(payload.UserID, contextUser.ID, time.Now().UTC().Add(time.Duration(payload.Duration)*time.Hour), payload.Reason)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user ban error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to ban a user")
	}

	// invalidate all refresh tokens for banned user
	if err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, payload.UserID); err != nil {
		c.Logger().Errorf("Internal token deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to ban a user")
	}

	// Send ban notification email
	emailData := map[string]string{
		"Username":  userToBan.Username,
		"Reason":    ban.Reason,
		"BannedAt":  ban.BannedAt.Format("January 2, 2006 at 3:04 PM MST"),
		"ExpiresAt": ban.ExpiresAt.Format("January 2, 2006 at 3:04 PM MST"),
	}
	go h.mailService.SendEmail(userToBan.Email, "Account Suspended - Turtle Graphics", "ban", emailData)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "User banned successfully",
		"ban": map[string]interface{}{
			"expiresUntil": ban.ExpiresAt,
			"reason":       ban.Reason,
			"bannedAt":     ban.BannedAt,
		},
	})
}

func (h *UserHandler) Unban(c echo.Context) error {
	idStr := c.Param("userID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	if err := h.banService.UnbanUser(id); err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		c.Logger().Errorf("Internal user unban error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to unban a user")
	}

	return c.NoContent(http.StatusOK)
}

func (h *UserHandler) Deactivate(c echo.Context) error {

	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid reset token")
	}

	user, err := h.userService.GetForToken(data.ScopeDeactivate, token)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Token or user not found")
	}

	_, err = h.banService.BanUser(user.ID, user.ID, time.Now().Add(87600*time.Hour), "Self-deactivation")
	if err != nil {
		c.Logger().Errorf("Internal self-deactivation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to deactivate account")
	}

	if err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, user.ID); err != nil {
		c.Logger().Errorf("Internal token deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to deactivate account")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Account has been deactivated",
	})
}
