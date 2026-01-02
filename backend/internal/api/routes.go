package api

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"NodeTurtleAPI/internal/api/handlers"
	m "NodeTurtleAPI/internal/api/middleware"
	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"NodeTurtleAPI/internal/services/mail"
	"NodeTurtleAPI/internal/services/projects"
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

// emailValidation validates using RFC 5322 standard
func emailValidation(fl validator.FieldLevel) bool {
	_, err := gomail.ParseAddress(fl.Field().String())
	return err == nil
}

func NewServer(cfg *config.Config, db *sql.DB) *Server {
	e := echo.New()

	e.Debug = cfg.Env == "DEV"

	// validator setup
	v := validator.New()
	v.RegisterValidation("email", emailValidation)
	e.Validator = &CustomValidator{validator: v}

	// setup services
	mailService := mail.NewMailService(cfg.Mail)
	authService := auth.NewService(db, cfg.JWT)
	userService := users.NewUserService(db)
	tokenService := tokens.NewTokenService(db)
	banService := services.NewBanService(db)
	projectService := projects.NewProjectService(db)

	// setup handlers
	authHandler := handlers.NewAuthHandler(&authService, &userService, &tokenService, &mailService)
	userHandler := handlers.NewUserHandler(&userService, &authService, &tokenService, &banService, &mailService)
	tokenHandler := handlers.NewTokenHandler(&userService, &tokenService, &mailService)
	projectHandler := handlers.NewProjectHandler(&projectService)

	// setup middleware
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "ip:${remote_ip} method:${method}, uri:${uri}, status:${status}, error:${error}\n",
	}))
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     cfg.Server.AllowOrigins,
		AllowCredentials: true,
	}))

	// Setup API routes
	setupRoutes(e, &authHandler, &userHandler, &tokenHandler, &projectHandler, &authService, &userService)

	// Setup frontend serving if path is provided
	if cfg.Server.FrontendPath != "" {
		setupClient(e, cfg.Server.FrontendPath)
	}

	return &Server{
		echo:   e,
		config: cfg,
		db:     db,
	}
}

func setupClient(e *echo.Echo, frontendPath string) {
	// Resolve to absolute path
	absPath, err := filepath.Abs(frontendPath)
	if err != nil {
		fmt.Printf("Warning: Could not resolve frontend path: %v\n", err)
		return
	}

	// Verify the path exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		fmt.Printf("Warning: Frontend path does not exist: %s\n", absPath)
		return
	}

	fmt.Printf("Serving frontend from: %s\n", absPath)

	// Serve static files from assets directory
	e.Static("/assets", filepath.Join(absPath, "assets"))

	// Catch-all route for SPA (must be LAST)
	e.GET("/*", func(c echo.Context) error {
		// Don't serve index.html for API routes
		if len(c.Path()) >= 4 && c.Path()[:4] == "/api" {
			return echo.NewHTTPError(404, "Not found")
		}
		return c.File(filepath.Join(absPath, "index.html"))
	})
}

func setupRoutes(e *echo.Echo, authHandler *handlers.AuthHandler, userHandler *handlers.UserHandler, tokenHandler *handlers.TokenHandler, projectHandler *handlers.ProjectHandler, authService *auth.AuthService, userService *users.UserService) {

	// Public routes
	e.GET("/api/projects/public", projectHandler.GetPublic)
	e.GET("/api/projects/featured", projectHandler.GetFeatured)
	e.GET("/api/projects/:id", projectHandler.Get, m.OptionalJWT(authService, userService))

	e.POST("/api/users", authHandler.Register)
	e.GET("/api/users/username/:username", userHandler.CheckUsername)
	e.GET("/api/users/email/:email", userHandler.CheckEmail)

	e.POST("/api/auth/activate", tokenHandler.RequestActivationToken)
	e.POST("/api/users/activate/:token", tokenHandler.ActivateAccount)
	e.POST("/api/auth/session", authHandler.Login)
	e.POST("/api/auth/refresh", authHandler.RefreshToken)
	e.POST("/api/auth/deactivate/:token", userHandler.Deactivate)

	e.POST("/api/password/request-reset", tokenHandler.RequestPasswordReset)
	e.PUT("/api/password/reset/:token", tokenHandler.ResetPassword)

	// Protected routes - requires authentication
	api := e.Group("/api")
	api.Use(m.JWT(authService, userService))
	api.Use(m.CheckBan)

	api.DELETE("/auth/session", authHandler.Logout)
	api.GET("/users/me", userHandler.GetCurrent)
	api.PATCH("/users/me", userHandler.UpdateCurrent)
	api.PUT("/users/me/password", userHandler.ChangePassword)
	api.POST("/users/me/deactivate", tokenHandler.RequestDeactivationToken)

	api.POST("/projects", projectHandler.Create)
	api.POST("/projects/:id/likes", projectHandler.Like)
	api.DELETE("/projects/:id/likes", projectHandler.Unlike)
	api.GET("/users/:id/projects", projectHandler.GetUserProjects)
	api.GET("/users/:id/liked-projects", projectHandler.GetLikedProjects)
	api.DELETE("/projects/:id", projectHandler.Delete)
	api.PATCH("/projects/:id", projectHandler.Update)

	// Role-specific routes
	admin := api.Group("/admin")
	admin.Use(m.RequireRole(data.RoleAdmin.String()))
	admin.GET("/users/all", userHandler.List)
	admin.GET("/projects/all", projectHandler.List)
	admin.GET("/users/:id", userHandler.Get)
	admin.PUT("/users/:id", userHandler.Update)
	admin.PATCH("/projects/:id", projectHandler.Feature)
	admin.DELETE("/users/:id", userHandler.Delete)
	admin.POST("/users/ban", userHandler.Ban)
	admin.DELETE("/users/ban/:userID", userHandler.Unban)
}

func (s *Server) Start() error {
	return s.echo.Start(fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port))
}

func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.echo.Shutdown(ctx)
}
