package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"NodeTurtleAPI/internal/models"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"

	"github.com/go-playground/validator"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// MockUserService implements the methods used by AuthHandler for testing
type MockAuthService struct{}

type MockUserService struct{}

type CustomValidator struct {
	validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

func (m *MockAuthService) CreateToken(user models.User) (string, error) {
	return "mocktoken", nil
}

func (m *MockUserService) CreateUser(reg models.UserRegistration) (*models.User, error) {
	if reg.Email == "exists@example.com" {
		return nil, services.ErrUserExists
	}
	if reg.Email == "internal-error@example.com" {
		return nil, errors.New("database connection failed")
	}
	return &models.User{ID: 1, Email: reg.Email, Username: reg.Username}, nil
}
func (m *MockUserService) ActivateUser(token string) error {
	return nil
}

func (m *MockAuthService) Login(email, password string) (string, *models.User, error) {
	if email == "inactive@example.com" {
		return "", nil, services.ErrInactiveAccount
	}
	if email != "test@example.com" || password != "TestPassword123" {
		return "", nil, services.ErrInvalidCredentials
	}
	return "mocktoken", &models.User{
		ID:       1,
		Email:    email,
		Username: "testuser",
		Role:     models.Role{Name: "user", Description: "Regular user", ID: 1},
	}, nil
}
func (m *MockAuthService) VerifyToken(tokenString string) (*auth.Claims, error) {
	return nil, nil
}

func (m *MockUserService) RequestPasswordReset(email string) error {
	return nil

}
func (m *MockUserService) ResetPassword(token, newPassword string) error {
	return nil

}

func TestRegisterRoute(t *testing.T) {
	// Setup
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}
	mockUserService := &MockUserService{}
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService, mockUserService)

	tests := []struct {
		name      string
		reqBody   map[string]interface{}
		rawBody   string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		{
			name: "Valid registration",
			reqBody: map[string]interface{}{
				"email":    "test@example.com",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusCreated,
			wantBody:  "User registered successfully",
			wantError: false,
		},
		{
			name: "User already exists",
			reqBody: map[string]interface{}{
				"email":    "exists@example.com",
				"username": "existinguser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		{
			name: "Invalid email format",
			reqBody: map[string]interface{}{
				"email":    "invalid-email",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name: "Missing required fields",
			reqBody: map[string]interface{}{
				"email": "test@example.com",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name: "Weak password",
			reqBody: map[string]interface{}{
				"email":    "test@example.com",
				"username": "testuser",
				"password": "weak",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name:      "Malformed JSON triggers bind error",
			rawBody:   `{"email": "foo@example.com`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name: "Internal server error",
			reqBody: map[string]interface{}{
				"email":    "internal-error@example.com",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusInternalServerError,
			wantBody:  "Failed to create user",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.rawBody != "" {
				req = httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(tt.rawBody))
			} else {
				body, _ := json.Marshal(tt.reqBody)
				req = httptest.NewRequest(http.MethodPost, "/api/register", bytes.NewReader(body))
			}
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.Register(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
				if tt.wantBody != "" {
					assert.Contains(t, rec.Body.String(), tt.wantBody)
				}
			}
		})
	}
}

func TestLoginRoute(t *testing.T) {
	// Setup
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}
	mockUserService := &MockUserService{}
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService, mockUserService)

	tests := []struct {
		name      string
		reqBody   map[string]interface{}
		rawBody   string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		{
			name: "Valid login",
			reqBody: map[string]interface{}{
				"email":    "test@example.com",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusOK,
			wantBody:  "mocktoken",
			wantError: false,
		},
		{
			name: "Invalid credentials",
			reqBody: map[string]interface{}{
				"email":    "wrong@example.com",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusUnauthorized,
			wantError: true,
		},
		{
			name: "Inactive account",
			reqBody: map[string]interface{}{
				"email":    "inactive@example.com",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		{
			name: "Invalid email format",
			reqBody: map[string]interface{}{
				"email":    "invalid-email",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name: "Missing required fields",
			reqBody: map[string]interface{}{
				"email": "test@example.com",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		{
			name:      "Malformed JSON triggers bind error",
			rawBody:   `{"email": "foo@example.com`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.rawBody != "" {
				req = httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(tt.rawBody))
			} else {
				body, _ := json.Marshal(tt.reqBody)
				req = httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body))
			}
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.Login(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
				if tt.wantBody != "" {
					assert.Contains(t, rec.Body.String(), tt.wantBody)
				}
			}
		})
	}
}
