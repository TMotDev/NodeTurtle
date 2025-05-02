package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"

	"github.com/go-playground/validator"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type CustomValidator struct {
	validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

func TestRegister(t *testing.T) {
	// Setup
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "test@test.test"
	})).Return(&data.User{ID: uuid.New(), Email: "test@test.test", Username: "testuser"}, nil)

	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "exists@test.test"
	})).Return(nil, services.ErrUserExists)

	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "internal-error@test.test"
	})).Return(nil, services.ErrInternal)

	mockTokenService.On("New", mock.Anything, mock.Anything, data.ScopeUserActivation).Return(&data.Token{
		Plaintext: "mocktoken",
		Scope:     data.ScopeUserActivation,
	}, nil)

	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		reqBody   map[string]interface{}
		rawBody   string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Valid registration": {
			reqBody: map[string]interface{}{
				"email":    "test@test.test",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusCreated,
			wantBody:  "User registered successfully",
			wantError: false,
		},
		"User already exists": {
			reqBody: map[string]interface{}{
				"email":    "exists@test.test",
				"username": "existinguser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Invalid email format": {
			reqBody: map[string]interface{}{
				"email":    "invalid-email",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Missing required fields": {
			reqBody: map[string]interface{}{
				"email": "test@test.test",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Weak password": {
			reqBody: map[string]interface{}{
				"email":    "test@test.test",
				"username": "testuser",
				"password": "weak",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Malformed JSON triggers bind error": {
			rawBody:   `{"email": "test@test.test`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Internal server error": {
			reqBody: map[string]interface{}{
				"email":    "internal-error@test.test",
				"username": "testuser",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusInternalServerError,
			wantBody:  "Failed to create user",
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
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

	mockUserService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)
	mockMailerService.AssertExpectations(t)

}

func TestLogin(t *testing.T) {
	// Setup
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	validUser := &data.User{
		ID:        uuid.New(),
		Email:     "test@test.test",
		Username:  "testuser",
		Activated: true,
	}

	mockAuthService.On("Login", "test@test.test", "TestPassword123").Return("mocktoken", validUser, nil)
	mockAuthService.On("Login", "wrong@test.test", "TestPassword123").Return("", nil, services.ErrInvalidCredentials)
	mockAuthService.On("Login", "inactive@test.test", "TestPassword123").Return("", nil, services.ErrInactiveAccount)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		reqBody   map[string]interface{}
		rawBody   string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Valid login": {
			reqBody: map[string]interface{}{
				"email":    "test@test.test",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusOK,
			wantBody:  "mocktoken",
			wantError: false,
		},
		"Invalid credentials": {
			reqBody: map[string]interface{}{
				"email":    "wrong@test.test",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusUnauthorized,
			wantError: true,
		},
		"Inactive account": {
			reqBody: map[string]interface{}{
				"email":    "inactive@test.test",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Invalid email format": {
			reqBody: map[string]interface{}{
				"email":    "invalid-email",
				"password": "TestPassword123",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Missing required fields": {
			reqBody: map[string]interface{}{
				"email": "test@test.test",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Malformed JSON triggers bind error": {

			rawBody:   `{"email": "foo@test.test`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
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

	mockAuthService.AssertExpectations(t)
}

func TestActivateAccount(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID1 := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	userID2 := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	userIDErr := uuid.MustParse("33333333-3333-3333-3333-333333333333")

	mockUserService.On("GetForToken", mock.Anything, "token").Return(&data.User{ID: userID1, Email: "test@test.test", Username: "testuser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "editConflict").Return(&data.User{ID: userID2, Email: "editConflict@test.test", Username: "testuser2"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "updateUserFail").Return(&data.User{ID: userIDErr, Email: "update@test.test", Username: "updateErrorUser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "-").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", mock.Anything, "internal error").Return(nil, services.ErrInternal)

	mockUserService.On("UpdateUser", userID2, mock.Anything).Return(services.ErrEditConflict)
	mockUserService.On("UpdateUser", mock.Anything, mock.Anything).Return(nil)

	mockTokenService.On("DeleteAllForUser", mock.Anything, userIDErr).Return(services.ErrInternal)
	mockTokenService.On("DeleteAllForUser", mock.Anything, mock.Anything).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		token     string
		wantCode  int
		wantError bool
	}{
		"Valid token": {
			token:     "token",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Edit conflict": {
			token:     "editConflict",
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Invalid token": {
			token:     "",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Record not found": {
			token:     "-",
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Failed to retrieve user": {
			token:     "internal error",
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Failed to activate user": {
			token:     "updateUserFail",
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetPath("/api/activate/:token")
			c.SetParamNames("token")
			c.SetParamValues(tt.token)

			err := handler.ActivateAccount(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
			}
		})
	}

	mockUserService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)

}

func TestRequestPasswordReset(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	userIDFail := uuid.MustParse("33333333-3333-3333-3333-333333333333")

	mockUserService.On("GetUserByEmail", "notfound@test.test").Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByEmail", "internal@test.test").Return(nil, services.ErrInternal)
	mockUserService.On("GetUserByEmail", "test@test.test").Return(&data.User{ID: userID, Email: "test@test.test", Username: "testuser"}, nil)
	mockUserService.On("GetUserByEmail", "resetTokenFail@test.test").Return(&data.User{ID: userIDFail, Email: "resetTokenFail@test.test", Username: "resetTokenFail"}, nil)

	mockTokenService.On("New", userID, mock.Anything, data.ScopePasswordReset).Return(&data.Token{
		Plaintext: "mocktoken",
		Scope:     data.ScopePasswordReset,
	}, nil)
	mockTokenService.On("New", userIDFail, mock.Anything, data.ScopePasswordReset).Return(nil, services.ErrInternal)
	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		email     string
		wantCode  int
		wantError bool
	}{
		"User not found": {
			email:     "notfound@test.test",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Internal error": {
			email:     "internal@test.test",
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Valid request": {
			email:     "test@test.test",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Failed to create reset token": {
			email:     "resetTokenFail@test.test",
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			body, _ := json.Marshal(data.PasswordReset{
				Email: tt.email,
			})
			req := httptest.NewRequest(http.MethodPost, "/api/password/reset", bytes.NewReader(body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.RequestPasswordReset(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
			}
		})
	}

	mockUserService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)

}

func TestResetPassword(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID1 := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	userID2 := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	validUser := &data.User{ID: userID1, Email: "test@test.test", Username: "testuser"}

	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken").Return(validUser, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken2").Return(&data.User{ID: userID2, Email: "fail@test.test", Username: "failuser"}, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "badtoken").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "internalerror").Return(nil, services.ErrInternal)

	mockUserService.On("ResetPassword", "validtoken", "NewPassword123").Return(nil)
	mockUserService.On("ResetPassword", "validtoken", "failpassword").Return(services.ErrInternal)
	mockUserService.On("ResetPassword", "validtoken2", "NewPassword123").Return(nil)

	mockTokenService.On("DeleteAllForUser", data.ScopePasswordReset, userID1).Return(nil)
	mockTokenService.On("DeleteAllForUser", data.ScopePasswordReset, userID2).Return(services.ErrInternal)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		token     string
		body      string
		setupUser func()
		wantCode  int
		wantError bool
	}{
		"Success": {
			token:     "validtoken",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Empty token": {
			token:     "",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Bad token (user not found)": {
			token:     "badtoken",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Short password": {
			token:     "validtoken",
			body:      `{"password":"short"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Bad request body": {
			token:     "validtoken",
			body:      `{"password":`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User service GetForToken internal error": {
			token:     "internalerror",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"User service ResetPassword failed internal": {
			token:     "validtoken",
			body:      `{"password":"failpassword"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"DeleteAllForUser fail": {
			token:     "validtoken2",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			token := tt.token
			req := httptest.NewRequest(http.MethodPost, "/api/password/reset/"+token, bytes.NewReader([]byte(tt.body)))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetPath("/api/password/reset/:token")
			c.SetParamNames("token")
			c.SetParamValues(token)

			err := handler.ResetPassword(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
			}
		})
	}

	mockUserService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)
}
