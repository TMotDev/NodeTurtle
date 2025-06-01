package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-playground/validator"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestRequestActivationToken(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	inactiveUser := data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: false,
	}
	activatedUser := data.User{
		ID:          uuid.New(),
		Email:       "activated@test.com",
		Username:    "active",
		IsActivated: true,
	}
	bannedUser := data.User{
		ID:          uuid.New(),
		Email:       "banned@test.com",
		Username:    "banned",
		IsActivated: true,
		Ban: &data.Ban{
			ExpiresAt: time.Now().Add(time.Hour),
		},
	}
	newRefreshToken := data.Token{Plaintext: "new-refresh-token", Scope: data.ScopeRefresh}

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

	mockUserService.On("GetUserByEmail", inactiveUser.Email).Return(&inactiveUser, nil)
	mockUserService.On("GetUserByEmail", bannedUser.Email).Return(&bannedUser, nil)
	mockUserService.On("GetUserByEmail", activatedUser.Email).Return(&activatedUser, nil)
	mockUserService.On("GetUserByEmail", mock.Anything).Return(nil, services.ErrUserNotFound)
	mockTokenService.On("New", mock.Anything, mock.Anything, mock.Anything).Return(&newRefreshToken, nil)
	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	tests := map[string]struct {
		reqBody   string
		wantCode  int
		wantError bool
	}{
		"Invalid request body": {
			reqBody:   `{"emai:"test@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Invalid json content": {
			reqBody:   `{"emai":"test@test.test"}`,
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"User not found": {
			reqBody:   `{"email":"test@test.test"}`,
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
		"User banned": {
			reqBody:   `{"email":"banned@test.com"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"User already activated": {
			reqBody:   `{"email":"activated@test.com"}`,
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Successful request": {
			reqBody:   `{"email":"validuser@test.com"}`,
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.reqBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.RequestActivationToken(c)

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

func TestActivateAccount(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userIDValid := uuid.New()
	userIDConflict := uuid.New()
	userIDErr := uuid.New()

	mockUserService.On("GetForToken", mock.Anything, "token").Return(&data.User{ID: userIDValid, Email: "test@test.test", Username: "testuser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "editConflict").Return(&data.User{ID: userIDConflict, Email: "editConflict@test.test", Username: "testuser2"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "updateUserFail").Return(&data.User{ID: userIDErr, Email: "update@test.test", Username: "updateErrorUser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "banned").Return(&data.User{ID: uuid.New(), Email: "banned@test.test", Username: "bannedUser", Ban: &data.Ban{
		ExpiresAt: time.Now().Add(time.Hour),
	}}, nil)
	mockUserService.On("GetForToken", mock.Anything, "-").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", mock.Anything, "internal error").Return(nil, services.ErrInternal)

	mockUserService.On("UpdateUser", userIDConflict, mock.Anything).Return(services.ErrEditConflict)
	mockUserService.On("UpdateUser", mock.Anything, mock.Anything).Return(nil)

	mockTokenService.On("DeleteAllForUser", mock.Anything, userIDErr).Return(services.ErrInternal)
	mockTokenService.On("DeleteAllForUser", mock.Anything, mock.Anything).Return(nil)

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

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
		"Banned user": {
			token:     "banned",
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Invalid token": {
			token:     "",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Record not found": {
			token:     "-",
			wantCode:  http.StatusNotFound,
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
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID := uuid.New()
	userIDFail := uuid.New()

	mockUserService.On("GetUserByEmail", "notfound@test.test").Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByEmail", "internal@test.test").Return(nil, services.ErrInternal)
	mockUserService.On("GetUserByEmail", "test@test.test").Return(&data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: true}, nil)
	mockUserService.On("GetUserByEmail", "resetTokenFail@test.test").Return(&data.User{ID: userIDFail, Email: "resetTokenFail@test.test", Username: "resetTokenFail", IsActivated: true}, nil)
	mockUserService.On("GetUserByEmail", "notactivated@test.test").Return(&data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: false}, nil)
	mockUserService.On("GetUserByEmail", "banned@test.test").Return(&data.User{ID: userID, Email: "banned@test.test", Username: "testuser", IsActivated: false, Ban: &data.Ban{
		ExpiresAt: time.Now().Add(time.Hour),
	}}, nil)

	mockTokenService.On("New", userID, mock.Anything, data.ScopePasswordReset).Return(&data.Token{
		Plaintext: "mocktoken",
		Scope:     data.ScopePasswordReset,
	}, nil)
	mockTokenService.On("New", userIDFail, mock.Anything, data.ScopePasswordReset).Return(nil, services.ErrInternal)
	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

	tests := map[string]struct {
		body      string
		wantCode  int
		wantError bool
	}{
		"User not found": {
			body:      `{"email":"notfound@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not activated": {
			body:      `{"email":"notactivated@test.test"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"User is banned": {
			body:      `{"email":"banned@test.test"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Invalid email": {
			body:      `{"email":"test"}`,
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid body": {
			body:      `{"email":test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Internal error": {
			body:      `{"email":"internal@test.test"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Valid request": {
			body:      `{"email":"test@test.test"}`,
			wantCode:  http.StatusAccepted,
			wantError: false,
		},
		"Failed to create reset token": {
			body:      `{"email":"resetTokenFail@test.test"}`,
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.body))
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
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userIDValid := uuid.New()
	userIDInternalFail := uuid.New()

	validUser := &data.User{ID: userIDValid, Email: "test@test.test", Username: "testuser", IsActivated: true}

	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken").Return(validUser, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken2").Return(&data.User{ID: userIDInternalFail, Email: "fail@test.test", Username: "failuser", IsActivated: true}, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "bannedtoken").Return(&data.User{ID: uuid.New(), Email: "fail@test.test", Username: "failuser", IsActivated: true, Ban: &data.Ban{
		ExpiresAt: time.Now().Add(time.Hour),
	}}, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "badtoken").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "internalerror").Return(nil, services.ErrInternal)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "inactive").Return(&data.User{ID: userIDValid, Email: "valid@test.test", Username: "validUser", IsActivated: false}, nil)

	mockUserService.On("ResetPassword", "validtoken", "failpassword").Return(services.ErrInternal)
	mockUserService.On("ResetPassword", mock.Anything, mock.Anything).Return(nil)

	mockTokenService.On("DeleteAllForUser", data.ScopePasswordReset, userIDValid).Return(nil)
	mockTokenService.On("DeleteAllForUser", data.ScopePasswordReset, userIDInternalFail).Return(services.ErrInternal)

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

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
			wantCode:  http.StatusNoContent,
			wantError: false,
		},
		"Empty token": {
			token:     "",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not found": {
			token:     "badtoken",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
		"Account not activated": {
			token:     "inactive",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Account is suspended": {
			token:     "bannedtoken",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Short password": {
			token:     "validtoken",
			body:      `{"password":"short"}`,
			wantCode:  http.StatusUnprocessableEntity,
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
			req := httptest.NewRequest(http.MethodPost, "/"+token, bytes.NewReader([]byte(tt.body)))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetPath("/api/:token")
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
	mockMailerService.AssertExpectations(t)
}

func TestRequestDeactivationToken(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	password := data.Password{}
	password.Set("testtest")

	inactiveUser := data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Password:    password,
		Username:    "inactive",
		IsActivated: false,
	}
	validUser := data.User{
		ID:          uuid.New(),
		Email:       "vlid@test.com",
		Password:    password,
		Username:    "valid",
		IsActivated: true,
	}
	newDeactivationToken := data.Token{Plaintext: "new-token", Scope: data.ScopeDeactivate}

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

	mockTokenService.On("New", mock.Anything, mock.Anything, mock.Anything).Return(&newDeactivationToken, nil)
	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	tests := map[string]struct {
		contextUser *data.User
		body        string
		wantCode    int
		wantError   bool
	}{
		"Successful request": {
			contextUser: &validUser,
			body:        `{"password":"testtest"}`,
			wantCode:    http.StatusAccepted,
			wantError:   false,
		},
		"User not activated": {
			contextUser: &inactiveUser,
			body:        `{"password":"testtest"}`,
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"No user in context": {
			contextUser: nil,
			body:        `{"password":"testtest"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Invalid password": {
			contextUser: &validUser,
			body:        `{"password":"testtestTEST"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Invalid request body": {
			contextUser: &validUser,
			body:        `{"password:"testtestTEST"}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"No password": {
			contextUser: &validUser,
			body:        `{}`,
			wantCode:    http.StatusUnprocessableEntity,
			wantError:   true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader([]byte(tt.body)))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.RequestDeactivationToken(c)

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

	mockTokenService.AssertExpectations(t)
}
