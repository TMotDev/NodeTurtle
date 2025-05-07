package middleware

import (
	"net/http"
	"strings"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// JWT middleware for authentication
func JWT(authService *auth.AuthService) echo.MiddlewareFunc {
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
			c.Set("user", &data.User{
				ID:   uuid.MustParse(claims.Subject),
				Role: data.Role{Name: claims.Role},
			})

			return next(c)
		}
	}
}

// RequireRole middleware for role-based access control
func RequireRole(role string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := c.Get("user").(*data.User)
			if !ok {
				return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
			}

			if user.Role.Name != role && user.Role.Name != data.RoleAdmin.String() {
				return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
			}

			return next(c)
		}
	}
}
