package store

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"xcontrol/internal/roles"
)

// User represents an account within the account service domain.
type User struct {
	ID                string
	Name              string
	Email             string
	EmailVerified     bool
	Level             int
	Role              string
	Groups            []string
	Permissions       []string
	PasswordHash      string
	MFATOTPSecret     string
	MFAEnabled        bool
	MFASecretIssuedAt time.Time
	MFAConfirmedAt    time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// Store provides persistence operations for users.
type Store interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByName(ctx context.Context, name string) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
}

// Domain level errors returned by the store implementation.
var (
	ErrEmailExists     = errors.New("email already exists")
	ErrNameExists      = errors.New("name already exists")
	ErrInvalidName     = errors.New("invalid user name")
	ErrUserNotFound    = errors.New("user not found")
	ErrMFANotSupported = errors.New("mfa is not supported by the current store schema")
)

// memoryStore provides an in-memory implementation of Store. It is suitable for
// unit tests and local development where a persistent database is not yet
// configured.
type memoryStore struct {
	mu      sync.RWMutex
	byID    map[string]*User
	byEmail map[string]*User
	byName  map[string]*User
}

// NewMemoryStore creates a new in-memory store implementation.
func NewMemoryStore() Store {
	return &memoryStore{
		byID:    make(map[string]*User),
		byEmail: make(map[string]*User),
		byName:  make(map[string]*User),
	}
}

// CreateUser persists a user in the in-memory store.
func (s *memoryStore) CreateUser(ctx context.Context, user *User) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	loweredEmail := strings.ToLower(strings.TrimSpace(user.Email))
	normalizedName := strings.TrimSpace(user.Name)

	ensureAccessConsistency(user)

	if normalizedName == "" {
		return ErrInvalidName
	}

	if _, exists := s.byEmail[loweredEmail]; exists {
		return ErrEmailExists
	}
	if _, exists := s.byName[strings.ToLower(normalizedName)]; exists {
		return ErrNameExists
	}
	userCopy := cloneUser(user)
	if userCopy.ID == "" {
		userCopy.ID = uuid.NewString()
	}
	if userCopy.CreatedAt.IsZero() {
		now := time.Now().UTC()
		userCopy.CreatedAt = now
		if userCopy.UpdatedAt.IsZero() {
			userCopy.UpdatedAt = now
		}
	}
	if userCopy.UpdatedAt.IsZero() {
		userCopy.UpdatedAt = time.Now().UTC()
	}
	userCopy.Email = loweredEmail
	userCopy.Name = normalizedName
	stored := userCopy
	s.byID[userCopy.ID] = stored
	if loweredEmail != "" {
		s.byEmail[loweredEmail] = stored
	}
	s.byName[strings.ToLower(normalizedName)] = stored
	*user = *cloneUser(stored)
	return nil
}

// GetUserByEmail fetches a user by email, returning ErrUserNotFound when the
// user does not exist.
func (s *memoryStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.byEmail[strings.ToLower(email)]
	if !ok {
		return nil, ErrUserNotFound
	}
	return cloneUser(user), nil
}

// GetUserByID fetches a user by unique identifier, returning ErrUserNotFound
// when absent.
func (s *memoryStore) GetUserByID(ctx context.Context, id string) (*User, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.byID[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	return cloneUser(user), nil
}

// GetUserByName fetches a user by case-insensitive username, returning
// ErrUserNotFound when absent.
func (s *memoryStore) GetUserByName(ctx context.Context, name string) (*User, error) {
	_ = ctx
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		return nil, ErrUserNotFound
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.byName[normalized]
	if !ok {
		return nil, ErrUserNotFound
	}

	return cloneUser(user), nil
}

// UpdateUser replaces the persisted user representation in memory.
func (s *memoryStore) UpdateUser(ctx context.Context, user *User) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.byID[user.ID]
	if !ok {
		return ErrUserNotFound
	}

	normalizedName := strings.TrimSpace(user.Name)
	loweredEmail := strings.ToLower(strings.TrimSpace(user.Email))

	ensureAccessConsistency(user)

	if normalizedName == "" {
		return ErrInvalidName
	}

	// Re-index username if it changed.
	oldNameKey := strings.ToLower(existing.Name)
	newNameKey := strings.ToLower(normalizedName)
	if oldNameKey != newNameKey {
		if _, exists := s.byName[newNameKey]; exists {
			return ErrNameExists
		}
		delete(s.byName, oldNameKey)
	}

	// Re-index email if it changed.
	oldEmailKey := strings.ToLower(existing.Email)
	if oldEmailKey != loweredEmail {
		if loweredEmail != "" {
			if _, exists := s.byEmail[loweredEmail]; exists {
				return ErrEmailExists
			}
		}
		if oldEmailKey != "" {
			delete(s.byEmail, oldEmailKey)
		}
	}

	updated := *existing
	updated.Name = normalizedName
	updated.Email = loweredEmail
	updated.EmailVerified = user.EmailVerified
	updated.Level = user.Level
	updated.Role = user.Role
	updated.Groups = append([]string(nil), user.Groups...)
	updated.Permissions = append([]string(nil), user.Permissions...)
	updated.PasswordHash = user.PasswordHash
	updated.MFATOTPSecret = user.MFATOTPSecret
	updated.MFAEnabled = user.MFAEnabled
	updated.MFASecretIssuedAt = user.MFASecretIssuedAt
	updated.MFAConfirmedAt = user.MFAConfirmedAt
	if user.CreatedAt.IsZero() {
		updated.CreatedAt = existing.CreatedAt
	} else {
		updated.CreatedAt = user.CreatedAt
	}
	if user.UpdatedAt.IsZero() {
		updated.UpdatedAt = time.Now().UTC()
	} else {
		updated.UpdatedAt = user.UpdatedAt
	}

	stored := cloneUser(&updated)
	s.byID[user.ID] = stored
	s.byName[newNameKey] = stored
	if loweredEmail != "" {
		s.byEmail[loweredEmail] = stored
	}

	*user = *cloneUser(stored)
	return nil
}

func ensureAccessConsistency(user *User) {
	if user == nil {
		return
	}
	level, role := roles.Normalize(user.Level, user.Role)
	user.Level = level
	user.Role = role
	user.Groups = normalizeAccessList(user.Groups)
	user.Permissions = normalizeAccessList(user.Permissions)
}

func normalizeAccessList(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

func cloneUser(user *User) *User {
	if user == nil {
		return nil
	}
	clone := *user
	if len(user.Groups) > 0 {
		clone.Groups = append([]string(nil), user.Groups...)
	} else {
		clone.Groups = nil
	}
	if len(user.Permissions) > 0 {
		clone.Permissions = append([]string(nil), user.Permissions...)
	} else {
		clone.Permissions = nil
	}
	return &clone
}
