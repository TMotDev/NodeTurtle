// Package data provides data models and structures for the application.
package data

import "time"

// Role represents a user role in the system with its associated permissions.
type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// role is an enumeration type for the different user roles in the system.
type role int

// Predefined user roles with increasing permission levels.
const (
	// RoleUser is the standard user role with basic permissions.
	RoleUser role = iota + 1

	// RolePremium is for users with premium subscriptions and additional features.
	RolePremium

	// RoleModerator has content moderation capabilities.
	RoleModerator

	// RoleAdmin has full system access and administrative capabilities.
	RoleAdmin
)

// RolesByID maps role enum values to their string representations.
var RolesByID = map[role]string{
	RoleUser:      "user",
	RolePremium:   "premium",
	RoleModerator: "moderator",
	RoleAdmin:     "admin",
}

// RolesByName maps string role names to their corresponding enum values.
var RolesByName = map[string]role{
	"user":      RoleUser,
	"premium":   RolePremium,
	"moderator": RoleModerator,
	"admin":     RoleAdmin,
}

// String returns the string representation of a role.
func (r role) String() string {
	return RolesByID[r]
}
