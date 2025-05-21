package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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

	validUser := data.User{
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
	newRefreshToken := data.Token{Plaintext: "new-refresh-token", Scope: data.ScopeRefresh}

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

	mockUserService.On("GetUserByEmail", validUser.Email).Return(&validUser, nil)
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
			reqBody:   `{"emai":"test@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not found": {
			reqBody:   `{"email":"test@test.test"}`,
			wantCode:  http.StatusNotFound,
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
			req := httptest.NewRequest(http.MethodPost, "/api/password/reset", strings.NewReader(tt.reqBody))
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

	userID1 := uuid.New()
	userID2 := uuid.New()
	userIDErr := uuid.New()

	mockUserService.On("GetForToken", mock.Anything, "token").Return(&data.User{ID: userID1, Email: "test@test.test", Username: "testuser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "editConflict").Return(&data.User{ID: userID2, Email: "editConflict@test.test", Username: "testuser2"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "updateUserFail").Return(&data.User{ID: userIDErr, Email: "update@test.test", Username: "updateErrorUser"}, nil)
	mockUserService.On("GetForToken", mock.Anything, "-").Return(nil, services.ErrRecordNotFound)
	mockUserService.On("GetForToken", mock.Anything, "internal error").Return(nil, services.ErrInternal)

	mockUserService.On("UpdateUser", userID2, mock.Anything).Return(services.ErrEditConflict)
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
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userID := uuid.New()
	userIDFail := uuid.New()

	mockUserService.On("GetUserByEmail", "notfound@test.test").Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByEmail", "internal@test.test").Return(nil, services.ErrInternal)
	mockUserService.On("GetUserByEmail", "test@test.test").Return(&data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: true}, nil)
	mockUserService.On("GetUserByEmail", "resetTokenFail@test.test").Return(&data.User{ID: userIDFail, Email: "resetTokenFail@test.test", Username: "resetTokenFail", IsActivated: true}, nil)
	mockUserService.On("GetUserByEmail", "notactivated@test.test").Return(&data.User{ID: userID, Email: "test@test.test", Username: "testuser", IsActivated: false}, nil)

	mockTokenService.On("New", userID, mock.Anything, data.ScopePasswordReset).Return(&data.Token{
		Plaintext: "mocktoken",
		Scope:     data.ScopePasswordReset,
	}, nil)
	mockTokenService.On("New", userIDFail, mock.Anything, data.ScopePasswordReset).Return(nil, services.ErrInternal)
	mockMailerService.On("SendEmail", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	handler := NewTokenHandler(&mockUserService, &mockTokenService, &mockMailerService)

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
		"User not activated": {
			email:     "notactivated@test.test",
			wantCode:  http.StatusForbidden,
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
			body, _ := json.Marshal(struct{ Email string }{
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
	mockTokenService := mocks.MockTokenService{}
	mockMailerService := mocks.MockMailService{}

	userIDValid := uuid.New()
	userIDInternalFail := uuid.New()

	validUser := &data.User{ID: userIDValid, Email: "test@test.test", Username: "testuser", IsActivated: true}

	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken").Return(validUser, nil)
	mockUserService.On("GetForToken", data.ScopePasswordReset, "validtoken2").Return(&data.User{ID: userIDInternalFail, Email: "fail@test.test", Username: "failuser", IsActivated: true}, nil)
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
			wantCode:  http.StatusOK,
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
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Account not activated": {
			token:     "inactive",
			body:      `{"password":"NewPassword123"}`,
			wantCode:  http.StatusForbidden,
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
	mockMailerService.AssertExpectations(t)
}
