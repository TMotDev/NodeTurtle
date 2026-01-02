package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Env      string
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
	FrontendPath string
	AllowOrigins []string
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
	Host      string
	Port      int
	Username  string
	Password  string
	From      string
	ClientURL string
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
		Env: GetEnv("ENV", "DEV"), // DEV | PROD
		Server: ServerConfig{
			Port:         GetEnvAsInt("SERVER_PORT", 8080),
			Host:         GetEnv("SERVER_HOST", ""),
			ReadTimeout:  GetEnvAsInt("SERVER_READ_TIMEOUT", 15),
			WriteTimeout: GetEnvAsInt("SERVER_WRITE_TIMEOUT", 15),
			FrontendPath: GetEnv("CLIENT_PATH", ""),
			AllowOrigins: GetEnvAsSlice("ALLOW_ORIGINS", []string{"*"}),
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
			Host:      GetEnv("MAIL_HOST", "smtp.mailtrap.io"),
			Port:      GetEnvAsInt("MAIL_PORT", 2525),
			Username:  GetEnv("MAIL_USERNAME", ""),
			Password:  GetEnv("MAIL_PASSWORD", ""),
			From:      GetEnv("MAIL_FROM", "noreply@turtlegraphics.com"),
			ClientURL: GetEnv("CLIENT_URL", "http://website.com"),
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

// GetEnvAsSlice retrieves environment value and converts it to string slice.
// Expects comma-separated values. If the variable is not present, returns fallback slice.
func GetEnvAsSlice(key string, fallback []string) []string {
	strValue := GetEnv(key, "")
	if strValue == "" {
		return fallback
	}

	// Split by comma and trim whitespace
	values := []string{}
	for _, v := range splitAndTrim(strValue, ",") {
		if v != "" {
			values = append(values, v)
		}
	}

	if len(values) == 0 {
		return fallback
	}

	return values
}

// splitAndTrim splits a string by delimiter and trims whitespace from each part
func splitAndTrim(s, delimiter string) []string {
	parts := []string{}
	for _, part := range splitString(s, delimiter) {
		trimmed := trimSpace(part)
		parts = append(parts, trimmed)
	}
	return parts
}

func splitString(s, delimiter string) []string {
	if s == "" {
		return []string{}
	}

	result := []string{}
	current := ""

	for i := 0; i < len(s); i++ {
		if i+len(delimiter) <= len(s) && s[i:i+len(delimiter)] == delimiter {
			result = append(result, current)
			current = ""
			i += len(delimiter) - 1
		} else {
			current += string(s[i])
		}
	}
	result = append(result, current)

	return result
}

// trimSpace removes leading and trailing whitespace
func trimSpace(s string) string {
	start := 0
	end := len(s)

	for start < end && isSpace(s[start]) {
		start++
	}

	for end > start && isSpace(s[end-1]) {
		end--
	}

	return s[start:end]
}

// isSpace checks if a byte is a whitespace character
func isSpace(b byte) bool {
	return b == ' ' || b == '\t' || b == '\n' || b == '\r'
}
