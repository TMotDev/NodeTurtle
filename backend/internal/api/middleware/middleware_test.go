package middleware

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/mocks"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/auth"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// createMockServices is a helper function to create new mock service instances
func createMockServices() (*mocks.MockAuthService, *mocks.MockUserService) {
	return new(mocks.MockAuthService), new(mocks.MockUserService)
}

// createTestContext creates a new Echo context with a request and recorder
func createTestContext(e *echo.Echo, authHeader string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}

	return c, rec
}

// testJWTSuccess tests if a JWT middleware call succeeds
func testJWTSuccess(t *testing.T, e *echo.Echo, mockAuth *mocks.MockAuthService, mockUser *mocks.MockUserService, tokenString string, expectedUsername string) {
	c, _ := createTestContext(e, "Bearer "+tokenString)

	h := JWT(mockAuth, mockUser)(func(c echo.Context) error {
		user, ok := c.Get("user").(*data.User)
		assert.True(t, ok, "Expected user in context")
		assert.NotNil(t, user)
		assert.Equal(t, expectedUsername, user.Username)
		return c.NoContent(http.StatusOK)
	})

	err := h(c)
	assert.Nil(t, err)

	mockAuth.AssertExpectations(t)
	mockUser.AssertExpectations(t)
}

// testJWTFailure tests if a JWT middleware call fails with the expected error
func testJWTFailure(t *testing.T, e *echo.Echo, mockAuth *mocks.MockAuthService, mockUser *mocks.MockUserService, authHeader string, expectedStatus int, expectedMessage string) {
	c, _ := createTestContext(e, authHeader)

	h := JWT(mockAuth, mockUser)(func(c echo.Context) error {
		t.Error("Handler function should not be called for error cases")
		return c.NoContent(http.StatusOK)
	})

	err := h(c)
	httpErr, ok := err.(*echo.HTTPError)
	assert.True(t, ok, "Expected HTTPError but got: %v", err)
	assert.Equal(t, expectedStatus, httpErr.Code)
	assert.Equal(t, expectedMessage, httpErr.Message)

	mockAuth.AssertExpectations(t)
	mockUser.AssertExpectations(t)
}

func TestJWT_ValidToken(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	userID := uuid.New()
	claims := &auth.Claims{
		Role: "user",
		StandardClaims: jwt.StandardClaims{
			Subject: userID.String(),
		},
	}
	user := &data.User{
		ID:       userID,
		Username: "testuser",
		Role:     data.Role{Name: "user"},
	}

	mockAuth.On("VerifyToken", "valid-token").Return(claims, nil)
	mockUser.On("GetUserByID", userID).Return(user, nil)

	testJWTSuccess(t, e, mockAuth, mockUser, "valid-token", "testuser")
}

func TestJWT_MissingAuthHeader(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	testJWTFailure(t, e, mockAuth, mockUser, "", http.StatusUnauthorized, "Missing authorization header")
}

func TestJWT_InvalidAuthFormat(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	testJWTFailure(t, e, mockAuth, mockUser, "InvalidFormat token", http.StatusUnauthorized, "Invalid authorization format")
}

func TestJWT_TokenWithoutBearerPrefix(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	testJWTFailure(t, e, mockAuth, mockUser, "token", http.StatusUnauthorized, "Invalid authorization format")
}

func TestJWT_InvalidToken(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	mockAuth.On("VerifyToken", "invalid-token").Return(nil, services.ErrInvalidToken)

	testJWTFailure(t, e, mockAuth, mockUser, "Bearer invalid-token", http.StatusUnauthorized, "Invalid or expired token")
}

func TestJWT_UserNotFound(t *testing.T) {
	e := echo.New()
	mockAuth, mockUser := createMockServices()

	userID := uuid.New()
	claims := &auth.Claims{
		Role: "user",
		StandardClaims: jwt.StandardClaims{
			Subject: userID.String(),
		},
	}

	mockAuth.On("VerifyToken", "valid-token-user-not-found").Return(claims, nil)
	mockUser.On("GetUserByID", userID).Return(nil, services.ErrUserNotFound)

	testJWTFailure(t, e, mockAuth, mockUser, "Bearer valid-token-user-not-found", http.StatusUnauthorized, "User not found")
}

func TestRequireRole_ValidRole(t *testing.T) {
	e := echo.New()

	user := &data.User{
		ID:       uuid.New(),
		Username: "adminuser",
		Role:     data.Role{Name: data.RoleAdmin.String()},
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	c.Set("user", user)

	h := RequireRole(data.RoleAdmin.String())(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.True(t, ok, "Expected user in context")
		assert.NotNil(t, u)
		assert.Equal(t, "adminuser", u.Username)
		return c.NoContent(http.StatusOK)
	})

	err := h(c)
	assert.Nil(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestRequireRole_InvalidRole(t *testing.T) {
	e := echo.New()

	user := &data.User{
		ID:       uuid.New(),
		Username: "user",
		Role:     data.Role{Name: data.RoleUser.String()},
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	c.Set("user", user)

	h := RequireRole(data.RoleAdmin.String())(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.True(t, ok, "Expected user in context")
		assert.NotNil(t, u)
		assert.Equal(t, "user", u.Username)
		return c.NoContent(http.StatusForbidden)
	})

	err := h(c)
	httpErr, ok := err.(*echo.HTTPError)
	assert.True(t, ok)
	assert.NotNil(t, err)
	assert.Equal(t, http.StatusForbidden, httpErr.Code)
}

func TestRequireRole_NoUserInContext(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := RequireRole(data.RoleAdmin.String())(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.False(t, ok, "Expected user in context")
		assert.Nil(t, u)
		return c.NoContent(http.StatusUnauthorized)
	})

	err := h(c)
	httpErr, ok := err.(*echo.HTTPError)
	assert.True(t, ok)
	assert.NotNil(t, err)
	assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
}

func TestCheckBan_UserNotBanned(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	user := &data.User{
		ID:       uuid.New(),
		Username: "user",
		Role:     data.Role{Name: data.RoleUser.String()},
		Ban: &data.Ban{
			ExpiresAt: time.Now().Add(-time.Hour), // expired ban
		},
	}
	c.Set("user", user)

	h := CheckBan(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.True(t, ok, "Expected user in context")
		assert.NotNil(t, u)
		return c.NoContent(http.StatusOK)
	})

	err := h(c)
	assert.Nil(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}
func TestCheckBan_NoContextUser(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := CheckBan(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.False(t, ok, "Expected no user in context")
		assert.Nil(t, u)
		return c.NoContent(http.StatusUnauthorized)
	})

	err := h(c)
	httpErr, ok := err.(*echo.HTTPError)
	assert.True(t, ok)
	assert.NotNil(t, err)
	assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
}

func TestCheckBan_UserIsBanned(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	user := &data.User{
		ID:       uuid.New(),
		Username: "user",
		Role:     data.Role{Name: data.RoleUser.String()},
		Ban: &data.Ban{
			ExpiresAt: time.Now().Add(time.Hour),
		},
	}
	c.Set("user", user)

	h := CheckBan(func(c echo.Context) error {
		u, ok := c.Get("user").(*data.User)
		assert.True(t, ok, "Expected user in context")
		assert.NotNil(t, u)
		return c.NoContent(http.StatusForbidden)
	})

	err := h(c)
	httpErr, ok := err.(*echo.HTTPError)
	assert.True(t, ok)
	assert.NotNil(t, httpErr)
	assert.Equal(t, http.StatusForbidden, httpErr.Code)
}
