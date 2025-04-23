package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"NodeTurtleAPI/internal/models"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// MockUserService implements the methods used by AuthHandler for testing
type MockUserService struct {
	CreateUserFunc func(models.UserRegistration) (*models.User, error)
}

func (m *MockUserService) CreateUser(reg models.UserRegistration) (*models.User, error) {
	return m.CreateUserFunc(reg)
}

// Add other methods as needed...

func TestAuthHandler_Register(t *testing.T) {
	e := echo.New()
	mockUserService := &MockUserService{
		CreateUserFunc: func(reg models.UserRegistration) (*models.User, error) {
			return &models.User{ID: 1, Email: reg.Email, Username: reg.Username}, nil
		},
	}
	mockAuthService := new(struct{}) // Not used in Register

	handler := NewAuthHandler(mockAuthService, mockUserService)

	reqBody := map[string]interface{}{
		"email":    "test@example.com",
		"username": "testuser",
		"password": "TestPassword123",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/register", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// Optionally set a validator if your handler uses c.Validate
	// e.Validator = ...

	err := handler.Register(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, rec.Code)
	assert.Contains(t, rec.Body.String(), "User registered successfully")
}
