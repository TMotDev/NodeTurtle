package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
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
	mockBanService := mocks.MockBanService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	notFoundUser := &data.User{
		ID:          uuid.New(),
		Email:       "unauthorized@test.com",
		Username:    "unauthorized",
		IsActivated: false,
	}

	mockUserService.On("GetUserByID", validUser.ID).Return(validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

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
	mockBanService := mocks.MockBanService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}
	_ = validUser.Password.Set("testpass")

	validUser2 := &data.User{
		ID:          uuid.New(),
		Email:       "validuser2@test.com",
		Username:    "validuser2",
		IsActivated: true,
	}
	_ = validUser2.Password.Set("testpass")

	notFoundUser := &data.User{
		ID:          uuid.New(),
		Email:       "notfound@test.com",
		Username:    "notfounduser",
		IsActivated: false,
	}
	_ = notFoundUser.Password.Set("testpass")

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}
	_ = inactiveUser.Password.Set("testpass")

	mockUserService.On("GetUserByID", validUser.ID).Return(validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", inactiveUser.ID).Return(inactiveUser, nil)

	mockUserService.On("GetUserByEmail", validUser2.Email).Return(validUser2, nil)
	mockUserService.On("GetUserByEmail", mock.Anything).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByUsername", validUser2.Username).Return(validUser2, nil)
	mockUserService.On("GetUserByUsername", mock.Anything).Return(nil, services.ErrUserNotFound)

	mockUserService.On("UpdateUser", validUser.ID, mock.Anything).Return(nil)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	tests := map[string]struct {
		contextUser *data.User
		reqBody     string
		wantCode    int
		wantBody    string
		wantError   bool
	}{
		"No user in context": {
			contextUser: nil,
			reqBody:     `{"username":"newusername","email":"new@test.test","password":"testpass"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Valid update": {
			contextUser: validUser,
			reqBody:     `{"username":"newusername","email":"new@test.test","password":"testpass"}`,
			wantCode:    http.StatusOK,
			wantBody:    `"message":"User updated successfully"`,
			wantError:   false,
		},
		"Email already used": {
			contextUser: validUser,
			reqBody:     `{"username":"newusername","email":"validuser2@test.com","password":"testpass"}`,
			wantCode:    http.StatusConflict,
			wantError:   true,
		},
		"Username already used": {
			contextUser: validUser,
			reqBody:     `{"username":"validuser2","email":"new@test.test","password":"testpass"}`,
			wantCode:    http.StatusConflict,
			wantError:   true,
		},
		"Incorrect password": {
			contextUser: validUser,
			reqBody:     `{"username":"newusername","email":"new@test.test","password":"incorrect"}`,
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not found": {
			contextUser: notFoundUser,
			reqBody:     `{"username":"newusername","email":"new@test.test","password":"testpass"}`,
			wantCode:    http.StatusNotFound,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			reqBody:     `{"username":"newusername","email":"new@test.test","password":"testpass"}`,
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"No updates provided": {
			contextUser: validUser,
			reqBody:     `{"password":"testpass"}`,
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
			reqBody:     `{"email":"email@??\2","password":"testpass"}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Valid email": {
			contextUser: validUser,
			reqBody:     `{"email":"email@email.com","password":"testpass"}`,
			wantCode:    http.StatusOK,
			wantError:   false,
		},
		"Invalid body": {
			contextUser: validUser,
			reqBody:     `{"email":"email@email.com","premium":true}`,
			wantCode:    http.StatusBadRequest,
			wantError:   true,
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
	mockBanService := mocks.MockBanService{}

	validUser := data.User{
		ID:          uuid.New(),
		Email:       "test@test.test",
		Username:    "testuser",
		IsActivated: true,
	}
	notFoundUser := data.User{
		ID:          uuid.New(),
		Email:       "notfound@test.test",
		Username:    "testuser",
		IsActivated: true,
	}

	inactiveUser := data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	mockUserService.On("GetUserByID", validUser.ID).Return(&validUser, nil)
	mockUserService.On("GetUserByID", notFoundUser.ID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", inactiveUser.ID).Return(&inactiveUser, nil)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)

	mockUserService.On("ChangePassword", validUser.ID, "WrongPassword", "NewPassword123").Return(services.ErrInvalidCredentials)
	mockUserService.On("ChangePassword", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockTokenService.On("DeleteAllForUser", mock.Anything, mock.Anything).Return(nil)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

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
	mockBanService := mocks.MockBanService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	user1 := data.User{
		ID:          uuid.New(),
		Email:       "test1@test.test",
		Username:    "testuser1",
		IsActivated: true,
	}
	user2 := data.User{
		ID:          uuid.New(),
		Email:       "test2@test.test",
		Username:    "testuser2",
		IsActivated: false,
	}

	mockUserService.On("ListUsers", mock.Anything, mock.Anything).Return([]data.User{user1, user2}, 2, nil)

	tests := map[string]struct {
		filters   data.UserFilter
		wantCode  int
		wantError bool
	}{
		"Successful request": {
			filters: data.UserFilter{
				Page:      1,
				Limit:     10,
				SortField: "created_at",
				SortOrder: "desc",
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid params": {
			filters: data.UserFilter{
				Page:      -1,
				Limit:     -10,
				SortField: "height",
				SortOrder: "random",
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			q := make([]string, 0)
			if tt.filters.Page != 0 {
				q = append(q, "page="+strconv.Itoa(tt.filters.Page))
			}
			if tt.filters.Limit != 0 {
				q = append(q, "limit="+strconv.Itoa(tt.filters.Limit))
			}
			if tt.filters.SortField != "" {
				q = append(q, "sort_field="+tt.filters.SortField)
			}
			if tt.filters.SortOrder != "" {
				q = append(q, "sort_order="+tt.filters.SortOrder)
			}

			query := ""

			if len(q) > 0 {
				query = "?" + strings.Join(q, "&")
			}

			fmt.Println(query)

			req := httptest.NewRequest(http.MethodGet, "/api/admin/users"+query, nil)
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
	mockBanService := mocks.MockBanService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	user := &data.User{
		ID:          uuid.New(),
		Email:       "test1@test.test",
		Username:    "testuser1",
		IsActivated: true,
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
	mockBanService := mocks.MockBanService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	validUser := data.User{
		ID:          uuid.New(),
		Email:       "test1@test.test",
		Username:    "testuser1",
		IsActivated: true,
	}

	validUser2 := &data.User{
		ID:          uuid.New(),
		Email:       "validuser2@test.com",
		Username:    "validuser2",
		IsActivated: true,
	}

	missingUserID := uuid.New()

	mockUserService.On("GetUserByID", validUser.ID).Return(&validUser, nil)
	mockUserService.On("GetUserByID", missingUserID).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByID", mock.Anything).Return(nil, services.ErrInternal)
	mockUserService.On("GetUserByEmail", validUser2.Email).Return(validUser2, nil)
	mockUserService.On("GetUserByEmail", mock.Anything).Return(nil, services.ErrUserNotFound)
	mockUserService.On("GetUserByUsername", validUser2.Username).Return(validUser2, nil)
	mockUserService.On("GetUserByUsername", mock.Anything).Return(nil, services.ErrUserNotFound)
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
		"Emoji username": {
			userID:    validUser.ID.String(),
			reqBody:   `{"username":"❤️👌👍⭐","email":"new@test.test"}`,
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Duplicate username": {
			userID:    validUser.ID.String(),
			reqBody:   `{"username":"validuser2","email":"new@test.test"}`,
			wantCode:  http.StatusConflict,
			wantError: true,
		},
		"Duplicate email": {
			userID:    validUser.ID.String(),
			reqBody:   `{"username":"validuser22","email":"validuser2@test.com"}`,
			wantCode:  http.StatusConflict,
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
		"Invalid email": {
			userID:    validUser.ID.String(),
			reqBody:   `{"email":"invalid@??"'"}`,
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
	mockBanService := mocks.MockBanService{}

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

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

func TestCheckEmail(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockBanService := mocks.MockBanService{}

	mockUserService.On("EmailExists", "existing@test.com").Return(true, nil)
	mockUserService.On("EmailExists", "new@test.com").Return(false, services.ErrUserNotFound)
	mockUserService.On("EmailExists", "error@test.com").Return(false, services.ErrInternal)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	tests := map[string]struct {
		email     string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Email exists": {
			email:     "existing@test.com",
			wantCode:  http.StatusOK,
			wantBody:  `{"exists":true}`,
			wantError: false,
		},
		"Email doesn't exist": {
			email:     "new@test.com",
			wantCode:  http.StatusOK,
			wantBody:  `{"exists":false}`,
			wantError: false,
		},
		"Internal error": {
			email:     "error@test.com",
			wantCode:  http.StatusInternalServerError,
			wantBody:  "Failed to validate email",
			wantError: true,
		},
		"Invalid email format": {
			email:     "invalid-email",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			c.SetPath("/api/accounts/email/:email")
			c.SetParamNames("email")
			c.SetParamValues(tt.email)

			err := handler.CheckEmail(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
					if tt.wantBody != "" {
						assert.Contains(t, he.Message, tt.wantBody)
					}
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
				if tt.wantBody != "" {
					assert.JSONEq(t, tt.wantBody, rec.Body.String())
				}
			}
		})
	}

	mockUserService.AssertExpectations(t)
}

func TestCheckUsername(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockUserService := mocks.MockUserService{}
	mockAuthService := mocks.MockAuthService{}
	mockTokenService := mocks.MockTokenService{}
	mockBanService := mocks.MockBanService{}

	mockUserService.On("UsernameExists", "existinguser").Return(true, nil)
	mockUserService.On("UsernameExists", "newusername").Return(false, services.ErrUserNotFound)
	mockUserService.On("UsernameExists", "erroruser").Return(false, services.ErrInternal)

	handler := NewUserHandler(&mockUserService, &mockAuthService, &mockTokenService, &mockBanService)

	tests := map[string]struct {
		username  string
		wantCode  int
		wantBody  string
		wantError bool
	}{
		"Username exists": {
			username:  "existinguser",
			wantCode:  http.StatusOK,
			wantBody:  `{"exists":true}`,
			wantError: false,
		},
		"Username doesn't exist": {
			username:  "newusername",
			wantCode:  http.StatusOK,
			wantBody:  `{"exists":false}`,
			wantError: false,
		},
		"Internal error": {
			username:  "erroruser",
			wantCode:  http.StatusInternalServerError,
			wantBody:  "Failed to validate username",
			wantError: true,
		},
		"Username too short": {
			username:  "a",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Username with special characters": {
			username:  "user@name!",
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			c.SetPath("/api/accounts/username/:username")
			c.SetParamNames("username")
			c.SetParamValues(tt.username)

			err := handler.CheckUsername(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
					if tt.wantBody != "" {
						assert.Contains(t, he.Message, tt.wantBody)
					}
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)
				if tt.wantBody != "" {
					assert.JSONEq(t, tt.wantBody, rec.Body.String())
				}
			}
		})
	}

	mockUserService.AssertExpectations(t)
}
