package mail

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"

	"NodeTurtleAPI/internal/config"

	"gopkg.in/gomail.v2"
)

type IMailService interface {
	SendEmail(to, subject, templateName string, data map[string]string) error
}

type MailService struct {
	config    config.MailConfig
	templates map[string]*template.Template
	dialer    *gomail.Dialer
}

func NewMailService(cfg config.MailConfig) MailService {
	templates := make(map[string]*template.Template)
	templateDir := "internal/services/mail/templates"

	templateFiles := []string{"activation", "reset", "deactivation"}
	for _, name := range templateFiles {
		templatePath := filepath.Join(templateDir, name+".html")
		tmpl, err := template.ParseFiles(templatePath)
		if err != nil {
			fmt.Printf("Failed to load email template %s: %v\n", name, err)
			continue
		}
		templates[name] = tmpl
	}

	dialer := gomail.NewDialer(cfg.Host, cfg.Port, cfg.Username, cfg.Password)

	return MailService{
		config:    cfg,
		templates: templates,
		dialer:    dialer,
	}
}

func (s *MailService) SendEmail(to, subject, templateName string, data map[string]string) error {
	tmpl, ok := s.templates[templateName]
	if !ok {
		return fmt.Errorf("template %s not found", templateName)
	}

	var body bytes.Buffer

	route, present := data["url"]
	if present {
		// attach client url to the route
		route = s.config.ClientURL + route
		data["url"] = route
	}

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
