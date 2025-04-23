package middleware

import (
	"net/http"
	"strings"

	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/labstack/echo/v4"
)

// JWT middleware for authentication
func JWT(authService *auth.Service) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get token from Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing authorization header")
			}

			// Bearer token format
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid authorization format")
			}

			tokenString := parts[1]

			// Verify token
			claims, err := authService.VerifyToken(tokenString)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired token")
			}

			// Store user info in context
			c.Set("user", &models.User{
				ID:    claims.UserID,
				Email: claims.Email,
				Role:  models.Role{Name: claims.Role},
			})

			return next(c)
		}
	}
}

// RequireRole middleware for role-based access control
func RequireRole(role string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := c.Get("user").(*models.User)
			if !ok {
				return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
			}

			if user.Role.Name != role && user.Role.Name != auth.RoleAdmin {
				return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
			}

			return next(c)
		}
	}
}
