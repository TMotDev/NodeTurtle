package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/mail"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"
	"NodeTurtleAPI/internal/utils"

	"github.com/labstack/echo/v4"
)

// AuthHandler handles HTTP requests related to authentication operations.
type AuthHandler struct {
	authService  auth.IAuthService
	userService  users.IUserService
	tokenService tokens.ITokenService
	mailService  mail.IMailService
}

// NewAuthHandler creates a new AuthHandler with the provided services.
func NewAuthHandler(authService auth.IAuthService, userService users.IUserService, tokenService tokens.ITokenService, mailService mail.IMailService) AuthHandler {
	return AuthHandler{
		authService:  authService,
		userService:  userService,
		tokenService: tokenService,
		mailService:  mailService,
	}
}

// Register handles the request to create a new user account.
// It validates registration data, creates the user, and sends an activation email.
// Returns an error if the registration data is invalid, if a user with the same
// email already exists, or if account creation fails.
func (h *AuthHandler) Register(c echo.Context) error {
	var registration data.UserRegistration
	if err := c.Bind(&registration); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&registration); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.CreateUser(registration)
	if err != nil {
		if err == services.ErrUserExists {
			return echo.NewHTTPError(http.StatusConflict, "User with this email already exists")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create user")
	}

	activationToken, err := h.tokenService.New(user.ID, 24*time.Hour, data.ScopeUserActivation)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create Activation token")
	}

	activationLink := fmt.Sprintf("http://website.com/activate/%s", activationToken.Plaintext)

	emailData := map[string]interface{}{
		"Username":       user.Username,
		"ActivationLink": activationLink,
	}

	go h.mailService.SendEmail(user.Email, "Activate Your Account", "activation", emailData)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "User registered successfully. Please check your email to activate your account.",
		"user": map[string]interface{}{
			"id":       user.ID,
			"email":    user.Email,
			"username": user.Username,
		},
	})
}

// Login handles user authentication requests.
// It validates login credentials, creates JWT and refresh tokens for successful logins.
// Returns an error if credentials are invalid, if the account is not activated,
// or if authentication fails.
func (h *AuthHandler) Login(c echo.Context) error {
	var login data.UserLogin
	if err := c.Bind(&login); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&login); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	token, user, err := h.authService.Login(login.Email, login.Password)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
		}
		if err == services.ErrInactiveAccount {
			return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to login")
	}

	err = h.tokenService.DeleteAllForUser(data.ScopeRefresh, user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete old refresh tokens")
	}

	refreshToken, err := h.tokenService.New(user.ID, (time.Hour * 168), data.ScopeRefresh)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create new refresh token")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"token":        token,
		"refreshToken": refreshToken.Plaintext,
	})
}

// ActivateAccount handles account activation via email token.
// It validates the activation token, marks the user as activated, and removes the token.
// Returns an error if the token is invalid or expired, or if activation fails.
func (h *AuthHandler) ActivateAccount(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid reset token")
	}

	user, err := h.userService.GetForToken(data.ScopeUserActivation, token)

	if err != nil {
		switch {
		case errors.Is(err, services.ErrRecordNotFound):
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err)

		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
		}
	}

	err = h.userService.UpdateUser(user.ID, data.UserUpdate{Activated: utils.Ptr(true)})

	if err != nil {
		switch {
		case errors.Is(err, services.ErrEditConflict):
			return echo.NewHTTPError(http.StatusConflict, "Edit conflict")
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
	}

	err = h.tokenService.DeleteAllForUser(data.ScopeUserActivation, user.ID)
	if err != nil {
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
func (h *AuthHandler) RequestPasswordReset(c echo.Context) error {
	var resetRequest data.PasswordReset
	if err := c.Bind(&resetRequest); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&resetRequest); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.GetUserByEmail(resetRequest.Email)
	if err != nil {
		if err == services.ErrUserNotFound {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid email address")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve user")
	}

	if !user.Activated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	resetToken, err := h.tokenService.New(user.ID, 24*time.Hour, data.ScopePasswordReset)
	if err != nil {
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
func (h *AuthHandler) ResetPassword(c echo.Context) error {
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
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve data")
		}
	}

	if !user.Activated {
		return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
	}

	err = h.userService.ResetPassword(token, payload.Password)

	if err != nil {
		switch {
		case errors.Is(err, services.ErrEditConflict):
			return echo.NewHTTPError(http.StatusConflict, "Edit conflict")
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
		}
	}

	// delete all password reset tokens for the user
	err = h.tokenService.DeleteAllForUser(data.ScopePasswordReset, user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete activation token")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password has been reset successfully. You can now login with your new password.",
	})
}

// RefreshToken handles requests to obtain a new JWT token using a refresh token.
// It validates the refresh token, creates a new JWT token, and issues a new refresh token.
// Returns an error if the refresh token is invalid or expired, or if token creation fails.
func (h *AuthHandler) RefreshToken(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var payload struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	user, err := h.userService.GetForToken(data.ScopeRefresh, payload.RefreshToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired refresh token")
	}

	if contextUser.ID != user.ID {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid refresh token")
	}

	h.tokenService.DeleteAllForUser(data.ScopeRefresh, user.ID)

	token, err := h.authService.CreateJWTToken(*user)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create new access token")
	}

	refreshToken, err := h.tokenService.New(user.ID, (time.Hour * 168), data.ScopeRefresh)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create new refresh token")
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"token":        token,
		"refreshToekn": refreshToken.Plaintext,
	})

}

// Logout handles user logout requests.
// It invalidates all refresh tokens for the authenticated user.
// Returns an error if the user is not authenticated or if token invalidation fails.
func (h *AuthHandler) Logout(c echo.Context) error {
	contextUser, ok := c.Get("user").(*data.User)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, contextUser.ID)
	if err != nil {
		c.Logger().Error("Failed to delete refresh tokens on user logout")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logged out successfully.",
	})
}
