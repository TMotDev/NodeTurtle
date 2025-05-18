package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/mail"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"
	"NodeTurtleAPI/internal/utils"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// TokenHandler handles HTTP requests related to user tokens.
type TokenHandler struct {
	userService  users.IUserService
	tokenService tokens.ITokenService
	mailService  mail.IMailService
}

// NewTokenHandler creates a new TokenHandler with the provided user, token, and mail services.
func NewTokenHandler(userService users.IUserService, tokenService tokens.ITokenService, mailService mail.IMailService) TokenHandler {
	return TokenHandler{
		userService:  userService,
		tokenService: tokenService,
		mailService:  mailService,
	}
}

// RequestActivationToken handles the HTTP request for sending an account activation token to a user's email address.
// It expects a JSON payload with an "email" field, validates the input, checks if the user exists and is not already activated,
// generates a new activation token, sends an activation email asynchronously, and returns a success response.
func (h *TokenHandler) RequestActivationToken(c echo.Context) error {
	var payload struct {
		Email string `json:"email" validate:"required,email"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.GetUserByEmail(payload.Email)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "No matching email address found")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
	}

	if user.IsActivated {
		return echo.NewHTTPError(http.StatusConflict, "Account is already activated")
	}

	activationToken, err := h.tokenService.New(user.ID, 24*time.Hour, data.ScopeUserActivation)
	if err != nil {
		c.Logger().Errorf("Internal activation token creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create Activation token")
	}

	activationLink := fmt.Sprintf("http://website.com/activate/%s", activationToken.Plaintext)
	emailData := map[string]interface{}{
		"Username":       user.Username,
		"ActivationLink": activationLink,
	}
	go h.mailService.SendEmail(user.Email, "Activate Your Account", "activation", emailData)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Account activation request successfully. Please check your email to activate your account.",
	})
}

// ActivateAccount handles account activation via email token.
// It validates the activation token, marks the user as activated, and removes the token.
// Returns an error if the token is invalid or expired, or if activation fails.
func (h *TokenHandler) ActivateAccount(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid reset token")
	}

	user, err := h.userService.GetForToken(data.ScopeUserActivation, token)

	if err != nil {
		if errors.Is(err, services.ErrRecordNotFound) {
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err)
		}

		if errors.Is(err, services.ErrAccountSuspended) {
			return echo.NewHTTPError(http.StatusForbidden, err)
		}

		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
	}

	if err := h.userService.UpdateUser(user.ID, data.UserUpdate{Activated: utils.Ptr(true)}); err != nil {
		if errors.Is(err, services.ErrEditConflict) {
			return echo.NewHTTPError(http.StatusConflict, "Edit conflict")
		}
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	if err := h.tokenService.DeleteAllForUser(data.ScopeUserActivation, user.ID); err != nil {
		c.Logger().Errorf("Internal activation token deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete activation token")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Account activated successfully. You can now login.",
	})
}

// RequestPasswordReset handles requests to reset a forgotten password.
// It validates the email, creates a reset token, and sends a reset link via email.
// Returns an error if the email is invalid, if the account is not activated,
// or if the reset process fails.
func (h *TokenHandler) RequestPasswordReset(c echo.Context) error {
	var payload struct {
		Email string `json:"email" validate:"required,email"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.GetUserByEmail(payload.Email)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid email address")
		}
		c.Logger().Errorf("Internal user retrieval error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
	}

	if !user.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	resetToken, err := h.tokenService.New(user.ID, 24*time.Hour, data.ScopePasswordReset)
	if err != nil {
		c.Logger().Errorf("Internal reset token creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create reset token")
	}

	resetLink := fmt.Sprintf("http://website.com/reset-password/%s", resetToken.Plaintext)
	emailData := map[string]interface{}{
		"Username":  user.Username,
		"ResetLink": resetLink,
	}

	go h.mailService.SendEmail(user.Email, "Reset Your Password", "reset", emailData)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "If an account with that email exists, a password reset link has been sent.",
	})
}

// ResetPassword handles password reset requests using a reset token.
// It validates the token and new password, updates the user's password,
// and invalidates all reset tokens for the user.
// Returns an error if the token is invalid or expired, if the account is not activated,
// or if the password update fails.
func (h *TokenHandler) ResetPassword(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid reset token")
	}

	var payload struct {
		Password string `json:"password" validate:"required,min=8"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.GetForToken(data.ScopePasswordReset, token)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRecordNotFound):
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err)

		default:
			c.Logger().Errorf("Internal user retrieval error %v", err)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve data")
		}
	}

	if !user.IsActivated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	if err := h.userService.ResetPassword(token, payload.Password); err != nil {
		if errors.Is(err, services.ErrEditConflict) {
			return echo.NewHTTPError(http.StatusConflict, "Edit conflict")
		}
		c.Logger().Errorf("Internal user update error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	// delete all password reset tokens for the user
	if err := h.tokenService.DeleteAllForUser(data.ScopePasswordReset, user.ID); err != nil {
		c.Logger().Errorf("Internal password reset deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password has been reset successfully. You can now login with your new password.",
	})
}
