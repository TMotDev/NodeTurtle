package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Mail     MailConfig
	JWT      JWTConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port         int
	Host         string
	ReadTimeout  int
	WriteTimeout int
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

// MailConfig holds mail server configuration
type MailConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

type JWTConfig struct {
	Secret     string
	ExpireTime int // in hours
}

// Load loads configuration from environment variables
func Load(configPath, envFile string) (*Config, error) {
	// Load environment variables from file
	if envFile != "" {
		if err := godotenv.Load(envFile); err != nil {
			return nil, fmt.Errorf("error loading .env file: %w", err)
		}
	}

	// Load from environment variables
	cfg := &Config{
		Server: ServerConfig{
			Port:         getEnvAsInt("SERVER_PORT", 8080),
			Host:         getEnv("SERVER_HOST", ""),
			ReadTimeout:  getEnvAsInt("SERVER_READ_TIMEOUT", 15),
			WriteTimeout: getEnvAsInt("SERVER_WRITE_TIMEOUT", 15),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "turtlegraphics"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Mail: MailConfig{
			Host:     getEnv("MAIL_HOST", "smtp.mailtrap.io"),
			Port:     getEnvAsInt("MAIL_PORT", 2525),
			Username: getEnv("MAIL_USERNAME", ""),
			Password: getEnv("MAIL_PASSWORD", ""),
			From:     getEnv("MAIL_FROM", "noreply@turtlegraphics.com"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", ""),
			ExpireTime: getEnvAsInt("JWT_EXPIRE_TIME", 24), // 24 hours default
		},
	}

	// Validate required fields
	if cfg.JWT.Secret == "" {
		return nil, errors.New("JWT_SECRET must be set")
	}

	return cfg, nil
}

// Helper functions to get environment variables
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	strValue := getEnv(key, "")
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return fallback
}
