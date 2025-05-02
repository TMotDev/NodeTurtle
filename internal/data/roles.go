package data

import "time"

type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// role enum
type role int

const (
	RoleUser role = iota + 1
	RolePremium
	RoleModerator
	RoleAdmin
)

// Returns role as string
var RolesByID = map[role]string{
	RoleUser:      "user",
	RolePremium:   "premium",
	RoleModerator: "moderator",
	RoleAdmin:     "admin",
}

// Returns role as role(int)
var RolesByName = map[string]role{
	"user":      RoleUser,
	"premium":   RolePremium,
	"moderator": RoleModerator,
	"admin":     RoleAdmin,
}

func (r role) String() string {
	return RolesByID[r]
}
