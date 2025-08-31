package handlers

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
	"encoding/json"
	"fmt"
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

func TestCreateProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	expectedProject := &data.Project{
		ID:              uuid.New(),
		Title:           "Test Project",
		Description:     "Test Description",
		Data:            json.RawMessage(`{}`),
		CreatorID:       validUser.ID,
		CreatorUsername: validUser.Username,
		IsPublic:        true,
		LikesCount:      0,
		CreatedAt:       time.Now(),
		LastEditedAt:    time.Now(),
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		requestBody string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			requestBody: `{"title":"Test","description":"Test","is_public":true}`,
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			requestBody: `{"title":"Test","description":"Test","is_public":true}`,
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid request body": {
			contextUser: validUser,
			requestBody: `invalid json`,
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Validation error - title too short": {
			contextUser: validUser,
			requestBody: `{"title":"ab","description":"Test","is_public":true}`,
			setupMocks:  func() {},
			wantCode:    http.StatusUnprocessableEntity,
			wantError:   true,
		},
		"Validation error - missing required fields": {
			contextUser: validUser,
			requestBody: `{"description":"Test"}`,
			setupMocks:  func() {},
			wantCode:    http.StatusUnprocessableEntity,
			wantError:   true,
		},
		"Successful creation": {
			contextUser: validUser,
			requestBody: `{"title":"Test Project","description":"Test Description","is_public":true}`,
			setupMocks: func() {
				mockProjectService.On("CreateProject", mock.AnythingOfType("data.ProjectCreate")).
					Return(expectedProject, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodPost, "/projects", strings.NewReader(tt.requestBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Create(c)

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
}

func TestDeleteProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	projectID := uuid.New()

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		projectID   string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid project ID": {
			contextUser: validUser,
			projectID:   "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"IsOwner service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"User not owner": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Delete service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
				mockProjectService.On("DeleteProject", projectID).
					Return(fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful deletion": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
				mockProjectService.On("DeleteProject", projectID).
					Return(nil)
			},
			wantCode:  http.StatusNoContent,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodDelete, "/projects/"+tt.projectID, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.projectID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Delete(c)

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
}

func TestUpdateProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	projectID := uuid.New()
	expectedProject := &data.Project{
		ID:              projectID,
		Title:           "Updated Project",
		Description:     "Updated Description",
		Data:            json.RawMessage(`{}`),
		CreatorID:       validUser.ID,
		CreatorUsername: validUser.Username,
		IsPublic:        true,
		LikesCount:      0,
		CreatedAt:       time.Now(),
		LastEditedAt:    time.Now(),
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		projectID   string
		requestBody string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated"}`,
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated"}`,
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid project ID": {
			contextUser: validUser,
			projectID:   "invalid-uuid",
			requestBody: `{"title":"Updated"}`,
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"IsOwner service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated"}`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"User not owner": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated"}`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Invalid request body": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `invalid json`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
			},
			wantCode:  http.StatusBadRequest,
			wantError: true,
		},
		"Validation error - title too short": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"ab"}`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Update service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated Project"}`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
				mockProjectService.On("UpdateProject", mock.AnythingOfType("data.ProjectUpdate")).
					Return(nil, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful update": {
			contextUser: validUser,
			projectID:   projectID.String(),
			requestBody: `{"title":"Updated Project","description":"Updated Description"}`,
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
				mockProjectService.On("UpdateProject", mock.AnythingOfType("data.ProjectUpdate")).
					Return(expectedProject, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodPut, "/projects/"+tt.projectID, strings.NewReader(tt.requestBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.projectID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Update(c)

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
}

func TestLikeProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	projectID := uuid.New()

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		projectID   string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid project ID": {
			contextUser: validUser,
			projectID:   "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"IsOwner service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"User is owner": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Like service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
				mockProjectService.On("LikeProject", projectID, validUser.ID).
					Return(fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful like": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
				mockProjectService.On("LikeProject", projectID, validUser.ID).
					Return(nil)
			},
			wantCode:  http.StatusCreated,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodPost, "/projects/"+tt.projectID+"/like", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.projectID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Like(c)

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
}

func TestUnlikeProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	projectID := uuid.New()

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		projectID   string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid project ID": {
			contextUser: validUser,
			projectID:   "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"IsOwner service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"User is owner": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(true, nil)
			},
			wantCode:  http.StatusForbidden,
			wantError: true,
		},
		"Unlike service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
				mockProjectService.On("UnlikeProject", projectID, validUser.ID).
					Return(fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful unlike": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("IsOwner", projectID, validUser.ID).
					Return(false, nil)
				mockProjectService.On("UnlikeProject", projectID, validUser.ID).
					Return(nil)
			},
			wantCode:  http.StatusNoContent,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodDelete, "/projects/"+tt.projectID+"/like", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.projectID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Unlike(c)

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
}

func TestGetUserProjects(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	targetUserID := uuid.New()
	expectedProjects := []data.Project{
		{
			ID:              uuid.New(),
			Title:           "Project 1",
			Description:     "Description 1",
			CreatorID:       targetUserID,
			CreatorUsername: "targetuser",
			IsPublic:        true,
		},
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		userID      string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			userID:      targetUserID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			userID:      targetUserID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid user ID": {
			contextUser: validUser,
			userID:      "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Service error": {
			contextUser: validUser,
			userID:      targetUserID.String(),
			setupMocks: func() {
				mockProjectService.On("GetUserProjects", targetUserID, validUser.ID).
					Return(nil, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful get": {
			contextUser: validUser,
			userID:      targetUserID.String(),
			setupMocks: func() {
				mockProjectService.On("GetUserProjects", targetUserID, validUser.ID).
					Return(expectedProjects, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodGet, "/users/"+tt.userID+"/projects", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.userID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.GetUserProjects(c)

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
}

func TestGetLikedProjects(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	inactiveUser := &data.User{
		ID:          uuid.New(),
		Email:       "inactive@test.com",
		Username:    "inactive",
		IsActivated: false,
	}

	targetUserID := uuid.New()
	expectedProjects := []data.Project{
		{
			ID:              uuid.New(),
			Title:           "Liked Project 1",
			Description:     "Description 1",
			CreatorID:       uuid.New(),
			CreatorUsername: "someuser",
			IsPublic:        true,
		},
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		userID      string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			userID:      targetUserID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"User not activated": {
			contextUser: inactiveUser,
			userID:      targetUserID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusForbidden,
			wantError:   true,
		},
		"Invalid user ID": {
			contextUser: validUser,
			userID:      "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Service error": {
			contextUser: validUser,
			userID:      targetUserID.String(),
			setupMocks: func() {
				mockProjectService.On("GetLikedProjects", targetUserID).
					Return(nil, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful get": {
			contextUser: validUser,
			userID:      targetUserID.String(),
			setupMocks: func() {
				mockProjectService.On("GetLikedProjects", targetUserID).
					Return(expectedProjects, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodGet, "/users/"+tt.userID+"/liked-projects", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.userID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.GetLikedProjects(c)

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
}

func TestGetProject(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	validUser := &data.User{
		ID:          uuid.New(),
		Email:       "validuser@test.com",
		Username:    "validuser",
		IsActivated: true,
	}

	projectID := uuid.New()
	expectedProject := &data.Project{
		ID:              projectID,
		Title:           "Test Project",
		Description:     "Test Description",
		Data:            json.RawMessage(`{}`),
		CreatorID:       validUser.ID,
		CreatorUsername: validUser.Username,
		IsPublic:        true,
		LikesCount:      5,
		CreatedAt:       time.Now(),
		LastEditedAt:    time.Now(),
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		contextUser *data.User
		projectID   string
		setupMocks  func()
		wantCode    int
		wantError   bool
	}{
		"User not authenticated": {
			contextUser: nil,
			projectID:   projectID.String(),
			setupMocks:  func() {},
			wantCode:    http.StatusUnauthorized,
			wantError:   true,
		},
		"Invalid project ID": {
			contextUser: validUser,
			projectID:   "invalid-uuid",
			setupMocks:  func() {},
			wantCode:    http.StatusBadRequest,
			wantError:   true,
		},
		"Project not found": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("GetProject", projectID, validUser.ID).
					Return(nil, services.ErrRecordNotFound)
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Service error": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("GetProject", projectID, validUser.ID).
					Return(nil, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Successful get": {
			contextUser: validUser,
			projectID:   projectID.String(),
			setupMocks: func() {
				mockProjectService.On("GetProject", projectID, validUser.ID).
					Return(expectedProject, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			// Reset mocks for each test
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodGet, "/projects/"+tt.projectID, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.projectID)

			if tt.contextUser != nil {
				c.Set("user", tt.contextUser)
			}

			err := handler.Get(c)

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
}

func TestGetFeaturedProjects(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	expectedProjects := []data.Project{
		{
			ID:              uuid.New(),
			Title:           "Featured Project 1",
			Description:     "Featured Description 1",
			Data:            json.RawMessage(`{}`),
			CreatorID:       uuid.New(),
			CreatorUsername: "creator1",
			IsPublic:        true,
			LikesCount:      10,
			FeaturedUntil:   &time.Time{},
			CreatedAt:       time.Now(),
			LastEditedAt:    time.Now(),
		},
		{
			ID:              uuid.New(),
			Title:           "Featured Project 2",
			Description:     "Featured Description 2",
			Data:            json.RawMessage(`{}`),
			CreatorID:       uuid.New(),
			CreatorUsername: "creator2",
			IsPublic:        true,
			LikesCount:      8,
			FeaturedUntil:   &time.Time{},
			CreatedAt:       time.Now(),
			LastEditedAt:    time.Now(),
		},
	}

	handler := NewProjectHandler(&mockProjectService)

	tests := map[string]struct {
		queryParams   map[string]string
		setupMocks    func()
		expectedLimit int
		expectedPage  int
		wantCode      int
		wantError     bool
		description   string
	}{
		"Default pagination (no params)": {
			queryParams: map[string]string{},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 10,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should use default values when no query params provided",
		},
		"Custom valid pagination": {
			queryParams: map[string]string{
				"limit": "5",
				"page":  "2",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 5, 2).
					Return(expectedProjects, nil)
			},
			expectedLimit: 5,
			expectedPage:  2,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should use provided valid pagination parameters",
		},
		"Invalid limit (zero)": {
			queryParams: map[string]string{
				"limit": "0",
				"page":  "1",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 10,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to 10 when limit is 0",
		},
		"Invalid limit (negative)": {
			queryParams: map[string]string{
				"limit": "-5",
				"page":  "1",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 10,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to 10 when limit is negative",
		},
		"Invalid page (zero)": {
			queryParams: map[string]string{
				"limit": "15",
				"page":  "0",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 15, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 15,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to page 1 when page is 0",
		},
		"Invalid page (negative)": {
			queryParams: map[string]string{
				"limit": "20",
				"page":  "-2",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 20, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 20,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to page 1 when page is negative",
		},
		"Non-numeric limit": {
			queryParams: map[string]string{
				"limit": "abc",
				"page":  "1",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 10,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to 10 when limit is non-numeric",
		},
		"Non-numeric page": {
			queryParams: map[string]string{
				"limit": "8",
				"page":  "xyz",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 8, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 8,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should default to page 1 when page is non-numeric",
		},
		"Service error": {
			queryParams: map[string]string{
				"limit": "10",
				"page":  "1",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 1).
					Return(nil, fmt.Errorf("database error"))
			},
			expectedLimit: 10,
			expectedPage:  1,
			wantCode:      http.StatusInternalServerError,
			wantError:     true,
			description:   "Should handle service layer errors",
		},
		"Empty result": {
			queryParams: map[string]string{
				"limit": "10",
				"page":  "999",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 10, 999).
					Return([]data.Project{}, nil)
			},
			expectedLimit: 10,
			expectedPage:  999,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should handle empty results gracefully",
		},
		"Large limit": {
			queryParams: map[string]string{
				"limit": "1000",
				"page":  "1",
			},
			setupMocks: func() {
				mockProjectService.On("GetFeaturedProjects", 1000, 1).
					Return(expectedProjects, nil)
			},
			expectedLimit: 1000,
			expectedPage:  1,
			wantCode:      http.StatusOK,
			wantError:     false,
			description:   "Should handle large limit values",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			// Reset mocks for each test
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			// Build URL with query parameters
			url := "/projects/featured"
			if len(tt.queryParams) > 0 {
				url += "?"
				params := []string{}
				for key, value := range tt.queryParams {
					params = append(params, fmt.Sprintf("%s=%s", key, value))
				}
				url += strings.Join(params, "&")
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.GetFeatured(c)

			if tt.wantError {
				assert.Error(t, err, tt.description)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code, tt.description)
				}
			} else {
				assert.NoError(t, err, tt.description)
				assert.Equal(t, tt.wantCode, rec.Code, tt.description)
			}
		})
	}
}

func TestGetPublicProjects(t *testing.T) {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}

	handler := NewProjectHandler(&mockProjectService)

	// Sample test data
	project1 := data.Project{
		ID:              uuid.New(),
		Title:           "Public Project 1",
		Description:     "Description for project 1",
		Data:            json.RawMessage(`{"nodes":[],"edges":[]}`),
		CreatorID:       uuid.New(),
		CreatorUsername: "creator1",
		IsPublic:        true,
		LikesCount:      5,
		CreatedAt:       time.Now(),
		LastEditedAt:    time.Now(),
	}
	project2 := data.Project{
		ID:              uuid.New(),
		Title:           "Public Project 2",
		Description:     "Description for project 2",
		Data:            json.RawMessage(`{"nodes":[],"edges":[]}`),
		CreatorID:       uuid.New(),
		CreatorUsername: "creator2",
		IsPublic:        true,
		LikesCount:      3,
		CreatedAt:       time.Now(),
		LastEditedAt:    time.Now(),
	}

	tests := map[string]struct {
		query      string
		setupMocks func()
		wantCode   int
		wantError  bool
	}{
		"Successful request with default params": {
			query: "",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.MatchedBy(func(filters data.PublicProjectFilter) bool {
					return filters.Page == 1 && filters.Limit == 10 &&
						filters.SortField == "created_at" && filters.SortOrder == "desc"
				})).Return([]data.Project{project1, project2}, 2, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Successful request with custom params": {
			query: "?page=2&limit=5&sort_field=likes_count&sort_order=asc&search_term=test",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.MatchedBy(func(filters data.PublicProjectFilter) bool {
					return filters.Page == 2 && filters.Limit == 5 &&
						filters.SortField == "likes_count" && filters.SortOrder == "asc" &&
						filters.SearchTerm == "test"
				})).Return([]data.Project{project1}, 1, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid validation - page less than 1": {
			query: "?page=0",
			setupMocks: func() {
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid validation - limit less than 1": {
			query: "?limit=0",
			setupMocks: func() {
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid validation - limit greater than 100": {
			query: "?limit=101",
			setupMocks: func() {
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid validation - invalid sort_field": {
			query: "?sort_field=invalid_field",
			setupMocks: func() {
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid validation - invalid sort_order": {
			query: "?sort_order=random",
			setupMocks: func() {
			},
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Service error": {
			query: "?page=1&limit=10",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.AnythingOfType("data.PublicProjectFilter")).
					Return(nil, 0, fmt.Errorf("database error"))
			},
			wantCode:  http.StatusInternalServerError,
			wantError: true,
		},
		"Empty results": {
			query: "?search_term=nonexistent",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.MatchedBy(func(filters data.PublicProjectFilter) bool {
					return filters.SearchTerm == "nonexistent"
				})).Return([]data.Project{}, 0, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Valid sort by likes_count desc": {
			query: "?sort_field=likes_count&sort_order=desc",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.MatchedBy(func(filters data.PublicProjectFilter) bool {
					return filters.SortField == "likes_count" && filters.SortOrder == "desc"
				})).Return([]data.Project{project1, project2}, 2, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid query params ignored (defaults used)": {
			query: "?invalid_param=value&another_invalid=123",
			setupMocks: func() {
				mockProjectService.On("GetPublicProjects", mock.MatchedBy(func(filters data.PublicProjectFilter) bool {
					// Should use defaults when invalid params are provided
					return filters.Page == 1 && filters.Limit == 10 &&
						filters.SortField == "created_at" && filters.SortOrder == "desc"
				})).Return([]data.Project{project1, project2}, 2, nil)
			},
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			// Reset mock expectations
			mockProjectService.ExpectedCalls = nil
			tt.setupMocks()

			req := httptest.NewRequest(http.MethodGet, "/projects/public"+tt.query, nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.GetPublic(c)

			if tt.wantError {
				assert.Error(t, err)
				if he, ok := err.(*echo.HTTPError); ok {
					assert.Equal(t, tt.wantCode, he.Code)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCode, rec.Code)

				// For successful cases, verify response structure
				if rec.Code == http.StatusOK {
					var response map[string]interface{}
					err := json.Unmarshal(rec.Body.Bytes(), &response)
					assert.NoError(t, err)

					// Verify response has expected structure
					assert.Contains(t, response, "projects")
					assert.Contains(t, response, "meta")

					meta, ok := response["meta"].(map[string]interface{})
					assert.True(t, ok)
					assert.Contains(t, meta, "total")
					assert.Contains(t, meta, "page")
					assert.Contains(t, meta, "limit")
				}
			}
		})
	}

	mockProjectService.AssertExpectations(t)
}

func TestListProjects(t *testing.T){
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	mockProjectService := mocks.MockProjectService{}


	handler := NewProjectHandler(&mockProjectService)

	project1 := data.Project{
		ID: uuid.New(),
	}
	project2 := data.Project{
		ID: uuid.New(),
	}

	mockProjectService.On("ListProjects", mock.Anything, mock.Anything).Return([]data.Project{project1, project2}, 2, nil)

	tests := map[string]struct {
		query     string
		wantCode  int
		wantError bool
	}{
		"Successful request": {
			query:     "?page=1&limit=10&sort_field=created_at&sort_order=desc",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Time params request": {
			query:     "?created_after=2006-01-02T15:04:05Z",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"Invalid query param values (validation fails)": {
			query:     "?page=-1&limit=-10&sort_field=height&sort_order=random",
			wantCode:  http.StatusUnprocessableEntity,
			wantError: true,
		},
		"Invalid query param names (default filter takes over)": {
			query:     "?page=1&limitS=-10&sort_fieldS=height&sort_orderS=random",
			wantCode:  http.StatusOK,
			wantError: false,
		},
		"No params": {
			query:     "?wwwaaaaaaah?!?+",
			wantCode:  http.StatusOK,
			wantError: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {

			req := httptest.NewRequest(http.MethodGet, "/"+tt.query, nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.List(c)

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

	mockProjectService.AssertExpectations(t)
}