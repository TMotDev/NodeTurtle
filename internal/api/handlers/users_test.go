package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
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

func TestGetCurrentUser(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	validUser := &data.User{
		ID:        uuid.New(),
		Email:     "validuser@test.com",
		Username:  "validuser",
		Activated: true,
	}

	notFoundUser := &data.User{
		ID:        uuid.New(),
		Email:     "unauthorized@test.com",
		Username:  "unauthorized",
		Activated: false,
	}

	mockUserService.On("GetUserByID", validUser.ID).Return(validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	tests := map[string]struct {
		contextUser *data.User
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Valid user": {
			contextUser: validUser,
			wantCode:    http.StatusOK,
			wantError:   false,
		},
		"User not found": {
			contextUser: notFoundUser,
			wantCode:    http.StatusNotFound,
			wantError:   true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/users/me", nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.GetCurrentUser(c)

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
}

func TestUpdateCurrentUser(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	validUser := &data.User{
		ID:        uuid.New(),
		Email:     "validuser@test.com",
		Username:  "validuser",
		Activated: true,
	}

	notFoundUser := &data.User{
		ID:        uuid.New(),
		Email:     "notfound@test.com",
		Username:  "notfounduser",
		Activated: false,
	}

	inactiveUser := &data.User{
		ID:        uuid.New(),
		Email:     "inactive@test.com",
		Username:  "inactive",
		Activated: false,
	}

	mockUserService.On("GetUserByID", validUser.ID).Return(validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", inactiveUser.ID).Return(inactiveUser, nil)

	mockUserService.On("UpdateUser", validUser.ID, mock.Anything).Return(nil)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	tests := map[string]struct {
		contextUser *data.User
		reqBody     string
		wantCode    int
		wantBody    string
		wantError   bool
	}{
		"No user in context": {
			contextUser: nil,
			reqBody:     `{"username":"newusername","email":"new@test.test"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Valid update": {
			contextUser: validUser,
			reqBody:     `{"username":"newusername","email":"new@test.test"}`,
			wantCode:    http.StatusOK,
			wantBody:    `"message":"User updated successfully"`,
			wantError:   false,
		},
		"User not found": {
			contextUser: notFoundUser,

			reqBody:   `{"username":"newusername","email":"new@test.test"}`,
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
		"User not activated": {
			contextUser: inactiveUser,

			reqBody:   `{"username":"newusername","email":"new@test.test"}`,
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"No updates provided": {
			contextUser: validUser,
			reqBody:     `{}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Invalid JSON": {
			contextUser: validUser,
			reqBody:     `{"username":`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Invalid email": {
			contextUser: validUser,
			reqBody:     `{"email":"email@"}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Valid email": {
			contextUser: validUser,
			reqBody:     `{"email":"email@email.com"}`,
			wantCode:    http.StatusOK,
			wantError:   false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(tt.reqBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.UpdateCurrentUser(c)

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
}

func TestChangePassword(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	validUser := data.User{
		ID:        uuid.New(),
		Email:     "test@test.test",
		Username:  "testuser",
		Activated: true,
	}
	notFoundUser := data.User{
		ID:        uuid.New(),
		Email:     "notfound@test.test",
		Username:  "testuser",
		Activated: true,
	}

	inactiveUser := data.User{
		ID:        uuid.New(),
		Email:     "inactive@test.com",
		Username:  "inactive",
		Activated: false,
	}

	mockUserService.On("GetUserByID", validUser.ID).Return(&validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", inactiveUser.ID).Return(&inactiveUser, nil)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)

	mockUserService.On("ChangePassword", validUser.ID, "WrongPassword", "NewPassword123").Return(services.ErrInvalidCredentials)
	mockUserService.On("ChangePassword", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockTokenService.On("DeleteAllForUser", mock.Anything, mock.Anything).Return(nil)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	tests := map[string]struct {
		contextUser *data.User
		reqBody     string
		wantCode    int
		wantBody    string
		wantError   bool
	}{
		"No user in context": {
			contextUser: nil,
			reqBody:     `{"old_password":"OldPassword123","new_password":"NewPassword123"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Valid password change": {
			contextUser: &validUser,
			reqBody:     `{"old_password":"OldPassword123","new_password":"NewPassword123"}`,
			wantCode:    http.StatusOK,
			wantBody:    `"message":"Password changed successfully"`,
			wantError:   false,
		},
		"Wrong old password": {
			contextUser: &validUser,
			reqBody:     `{"old_password":"WrongPassword","new_password":"NewPassword123"}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Invalid new password": {
			contextUser: &validUser,
			reqBody:     `{"old_password":"WrongPassword","new_password":"123"}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Invalid JSON": {
			contextUser: &validUser,
			reqBody:     `{"old_password":`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"User not found": {
			contextUser: &notFoundUser,
			reqBody:     `{"old_password":"OldPassword123","new_password":"NewPassword123"}`,
			wantCode:    http.StatusNotFound,
			wantError:   true,
		},
		"User not activated": {
			contextUser: &inactiveUser,
			reqBody:     `{"old_password":"OldPassword123","new_password":"NewPassword123"}`,
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/api/users/me/password", strings.NewReader(tt.reqBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.ChangePassword(c)

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
}

func TestListUsers(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	user1 := data.User{
		ID:        uuid.New(),
		Email:     "test1@test.test",
		Username:  "testuser1",
		Activated: true,
	}
	user2 := data.User{
		ID:        uuid.New(),
		Email:     "test2@test.test",
		Username:  "testuser2",
		Activated: false,
	}

	mockUserService.On("ListUsers", 5, 5).Return(nil, 0, services.ErrInternal)
	mockUserService.On("ListUsers", mock.Anything, mock.Anything).Return([]data.User{user1, user2}, 2, nil)

	tests := map[string]struct {
		page      string
		limit     string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Successful request": {
			page:      "1",
			limit:     "2",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Negative and string params": {
			page:      "-1",
			limit:     "two",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Internal failure": {
			page:      "5",
			limit:     "5",
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/admin/users?page="+tt.page+"&limit="+tt.limit, nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.ListUsers(c)

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
}

func TestGetUserByID(t *testing.T) {

	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	user := &data.User{
		ID:        uuid.New(),
		Email:     "test1@test.test",
		Username:  "testuser1",
		Activated: true,
	}
	missingUserID := uuid.New()

	mockUserService.On("GetUserByID", missingUserID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", mock.Anything).Return(user, nil)

	tests := map[string]struct {
		userID    string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Successful request": {
			userID:    user.ID.String(),
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid user id": {
			userID:    "1234",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not found": {
			userID:    missingUserID.String(),
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			c.SetPath("/api/admin/users/:id")
			c.SetParamNames("id")
			c.SetParamValues(tt.userID)

			err := handler.GetUser(c)

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

}

func TestUpdateUser(t *testing.T) {

	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	validUser := data.User{
		ID:        uuid.New(),
		Email:     "test1@test.test",
		Username:  "testuser1",
		Activated: true,
	}
	missingUserID := uuid.New()

	mockUserService.On("GetUserByID", validUser.ID).Return(&validUser, nil)
	mockUserService.On("GetUserByID", missingUserID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)

	mockUserService.On("UpdateUser", validUser.ID, mock.Anything).Return(nil)

	tests := map[string]struct {
		userID    string
		reqBody   string
		wantCode  int
		wantError bool
	}{
		"Successful update": {
			userID:    validUser.ID.String(),
			reqBody:   `{"username":"newusername","email":"new@test.test", "activated":true, "role_id":1}`,
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid user id": {
			userID:    "1234",
			reqBody:   `{"username":"newusername","email":"new@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not found": {
			userID:    missingUserID.String(),
			reqBody:   `{"username":"newusername","email":"new@test.test"}`,
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
		"No updates provided": {
			userID:    validUser.ID.String(),
			reqBody:   `{}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Invalid request body": {
			userID:    validUser.ID.String(),
			reqBody:   `{"username":`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Invalid role": {
			userID:    validUser.ID.String(),
			reqBody:   `{"role":"cool"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Valid role": {
			userID:    validUser.ID.String(),
			reqBody:   `{"role":"user"}`,
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid email ID": {
			userID:    validUser.ID.String(),
			reqBody:   `{"email":"invalid@"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/", strings.NewReader(tt.reqBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			c.SetPath("/api/admin/users/:id")
			c.SetParamNames("id")
			c.SetParamValues(tt.userID)

			err := handler.UpdateUser(c)

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

}

func TestDeleteUser(t *testing.T) {

	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService)

	validUserID := uuid.New()

	tests := map[string]struct {
		userID    string
		reqBody   string
		wantCode  int
		wantError bool
	}{
		"Successful user delete": {
			userID:    validUserID.String(),
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid user id": {
			userID:    "1234",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"User not found": {
			userID:    uuid.New().String(),
			wantCode:  http.StatusNotFound,
			wantError: true,
		},
	}

	mockUserService.On("DeleteUser", validUserID).Return(nil)
	mockUserService.On("DeleteUser", mock.Anything).Return(services.ErrUserNotFound)

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.reqBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			c.SetPath("/api/admin/users/:id")
			c.SetParamNames("id")
			c.SetParamValues(tt.userID)

			err := handler.DeleteUser(c)

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

}
