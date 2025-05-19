package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	tokenUserId := uuid.New() // for token error test

	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "test@test.test"
	})).Return(&data.User{ID: uuid.New(), Email: "test@test.test", Username: "testuser"}, nil)
	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "token@test.test"
	})).Return(&data.User{ID: tokenUserId, Email: "token@test.test", Username: "token"}, nil)

	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "exists@test.test"
	})).Return(nil, services.ErrDuplicateEmail)
	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Email == "exists@test.test"
	})).Return(nil, services.ErrDuplicateEmail)
	mockUserService.On("CreateUser", mock.MatchedBy(func(reg data.UserRegistration) bool {
		return reg.Username == "existinguser"
	})).Return(nil, services.ErrDuplicateUsername)
	mockUserService.On("CreateUser", mock.Anything).Return(nil, services.ErrInternal)

	mockTokenService.On("New", tokenUserId, mock.Anything, data.ScopeUserActivation).Return(nil, services.ErrInternal)
	mockTokenService.On("New", mock.Anything, mock.Anything, data.ScopeUserActivation).Return(&data.Token{
		Plaintext: "mocktoken",
		Scope:     data.ScopeUserActivation,
	}, nil)

	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		reqBody   string
		wantCode  int
		wantError bool
	}{
		"Valid registration": {
			reqBody:   `{"email":"test@test.test","username":"testuser","password":"TestPassword123"}`,
			wantCode:  http.StatusCreated,
			wantError: false,
		},
		"Emoji username": {
			reqBody:   `{"email":"test@test.test","username":"⭐👌👍❤️","password":"TestPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Random symbols username": {
			reqBody:   `{"email":"test@test.test","username":"'][]/\\//.;?!/'","password":"TestPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Email taken": {
			reqBody:   `{"email":"exists@test.test","username":"testuser","password":"TestPassword123"}`,
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Username taken": {
			reqBody:   `{"email":"existsname@test.test","username":"existinguser","password":"TestPassword123"}`,
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Invalid email format": {
			reqBody:   `{"email":"invalid-email","username":"testuser","password":"TestPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Missing required fields": {
			reqBody: `{
				"email":"test@test.test",
			}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Weak password": {
			reqBody:   `{"email":"test@test.test","username":"testuser","password":"weak"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Malformed JSON triggers bind error": {
			reqBody:   `{"email":"test@test.test`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Unexpected creation error": {
			reqBody:   `{"email":"internal@test.test","username":"testuser","password":"TestPassword123"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Unexpected token creation error": {
			reqBody:   `{"email":"token@test.test","username":"token","password":"TestPassword123"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(tt.reqBody))
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
			}
		})
	}

	mockUserService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)
	mockMailerService.AssertExpectations(t)

}

func TestLogin(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "test@test.test",
		Username:    "testuser",
		IsActivated: true,
	}

	mockAuthService.On("Login", "test@test.test", "TestPassword123").Return("mocktoken", validUser, nil)
	mockAuthService.On("Login", "wrong@test.test", "TestPassword123").Return("", nil, services.ErrInvalidCredentials)
	mockAuthService.On("Login", "inactive@test.test", "TestPassword123").Return("", nil, services.ErrInactiveAccount)
	mockAuthService.On("Login", "banned@test.test", "TestPassword123").Return("", nil, services.ErrAccountSuspended)
	mockAuthService.On("Login", mock.Anything, mock.Anything).Return("", nil, services.ErrInternal)

	mockTokenService.On("New", mock.Anything, mock.Anything, mock.Anything).Return(&data.Token{UserID: uuid.New(), ExpiresAt: time.Now().UTC().Add(time.Hour), Scope: data.ScopeRefresh}, nil)
	mockTokenService.On("DeleteAllForUser", mock.Anything, mock.Anything).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		reqBody   string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Valid login": {
			reqBody:   `{"email":"test@test.test","password":"TestPassword123"}`,
			wantCode:  http.StatusOK,
			wantBody:  "mocktoken",
			wantError: false,
		},
		"Invalid credentials": {
			reqBody:   `{"email":"wrong@test.test","password":"TestPassword123"}`,
			wantCode:  http.StatusUnauthorized,
			wantError: true,
		},
		"Inactive account": {
			reqBody:   `{"email":"inactive@test.test","password":"TestPassword123"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Suspended account": {
			reqBody:   `{"email":"banned@test.test","password":"TestPassword123"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Invalid email format": {
			reqBody:   `{"email":"invalid-email","password":"TestPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Missing required fields": {
			reqBody:   `{"email": "test@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Malformed JSON triggers bind error": {
			reqBody:   `{"email": "foo@test.test`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Internal fail while creating user": {
			reqBody:   `{"email": "foo@test.test","password":"testPassword123"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(tt.reqBody))
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

func TestRefreshToken(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID := uuid.New()
	validUser := &data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: true}
	refreshToken := "valid-refresh-token"
	newAccessToken := "new-access-token"
	newRefreshToken := &data.Token{Plaintext: "new-refresh-token", Scope: data.ScopeRefresh}

	mockUserService.On("GetForToken", data.ScopeRefresh, refreshToken).Return(validUser, nil)
	mockUserService.On("GetForToken", data.ScopeRefresh, "wrongtoken").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", data.ScopeRefresh, "internalerror").Return(nil, services.ErrInternal)
	mockUserService.On("GetForToken", data.ScopeRefresh, "banned").Return(nil, services.ErrAccountSuspended)
	mockAuthService.On("CreateAccessToken", *validUser).Return(newAccessToken, nil)
	mockTokenService.On("New", userID, mock.Anything, data.ScopeRefresh).Return(newRefreshToken, nil)
	mockTokenService.On("DeleteAllForUser", data.ScopeRefresh, userID).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		body      string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Success": {
			body:      `{"refreshToken":"valid-refresh-token"}`,
			wantCode:  http.StatusCreated,
			wantBody:  `"token":"new-access-token"`,
			wantError: false,
		},
		"Invalid refresh token": {
			body:      `{"refreshToken":"wrongtoken"}`,
			wantCode:  http.StatusUnauthorized,
			wantError: true,
		},
		"Malformed JSON": {
			body:      `{"refreshToken":`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Internal error on GetForToken": {
			body:      `{"refreshToken":"internalerror"}`,
			wantCode:  http.StatusUnauthorized,
			wantError: true,
		},
		"Token owner is suspended": {
			body:      `{"refreshToken":"banned"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/token/refresh", strings.NewReader(tt.body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.RefreshToken(c)

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
	mockAuthService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)
}

func TestLogout(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID := uuid.New()
	validUser := &data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: true}

	mockTokenService.On("DeleteAllForUser", data.ScopeRefresh, userID).Return(nil)

	handler := NewAuthHandler(&mockAuthService, &mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		contextUser interface{}
		wantCode    int
		wantBody    string
		wantError   bool
	}{
		"Success": {
			contextUser: validUser,
			wantCode:    http.StatusOK,
			wantBody:    `"message":"Logged out successfully."`,
			wantError:   false,
		},
		"User not in context": {
			contextUser: nil,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/logout", nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Logout(c)

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

	mockTokenService.AssertExpectations(t)
}
