package middleware

import (
	"net/http"
	"strings"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/users"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

func JWT(authService auth.IAuthService, userService users.IUserService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			var tokenString string

			cookie, err := c.Cookie("access_token")
			if err == nil && cookie.Value != "" {
				tokenString = cookie.Value
			} else {
				// Fallback to the Authorization header
				authHeader := c.Request().Header.Get("Authorization")
				if authHeader == "" {
					return echo.NewHTTPError(http.StatusUnauthorized, "Missing authorization token")
				}

				parts := strings.Split(authHeader, " ")
				if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
					return echo.NewHTTPError(http.StatusUnauthorized, "Invalid authorization format")
				}
				tokenString = parts[1]
			}

			if tokenString == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing authorization token")
			}

			claims, err := authService.VerifyToken(tokenString)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired token")
			}

			user, err := userService.GetUserByID(uuid.MustParse(claims.Subject))
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "User not found")
			}

			c.Set("user", user)
			return next(c)
		}
	}
}

// RequireRole middleware for role-based access control
func RequireRole(role string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := c.Get("user").(*data.User)
			if !ok || user == nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
			}
			if user.Role.Name != role && user.Role.Name != data.RoleAdmin.String() {
				return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
			}
			return next(c)
		}
	}
}

func CheckBan(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		user, ok := c.Get("user").(*data.User)
		if !ok || user == nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
		}
		if user.Ban.IsValid() {
			return echo.NewHTTPError(http.StatusForbidden, services.BanMessage(user.Ban.Reason, user.Ban.ExpiresAt))
		}
		return next(c)
	}
}
