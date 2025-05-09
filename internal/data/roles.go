// Package data provides data models and structures for the application.
package data

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Role represents a user role in the system with its associated permissions.
type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// RoleType is an enumeration type for the different user roles in the system.
type RoleType string

// Predefined user roles with increasing permission levels.
const (
	// RoleUser is the standard user role with basic permissions.
	RoleUser RoleType = "user"

	// RolePremium is for users with premium subscriptions and additional features.
	RolePremium RoleType = "premium"

	// RoleModerator has content moderation capabilities.
	RoleModerator RoleType = "moderator"

	// RoleAdmin has full system access and administrative capabilities.
	RoleAdmin RoleType = "admin"
)

// RolesAsInt maps role types to their ID values.
var RolesAsInt = map[RoleType]int64{
	RoleUser:      1,
	RolePremium:   2,
	RoleModerator: 3,
	RoleAdmin:     4,
}

// RolesAsString maps ID values to role types.
var RolesAsString = map[int64]RoleType{
	1: RoleUser,
	2: RolePremium,
	3: RoleModerator,
	4: RoleAdmin,
}

// String returns the string representation of a role.
func (r RoleType) String() string {
	return string(r)
}

// IsValid checks if the role type is one of the predefined roles.
func (r RoleType) IsValid() bool {
	_, exists := RolesAsInt[r]
	return exists
}

// ToID converts a role type to its ID.
func (r RoleType) ToID() int64 {
	return RolesAsInt[r]
}

// FromID creates a role type from a ID.
func FromID(id int64) (RoleType, error) {
	if role, exists := RolesAsString[id]; exists {
		return role, nil
	}
	return "", fmt.Errorf("invalid role ID: %d", id)
}

// MarshalJSON implements the json.Marshaler interface.
func (r RoleType) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(r))
}

// UnmarshalJSON implements the json.Unmarshaler interface.
func (r *RoleType) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	role := RoleType(s)
	if !role.IsValid() {
		return fmt.Errorf("invalid role: %s", s)
	}

	*r = role
	return nil
}

// Value implements the driver.Valuer interface.
func (r RoleType) Value() (driver.Value, error) {
	return RolesAsInt[r], nil
}

// Scan implements the sql.Scanner interface.
func (r *RoleType) Scan(value interface{}) error {
	if value == nil {
		*r = RoleUser
		return nil
	}

	var id int64
	switch v := value.(type) {
	case int64:
		id = v
	case int:
		id = int64(v)
	default:
		return errors.New("invalid role ID type")
	}

	if role, exists := RolesAsString[id]; exists {
		*r = role
		return nil
	}

	return fmt.Errorf("invalid role ID: %d", id)
}

// AllRoles returns a slice of all available role types.
func AllRoles() []RoleType {
	roles := make([]RoleType, 0, len(RolesAsInt))
	for role := range RolesAsInt {
		roles = append(roles, role)
	}
	return roles
}
