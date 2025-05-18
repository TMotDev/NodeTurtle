package handlers

import (
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/users"
)

// BanHandler handles HTTP requests related to disabling user accounts.
type BanHandler struct {
	authService auth.IAuthService
	userService users.IUserService
	banService  services.IBanService
}

// NewBanHandler creates a new AuthHandler with the provided services.
func NewBanHandler(authService auth.IAuthService, userService users.IUserService) AuthHandler {
	return AuthHandler{
		authService: authService,
		userService: userService,
	}
}
