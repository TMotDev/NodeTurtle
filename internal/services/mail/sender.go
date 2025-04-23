package mail

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"

	"NodeTurtleAPI/internal/config"

	"gopkg.in/gomail.v2"
)

// Service provides email functionality
type Service struct {
	config    config.MailConfig
	templates map[string]*template.Template
	dialer    *gomail.Dialer
}

// NewService creates a new mail service
func NewService(cfg config.MailConfig) *Service {
	// Initialize email templates
	templates := make(map[string]*template.Template)
	templateDir := "internal/services/mail/templates"

	// Load templates
	templateFiles := []string{"activation", "reset", "welcome"}
	for _, name := range templateFiles {
		templatePath := filepath.Join(templateDir, name+".html")
		tmpl, err := template.ParseFiles(templatePath)
		if err != nil {
			// Log error and continue
			fmt.Printf("Failed to load email template %s: %v\n", name, err)
			continue
		}
		templates[name] = tmpl
	}

	// Setup mailer
	dialer := gomail.NewDialer(cfg.Host, cfg.Port, cfg.Username, cfg.Password)

	return &Service{
		config:    cfg,
		templates: templates,
		dialer:    dialer,
	}
}

// SendEmail sends an email using a template
func (s *Service) SendEmail(to, subject, templateName string, data map[string]interface{}) error {
	tmpl, ok := s.templates[templateName]
	if !ok {
		return fmt.Errorf("template %s not found", templateName)
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return err
	}

	m := gomail.NewMessage()
	m.SetHeader("From", s.config.From)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body.String())

	return s.dialer.DialAndSend(m)
}
