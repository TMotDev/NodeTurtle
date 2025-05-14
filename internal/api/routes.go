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

	gomail "net/mail"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
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

func customFunc(fl validator.FieldLevel) bool {
	_, err := gomail.ParseAddress(fl.Field().String())
	return err == nil
}

func NewServer(cfg *config.Config, db *sql.DB) *Server {
	e := echo.New()

	// validator setup
	v := validator.New()
	v.RegisterValidation("email", customFunc)
	e.Validator = &CustomValidator{validator: v}

	// setup services
	mailService := mail.NewMailService(cfg.Mail)
	authService := auth.NewService(db, cfg.JWT)
	userService := users.NewUserService(db)
	tokenService := tokens.NewTokenService(db)

	// setup handlers
	authHandler := handlers.NewAuthHandler(&authService, &userService, &tokenService, &mailService)
	userHandler := handlers.NewUserHandler(&userService, &authService, &tokenService)
	tokenHandler := handlers.NewTokenHandler(&userService, &tokenService, &mailService)

	// setup middleware
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "ip:${remote_ip} method:${method}, uri:${uri}, status:${status}, error:${error}\n",
	}))
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	setupRoutes(e, &authHandler, &userHandler, &tokenHandler, &authService)

	return &Server{
		echo:   e,
		config: cfg,
		db:     db,
	}
}

func setupRoutes(e *echo.Echo, authHandler *handlers.AuthHandler, userHandler *handlers.UserHandler, tokenHandler *handlers.TokenHandler, authService *auth.AuthService) {

	// Public routes
	e.POST("/api/login", authHandler.Login)
	e.POST("/api/register", authHandler.Register)
	e.GET("/api/activate/:token", tokenHandler.ActivateAccount)
	e.GET("/api/accounts/username/:username", userHandler.CheckUsername)
	e.GET("/api/accounts/email/:email", userHandler.CheckEmail)
	e.POST("/api/activate", tokenHandler.RequestActivationToken)
	e.POST("/api/password/reset", tokenHandler.RequestPasswordReset)
	e.POST("/api/password/reset/:token", tokenHandler.ResetPassword)
	e.POST("/api/refresh", authHandler.RefreshToken)

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
