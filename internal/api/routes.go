package api

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"NodeTurtleAPI/internal/api/handlers"
	customMiddleware "NodeTurtleAPI/internal/api/middleware"
	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/mail"
	"NodeTurtleAPI/internal/services/tokens"
	"NodeTurtleAPI/internal/services/users"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
)

type Server struct {
	echo   *echo.Echo
	config *config.Config
	db     *sql.DB
}

type CustomValidator struct {
	validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

func NewServer(cfg *config.Config, db *sql.DB) *Server {
	e := echo.New()

	e.Validator = &CustomValidator{validator: validator.New()}

	mailService := mail.NewMailService(cfg.Mail)
	authService := auth.NewService(db, cfg.JWT)
	userService := users.NewUserService(db)
	tokenService := tokens.NewTokenService(db)

	authHandler := handlers.NewAuthHandler(&authService, &userService, &tokenService, &mailService)
	userHandler := handlers.NewUserHandler(&userService, &authService, &tokenService)

	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "ip:${remote_ip} method:${method}, uri:${uri}, status:${status}, error:${error}\n",
	}))
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	setupRoutes(e, &authHandler, &userHandler, &authService)

	return &Server{
		echo:   e,
		config: cfg,
		db:     db,
	}
}

func setupRoutes(e *echo.Echo, authHandler *handlers.AuthHandler, userHandler *handlers.UserHandler, authService *auth.AuthService) {

	// Public routes
	e.POST("/api/login", authHandler.Login)
	e.POST("/api/register", authHandler.Register)
	e.GET("/api/activate/:token", authHandler.ActivateAccount)
	e.POST("/api/password/reset", authHandler.RequestPasswordReset)
	e.POST("/api/password/reset/:token", authHandler.ResetPassword)
	e.POST("/api/refresh", authHandler.RefreshToken)

	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// Protected routes - requires authentication
	api := e.Group("/api")
	api.Use(customMiddleware.JWT(authService))

	// User routes
	api.POST("/auth/logout", authHandler.Logout)
	api.GET("/users/me", userHandler.GetCurrentUser)
	api.PUT("/users/me", userHandler.UpdateCurrentUser)
	api.POST("/users/me/password", userHandler.ChangePassword)

	// Role-specific routes
	admin := api.Group("/admin")
	admin.Use(customMiddleware.RequireRole(data.RoleAdmin.String()))
	admin.GET("/users", userHandler.ListUsers)
	admin.GET("/users/:id", userHandler.GetUser)
	admin.PUT("/users/:id", userHandler.UpdateUser)
	admin.DELETE("/users/:id", userHandler.DeleteUser)
}

func (s *Server) Start() error {
	return s.echo.Start(fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port))
}

func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.echo.Shutdown(ctx)
}
