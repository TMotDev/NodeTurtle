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

	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	authService  auth.IAuthService
	userService  users.IUserService
	tokenService tokens.ITokenService
	mailService  mail.IMailService
}

func NewAuthHandler(authService auth.IAuthService, userService users.IUserService, tokenService tokens.ITokenService, mailService mail.IMailService) AuthHandler {
	return AuthHandler{
		authService:  authService,
		userService:  userService,
		tokenService: tokenService,
		mailService:  mailService,
	}
}

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

	return c.JSON(http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":       user.ID,
			"email":    user.Email,
			"username": user.Username,
			"role":     user.Role.Name,
		},
	})
}

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

	err = h.userService.UpdateUser(user.ID, map[string]interface{}{
		"activated": true,
	})

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

	// get user associated with the token
	user, err := h.userService.GetForToken(data.ScopePasswordReset, token)

	if err != nil {
		switch {
		case errors.Is(err, services.ErrRecordNotFound):
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err)

		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve data")
		}
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
