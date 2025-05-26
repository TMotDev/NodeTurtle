package mocks

import "github.com/stretchr/testify/mock"

type MockMailService struct {
	mock.Mock
}

func (m *MockMailService) SendEmail(to, subject, templateName string, data map[string]string) error {
	args := m.Called(to, subject, templateName, data)
	return args.Error(0)
}
