package mocks

import (
	"NodeTurtleAPI/internal/data"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockProjectService struct {
	mock.Mock
}

func (m *MockProjectService) CreateProject(p data.ProjectCreate) (*data.Project, error) {
	args := m.Called(p)
	var project *data.Project
	if args.Get(0) != nil {
		project = args.Get(0).(*data.Project)
	}
	return project, args.Error(1)
}

func (m *MockProjectService) GetProject(projectID, requestingUserID uuid.UUID) (*data.Project, error) {
	args := m.Called(projectID, requestingUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*data.Project), args.Error(1)
}

func (m *MockProjectService) GetUserProjects(profileUserID, requestingUserID uuid.UUID) ([]data.Project, error) {
	args := m.Called(profileUserID, requestingUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]data.Project), args.Error(1)
}

func (m *MockProjectService) GetFeaturedProjects(limit, offset int) ([]data.Project, error) {
	args := m.Called(limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]data.Project), args.Error(1)
}

func (m *MockProjectService) GetLikedProjects(userID uuid.UUID) ([]data.Project, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]data.Project), args.Error(1)
}

func (m *MockProjectService) LikeProject(projectID, userID uuid.UUID) error {
	args := m.Called(projectID, userID)
	return args.Error(0)
}

func (m *MockProjectService) UnlikeProject(projectID, userID uuid.UUID) error {
	args := m.Called(projectID, userID)
	return args.Error(0)
}

func (m *MockProjectService) UpdateProject(p data.ProjectUpdate) (*data.Project, error) {
	args := m.Called(p)
	var project *data.Project
	if args.Get(0) != nil {
		project = args.Get(0).(*data.Project)
	}
	return project, args.Error(1)
}

func (m *MockProjectService) DeleteProject(projectID uuid.UUID) error {
	args := m.Called(projectID)
	return args.Error(0)
}

func (m *MockProjectService) GetPublicProjects(filters data.PublicProjectFilter) ([]data.Project, int, error) {
	args := m.Called(filters)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]data.Project), args.Int(1), args.Error(2)
}

func (m *MockProjectService) IsOwner(projectID, userID uuid.UUID) (bool, error) {
	args := m.Called(projectID, userID)
	return args.Get(0).(bool), args.Error(1)
}

func (m *MockProjectService) ListProjects(filters data.ProjectFilter) ([]data.Project, int, error) {
	args := m.Called(filters)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]data.Project), args.Int(1), args.Error(2)
}