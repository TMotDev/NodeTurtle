package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Mail     MailConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Port         int
	Host         string
	ReadTimeout  int
	WriteTimeout int
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

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
			Port:         GetEnvAsInt("SERVER_PORT", 8080),
			Host:         GetEnv("SERVER_HOST", ""),
			ReadTimeout:  GetEnvAsInt("SERVER_READ_TIMEOUT", 15),
			WriteTimeout: GetEnvAsInt("SERVER_WRITE_TIMEOUT", 15),
		},
		Database: DatabaseConfig{
			Host:     GetEnv("DB_HOST", "localhost"),
			Port:     GetEnvAsInt("DB_PORT", 5432),
			User:     GetEnv("DB_USER", "postgres"),
			Password: GetEnv("DB_PASSWORD", ""),
			Name:     GetEnv("DB_NAME", "turtlegraphics"),
			SSLMode:  GetEnv("DB_SSLMODE", "disable"),
		},
		Mail: MailConfig{
			Host:     GetEnv("MAIL_HOST", "smtp.mailtrap.io"),
			Port:     GetEnvAsInt("MAIL_PORT", 2525),
			Username: GetEnv("MAIL_USERNAME", ""),
			Password: GetEnv("MAIL_PASSWORD", ""),
			From:     GetEnv("MAIL_FROM", "noreply@turtlegraphics.com"),
		},
		JWT: JWTConfig{
			Secret:     GetEnv("JWT_SECRET", ""),
			ExpireTime: GetEnvAsInt("JWT_EXPIRE_TIME", 24), // 24 hours default
		},
	}

	// Validate required fields
	if cfg.JWT.Secret == "" {
		return nil, errors.New("JWT_SECRET must be set")
	}

	return cfg, nil
}

// Helper functions to get environment variables

// GetEnv retrieves environment value.
// If the variable is not present, returns fallback value.
func GetEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// GetEnvAsInt retrieves environment value and converts it to integer.
// If the variable is not present, returns fallback int value.
func GetEnvAsInt(key string, fallback int) int {
	strValue := GetEnv(key, "")
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return fallback
}
