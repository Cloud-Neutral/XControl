package roles

import "strings"

const (
	RoleUser     = "User"
	RoleOperator = "Operator"
	RoleAdmin    = "Admin"
)

var levelToRole = map[int]string{
	0:  RoleUser,
	10: RoleOperator,
	20: RoleAdmin,
}

var roleToLevel = map[string]int{
	strings.ToLower(RoleUser):     0,
	strings.ToLower(RoleOperator): 10,
	strings.ToLower(RoleAdmin):    20,
}

// DefaultLevel returns the default level assigned to new users.
func DefaultLevel() int { return 0 }

// DefaultRole returns the canonical role for DefaultLevel.
func DefaultRole() string { return RoleUser }

// ForLevel returns the canonical role for the provided level.
func ForLevel(level int) (string, bool) {
	role, ok := levelToRole[level]
	return role, ok
}

// Canonical normalizes the provided role string to its canonical representation.
func Canonical(role string) (string, bool) {
	trimmed := strings.TrimSpace(role)
	if trimmed == "" {
		return "", false
	}
	normalized := strings.ToLower(trimmed)
	lvl, ok := roleToLevel[normalized]
	if !ok {
		return "", false
	}
	return levelToRole[lvl], true
}

// LevelForRole returns the level associated with the provided role.
func LevelForRole(role string) (int, bool) {
	canonical, ok := Canonical(role)
	if !ok {
		return 0, false
	}
	return roleToLevel[strings.ToLower(canonical)], true
}

// Normalize returns a level and role pair that are guaranteed to be consistent.
// When neither the provided level nor role are recognized, the default mapping is used.
func Normalize(level int, role string) (int, string) {
	if canonicalRole, ok := ForLevel(level); ok {
		return level, canonicalRole
	}
	if lvl, ok := LevelForRole(role); ok {
		canonicalRole, _ := ForLevel(lvl)
		return lvl, canonicalRole
	}
	defaultLevel := DefaultLevel()
	canonicalRole, _ := ForLevel(defaultLevel)
	return defaultLevel, canonicalRole
}
