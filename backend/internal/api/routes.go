package api

import (
	"context"
	"database/sql"
	"fmt"
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
	// TODO: requestloggerwithconfig
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "ip:${remote_ip} method:${method}, uri:${uri}, status:${status}, error:${error}\n",
	}))
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000"}, // TODO: alloworigins env variable?
		AllowCredentials: true,
	}))

	setupRoutes(e, &authHandler, &userHandler, &tokenHandler, &projectHandler, &authService, &userService)

	return &Server{
		echo:   e,
		config: cfg,
		db:     db,
	}
}

func setupRoutes(e *echo.Echo, authHandler *handlers.AuthHandler, userHandler *handlers.UserHandler, tokenHandler *handlers.TokenHandler, projectHandler *handlers.ProjectHandler, authService *auth.AuthService, userService *users.UserService) {

	// Public routes
	e.GET("/api/projects/public", projectHandler.GetPublic)
	e.GET("/api/projects/featured", projectHandler.GetFeatured)
	e.GET("/api/projects/:id", projectHandler.Get)

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
