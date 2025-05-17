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
		if err == services.ErrDuplicateEmail {
			return echo.NewHTTPError(http.StatusConflict, "Email is already taken")
		}
		if err == services.ErrDuplicateUsername {
			return echo.NewHTTPError(http.StatusConflict, "Username is already taken")
		}
		c.Logger().Errorf("Internal user creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create user")
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
		if errors.Is(err, services.ErrInvalidCredentials) {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
		}
		if errors.Is(err, services.ErrInactiveAccount) {
			return echo.NewHTTPError(http.StatusForbidden, "Account is not activated")
		}
		if errors.Is(err, services.ErrAccountSuspended) {
			return echo.NewHTTPError(http.StatusForbidden, "Account is suspended, reason: ")
		}
		c.Logger().Errorf("Internal login error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to login")
	}

	// delete all refresh tokens
	if err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, user.ID); err != nil {
		c.Logger().Errorf("Internal refresh token deletion error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete old refresh tokens")
	}

	// generate a new refresh token
	refreshToken, err := h.tokenService.New(user.ID, (time.Hour * 168), data.ScopeRefresh)
	if err != nil {
		c.Logger().Errorf("Internal refresh token creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create new refresh token")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"token":        token,
		"refreshToken": refreshToken.Plaintext,
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

	//TODO check if user is banned

	token, err := h.authService.CreateAccessToken(*user)
	if err != nil {
		c.Logger().Errorf("Internal access token creation error %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create new access token")
	}

	refreshToken, err := h.tokenService.New(user.ID, (time.Hour * 168), data.ScopeRefresh)
	if err != nil {
		c.Logger().Errorf("Internal refresh token creation error %v", err)
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

	if err := h.tokenService.DeleteAllForUser(data.ScopeRefresh, contextUser.ID); err != nil {
		// logging instead of returning to allow user to smoothly logout
		c.Logger().Error("Failed to delete refresh tokens on user logout")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logged out successfully.",
	})
}
