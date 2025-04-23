package handlers

import (
	"net/http"

	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/users"

	"github.com/labstack/echo/v4"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	authService auth.IAuthService
	userService users.IUserService
}

func NewAuthHandler(authService auth.IAuthService, userService users.IUserService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userService: userService,
	}
}

// Register handles user registration
// @Summary Register a new user
// @Description Register a new user account with email verification
// @Tags auth
// @Accept json
// @Produce json
// @Param user body models.UserRegistration true "User Registration Details"
// @Success 201 {object} map[string]interface{} "User registered successfully"
// @Failure 400 {object} echo.HTTPError "Invalid request"
// @Failure 409 {object} echo.HTTPError "User already exists"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /register [post]
func (h *AuthHandler) Register(c echo.Context) error {
	var registration models.UserRegistration
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

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "User registered successfully. Please check your email to activate your account.",
		"user": map[string]interface{}{
			"id":       user.ID,
			"email":    user.Email,
			"username": user.Username,
		},
	})
}

// Login handles user login
// @Summary Login user
// @Description Authenticate a user and return JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body models.UserLogin true "Login Credentials"
// @Success 200 {object} map[string]interface{} "Login successful"
// @Failure 400 {object} echo.HTTPError "Invalid request"
// @Failure 401 {object} echo.HTTPError "Invalid credentials"
// @Failure 403 {object} echo.HTTPError "Account not activated"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /login [post]
func (h *AuthHandler) Login(c echo.Context) error {
	var login models.UserLogin
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

// ActivateAccount activates a user account using the activation token
// @Summary Activate user account
// @Description Activate a user account with the token sent via email
// @Tags auth
// @Accept json
// @Produce json
// @Param token path string true "Activation Token"
// @Success 200 {object} map[string]string "Account activated successfully"
// @Failure 400 {object} echo.HTTPError "Invalid token"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /activate/{token} [get]
func (h *AuthHandler) ActivateAccount(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid activation token")
	}

	if err := h.userService.ActivateUser(token); err != nil {
		if err == services.ErrInvalidToken {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid or expired activation token")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to activate account")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Account activated successfully. You can now login.",
	})
}

// RequestPasswordReset handles password reset requests
// @Summary Request password reset
// @Description Request a password reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param email body models.PasswordReset true "User Email"
// @Success 200 {object} map[string]string "Password reset email sent"
// @Failure 400 {object} echo.HTTPError "Invalid request"
// @Router /password/reset [post]
func (h *AuthHandler) RequestPasswordReset(c echo.Context) error {
	var resetRequest models.PasswordReset
	if err := c.Bind(&resetRequest); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&resetRequest); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.userService.RequestPasswordReset(resetRequest.Email); err != nil {
		// Don't reveal whether the email exists or not for security reasons
		// Just return success regardless
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "If an account with that email exists, a password reset link has been sent.",
	})
}

// ResetPassword handles password reset with token
// @Summary Reset password
// @Description Reset user password with token
// @Tags auth
// @Accept json
// @Produce json
// @Param token path string true "Reset Token"
// @Param password body object{password=string} true "New Password"
// @Success 200 {object} map[string]string "Password reset successful"
// @Failure 400 {object} echo.HTTPError "Invalid token or password"
// @Failure 500 {object} echo.HTTPError "Server error"
// @Router /password/reset/{token} [post]
func (h *AuthHandler) ResetPassword(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid reset token")
	}

	var passwordData struct {
		Password string `json:"password" validate:"required,min=8"`
	}

	if err := c.Bind(&passwordData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&passwordData); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.userService.ResetPassword(token, passwordData.Password); err != nil {
		if err == services.ErrInvalidToken {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid or expired reset token")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to reset password")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password has been reset successfully. You can now login with your new password.",
	})
}
