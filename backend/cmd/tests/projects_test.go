package tests

import (
	"NodeTurtleAPI/internal/data"
	"NodeTurtleAPI/internal/services"
	"NodeTurtleAPI/internal/services/projects"
	"encoding/json"
	"fmt"
	"log"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func setupProjectService() (projects.IProjectService, TestData, func()) {
	testData, db, err := createTestData()

	if err != nil {
		log.Fatalf("Failed setup test data: %v", err)
	}

	return projects.NewProjectService(db), *testData, func() { db.Close() }
}

func TestCreateProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()
	p := data.ProjectCreate{
		Title:       "testProject",
		Description: "A Test Project",
		Data:        json.RawMessage([]byte(`{}`)),
		CreatorID:   td.Users[UserAlice].ID,
		IsPublic:    false,
	}

	project, err := s.CreateProject(p)

	assert.NoError(t, err)
	assert.NotNil(t, project)

}

func TestDeleteProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	tests := map[string]struct {
		projectID uuid.UUID
		err       error
	}{
		"Successful project delete": {
			projectID: td.Projects[ProjectAlicePrivate].ID,
			err:       nil,
		},
		"Project ID not found": {
			projectID: uuid.New(),
			err:       services.ErrRecordNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			err := s.DeleteProject(tt.projectID)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestGetProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	tests := map[string]struct {
		projectID        uuid.UUID
		requestingUserID uuid.UUID
		err              error
	}{
		"Successful private project fetch": {
			projectID:        td.Projects[ProjectAlicePrivate].ID,
			requestingUserID: td.Projects[ProjectAlicePrivate].CreatorID,
			err:              nil,
		},
		"Failed to fetch private project for non-owner": {
			projectID:        td.Projects[ProjectBobPrivate].ID,
			requestingUserID: td.Projects[ProjectBobPrivate].LikedByUsers[0],
			err:              services.ErrRecordNotFound,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			p, err := s.GetProject(tt.projectID, tt.requestingUserID)

			if tt.err != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.err, err)
				assert.Nil(t, p)
			} else {
				assert.NotNil(t, p)
				assert.NoError(t, err)
				assert.Equal(t, nil, err)
			}
		})
	}
}

func TestGetUserProjects(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	tests := map[string]struct {
		profileUserID         uuid.UUID
		requestingUserID      uuid.UUID
		expectPrivateProjects bool
		expectedArrayLength   int
	}{
		"Requester is the owner of the projects": {
			profileUserID:         td.Users[UserAlice].ID,
			requestingUserID:      td.Users[UserAlice].ID,
			expectPrivateProjects: true,
			expectedArrayLength:   3,
		},
		"Requester is not the owner of the projects": {
			profileUserID:         td.Users[UserAlice].ID,
			requestingUserID:      uuid.New(),
			expectPrivateProjects: false,
			expectedArrayLength:   2,
		},
		"No projects found because user does not exist": {
			profileUserID:         uuid.New(),
			requestingUserID:      td.Users[UserAlice].ID,
			expectPrivateProjects: false,
			expectedArrayLength:   0,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			p, err := s.GetUserProjects(tt.profileUserID, tt.requestingUserID)

			assert.NoError(t, err)
			assert.Equal(t, nil, err)
			assert.Equal(t, tt.expectedArrayLength, len(p))

			hasPrivate := false
			for _, proj := range p {
				fmt.Println(proj.CreatorUsername, proj.Description)
				if proj.IsPublic == false {
					hasPrivate = true
					break
				}
			}
			if tt.expectPrivateProjects {
				assert.True(t, hasPrivate, "Expected at least one private project, but all are public")
			} else {
				assert.True(t, !hasPrivate || len(p) == 0, "Expected only public projects or none")
			}

		})
	}
}

func TestGetFeaturedProjects(t *testing.T) {
	s, _, close := setupProjectService()
	defer close()

	limit := 5
	page := 1
	expectedLength := 1

	p, err := s.GetFeaturedProjects(limit, page)

	if err != nil {
		assert.Error(t, err)
		assert.Nil(t, p)
	} else {
		assert.NotNil(t, p)
		assert.NoError(t, err)
		assert.Equal(t, nil, err)
		assert.Equal(t, expectedLength, len(p))
	}
}

func TestGetLikedProjects(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	userID := td.Users[UserBob].ID
	expectedLength := 4

	p, err := s.GetLikedProjects(userID)

	if err != nil {
		assert.Error(t, err)
		assert.Nil(t, p)
	} else {
		assert.NotNil(t, p)
		assert.NoError(t, err)
		assert.Equal(t, nil, err)
		assert.Equal(t, expectedLength, len(p))
	}
}

func TestLikeProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	project := td.Projects[ProjectChrisAdmin]
	initialLikes := project.LikesCount
	user := td.Users[UserJohn]

	err := s.LikeProject(project.ID, user.ID)
	assert.NoError(t, err)

	// try liking the project twice
	err = s.LikeProject(project.ID, user.ID)
	assert.NoError(t, err)

	if err != nil {
		assert.Error(t, err)
	} else {
		assert.Equal(t, nil, err)

		p, err := s.GetProject(project.ID, user.ID)

		assert.NoError(t, err)

		// Expecting increased likes
		assert.Equal(t, initialLikes+1, p.LikesCount)
	}
}

func TestUnlikeProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	project := td.Projects[ProjectBobFeatured]
	initialLikes := project.LikesCount
	userID := project.LikedByUsers[0]

	err := s.UnlikeProject(project.ID, userID)
	assert.NoError(t, err)

	// try unliking the project twice
	err = s.UnlikeProject(project.ID, userID)
	assert.NoError(t, err)

	if err != nil {
		assert.Error(t, err)
	} else {
		assert.Equal(t, nil, err)

		p, err := s.GetProject(project.ID, userID)

		assert.NoError(t, err)

		// Expecting increased likes
		assert.Equal(t, initialLikes-1, p.LikesCount)
	}
}

func TestUnlikeProject_NotLikedInitially(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	project := td.Projects[ProjectAlicePublic]
	initialLikes := project.LikesCount
	userID := td.Users[UserJohn].ID

	err := s.UnlikeProject(project.ID, userID)
	assert.NoError(t, err)

	// try unliking the project twice
	err = s.UnlikeProject(project.ID, userID)
	assert.NoError(t, err)

	if err != nil {
		assert.Error(t, err)
	} else {
		assert.Equal(t, nil, err)

		p, err := s.GetProject(project.ID, userID)

		assert.NoError(t, err)

		assert.Equal(t, initialLikes, p.LikesCount)
	}
}

func TestUpdateProject(t *testing.T) {
	s, td, close := setupProjectService()
	defer close()

	project := td.Projects[ProjectAlicePrivate]

	newTitle := "Updated Title"
	newDescription := "Updated Description"
	newIsPublic := false

	update := data.ProjectUpdate{
		ID:          project.ID,
		Title:       &newTitle,
		Description: &newDescription,
		IsPublic:    &newIsPublic,
	}

	updatedProject, err := s.UpdateProject(update)
	assert.NoError(t, err)
	assert.NotNil(t, updatedProject)
	assert.Equal(t, newTitle, updatedProject.Title)
	assert.Equal(t, newDescription, updatedProject.Description)
	assert.Equal(t, newIsPublic, updatedProject.IsPublic)

	// Try updating with no fields (should error)
	emptyUpdate := data.ProjectUpdate{ID: project.ID}
	updatedProject, err = s.UpdateProject(emptyUpdate)
	assert.Error(t, err)
	assert.Nil(t, updatedProject)
	assert.Equal(t, services.ErrNoFields, err)

	// Try updating a non-existent project
	badID := uuid.New()
	update.ID = badID
	updatedProject, err = s.UpdateProject(update)
	assert.Error(t, err)
	assert.Nil(t, updatedProject)
	assert.Equal(t, services.ErrRecordNotFound, err)
}

func TestIsOwner(t *testing.T) {
	s, td, close := setupProjectService()

	tests := map[string]struct {
		projectID uuid.UUID
		userID    uuid.UUID
		isOwner   bool
	}{
		"Valid owner": {
			projectID: td.Projects[ProjectAlicePublic].ID,
			userID:    td.Projects[ProjectAlicePublic].CreatorID,
			isOwner:   true,
		},
		"Not Owner": {
			projectID: td.Projects[ProjectAlicePublic].ID,
			userID:    uuid.New(),
			isOwner:   false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			isOwner, err := s.IsOwner(tt.projectID, tt.userID)

			assert.NoError(t, err)
			assert.Equal(t, tt.isOwner, isOwner)
		})
	}

	defer close()
}
