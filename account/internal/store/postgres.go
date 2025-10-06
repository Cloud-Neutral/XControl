package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/lib/pq"

	"xcontrol/internal/roles"
)

// Config describes how to construct a Store implementation.
type Config struct {
	Driver          string
	DSN             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// New creates a Store implementation based on the provided configuration.
func New(ctx context.Context, cfg Config) (Store, func(context.Context) error, error) {
	driver := strings.ToLower(strings.TrimSpace(cfg.Driver))
	if driver == "" || driver == "memory" {
		return NewMemoryStore(), func(context.Context) error { return nil }, nil
	}

	switch driver {
	case "postgres", "postgresql", "pgx":
		if strings.TrimSpace(cfg.DSN) == "" {
			return nil, nil, errors.New("store dsn is required for postgres driver")
		}

		db, err := sql.Open("pgx", cfg.DSN)
		if err != nil {
			return nil, nil, err
		}

		if cfg.MaxOpenConns > 0 {
			db.SetMaxOpenConns(cfg.MaxOpenConns)
		}
		if cfg.MaxIdleConns > 0 {
			db.SetMaxIdleConns(cfg.MaxIdleConns)
		}
		if cfg.ConnMaxLifetime > 0 {
			db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
		}
		if cfg.ConnMaxIdleTime > 0 {
			db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
		}

		if err := db.PingContext(ctx); err != nil {
			db.Close()
			return nil, nil, err
		}

		cleanup := func(context.Context) error {
			return db.Close()
		}

		return &postgresStore{db: db}, cleanup, nil
	default:
		return nil, nil, fmt.Errorf("unsupported store driver %q", cfg.Driver)
	}
}

type schemaCapabilities struct {
	hasMFATOTPSecret     bool
	hasMFAEnabled        bool
	hasMFASecretIssuedAt bool
	hasMFAConfirmedAt    bool
	hasCreatedAt         bool
	hasUpdatedAt         bool
	hasLevel             bool
	hasRole              bool
	hasGroups            bool
	hasPermissions       bool
}

func (c schemaCapabilities) supportsMFA() bool {
	return c.hasMFATOTPSecret && c.hasMFAEnabled && c.hasMFASecretIssuedAt && c.hasMFAConfirmedAt
}

type postgresStore struct {
	db *sql.DB

	capsMu     sync.RWMutex
	caps       schemaCapabilities
	capsLoaded bool
}

func (s *postgresStore) CreateUser(ctx context.Context, user *User) error {
	normalizedEmail := strings.ToLower(strings.TrimSpace(user.Email))
	normalizedName := strings.TrimSpace(user.Name)
	if normalizedName == "" {
		return ErrInvalidName
	}

	ensureAccessConsistency(user)

	exists, err := s.userExistsByName(ctx, normalizedName)
	if err != nil {
		return err
	}
	if exists {
		return ErrNameExists
	}

	if normalizedEmail != "" {
		exists, err = s.userExistsByEmail(ctx, normalizedEmail)
		if err != nil {
			return err
		}
		if exists {
			return ErrEmailExists
		}
	}

	caps, err := s.capabilities(ctx)
	if err != nil {
		return err
	}

	var verifiedAt any
	if user.EmailVerified {
		verifiedAt = time.Now().UTC()
	}

	columns := []string{"username", "password", "email", "email_verified_at"}
	placeholders := []string{"$1", "$2", "$3", "$4"}
	args := []any{normalizedName, user.PasswordHash, normalizedEmail, verifiedAt}
	idx := 5

	if caps.hasLevel {
		columns = append(columns, "level")
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx))
		args = append(args, user.Level)
		idx++
	}
	if caps.hasRole {
		columns = append(columns, "role")
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx))
		args = append(args, user.Role)
		idx++
	}
	if caps.hasGroups {
		columns = append(columns, "groups")
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx))
		args = append(args, arrayForQuery(user.Groups))
		idx++
	}
	if caps.hasPermissions {
		columns = append(columns, "permissions")
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx))
		args = append(args, arrayForQuery(user.Permissions))
		idx++
	}

	query := fmt.Sprintf(`INSERT INTO users (%s)
      VALUES (%s)
      RETURNING uuid, coalesce(created_at, now()), coalesce(updated_at, now()), email_verified`, strings.Join(columns, ", "), strings.Join(placeholders, ", "))

	var idValue any
	var createdAt time.Time
	var updatedAt time.Time
	var emailVerified sql.NullBool
	err = s.db.QueryRowContext(ctx, query, args...).Scan(&idValue, &createdAt, &updatedAt, &emailVerified)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrUserNotFound
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" { // unique_violation
				switch {
				case strings.Contains(pgErr.ConstraintName, "email"):
					return ErrEmailExists
				case strings.Contains(pgErr.ConstraintName, "name") || strings.Contains(pgErr.ConstraintName, "username"):
					return ErrNameExists
				}
			}
		}
		return err
	}

	identifier, err := formatIdentifier(idValue)
	if err != nil {
		return err
	}

	user.ID = identifier
	user.Name = normalizedName
	user.Email = normalizedEmail
	user.CreatedAt = createdAt.UTC()
	user.UpdatedAt = updatedAt.UTC()
	user.EmailVerified = emailVerified.Bool
	return nil
}

func (s *postgresStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return nil, ErrUserNotFound
	}

	caps, err := s.capabilities(ctx)
	if err != nil {
		return nil, err
	}

	query := s.selectUserQuery(caps, "WHERE lower(email) = $1 LIMIT 1")

	row := s.db.QueryRowContext(ctx, query, normalized)
	return scanUser(row)
}

func (s *postgresStore) GetUserByName(ctx context.Context, name string) (*User, error) {
	normalized := strings.TrimSpace(name)
	if normalized == "" {
		return nil, ErrUserNotFound
	}

	caps, err := s.capabilities(ctx)
	if err != nil {
		return nil, err
	}

	query := s.selectUserQuery(caps, "WHERE lower(username) = lower($1) LIMIT 1")

	row := s.db.QueryRowContext(ctx, query, normalized)
	return scanUser(row)
}

func (s *postgresStore) GetUserByID(ctx context.Context, id string) (*User, error) {
	caps, err := s.capabilities(ctx)
	if err != nil {
		return nil, err
	}

	query := s.selectUserQuery(caps, "WHERE uuid = $1")

	row := s.db.QueryRowContext(ctx, query, id)
	return scanUser(row)
}

func (s *postgresStore) userExistsByEmail(ctx context.Context, email string) (bool, error) {
	if email == "" {
		return false, nil
	}

	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1`, email).Scan(&exists)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return false, err
}

func (s *postgresStore) userExistsByName(ctx context.Context, name string) (bool, error) {
	if name == "" {
		return false, nil
	}

	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1`, name).Scan(&exists)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return false, err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*User, error) {
	var (
		idValue         any
		username        sql.NullString
		email           sql.NullString
		emailVerified   sql.NullBool
		password        sql.NullString
		mfaSecret       sql.NullString
		mfaEnabled      sql.NullBool
		mfaSecretIssued sql.NullTime
		mfaConfirmed    sql.NullTime
		level           sql.NullInt64
		role            sql.NullString
		groups          pq.StringArray
		permissions     pq.StringArray
		createdAt       time.Time
		updatedAt       time.Time
	)

	if err := row.Scan(&idValue, &username, &email, &emailVerified, &password, &mfaSecret, &mfaEnabled, &mfaSecretIssued, &mfaConfirmed, &level, &role, &groups, &permissions, &createdAt, &updatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	identifier, err := formatIdentifier(idValue)
	if err != nil {
		return nil, err
	}

	levelValue := 0
	if level.Valid {
		levelValue = int(level.Int64)
	}
	normalizedRole := role.String
	levelValue, normalizedRole = roles.Normalize(levelValue, normalizedRole)

	groupsList := normalizeAccessList([]string(groups))
	permissionsList := normalizeAccessList([]string(permissions))

	user := &User{
		ID:                identifier,
		Name:              strings.TrimSpace(username.String),
		Email:             strings.ToLower(strings.TrimSpace(email.String)),
		EmailVerified:     emailVerified.Bool,
		Level:             levelValue,
		Role:              normalizedRole,
		Groups:            groupsList,
		Permissions:       permissionsList,
		PasswordHash:      password.String,
		MFATOTPSecret:     strings.TrimSpace(mfaSecret.String),
		MFAEnabled:        mfaEnabled.Bool,
		MFASecretIssuedAt: toUTCTime(mfaSecretIssued),
		MFAConfirmedAt:    toUTCTime(mfaConfirmed),
		CreatedAt:         createdAt.UTC(),
		UpdatedAt:         updatedAt.UTC(),
	}
	return user, nil
}

func (s *postgresStore) UpdateUser(ctx context.Context, user *User) error {
	normalizedName := strings.TrimSpace(user.Name)
	if normalizedName == "" {
		return ErrInvalidName
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(user.Email))

	caps, err := s.capabilities(ctx)
	if err != nil {
		return err
	}

	ensureAccessConsistency(user)

	var issuedAt any
	if !user.MFASecretIssuedAt.IsZero() {
		issuedAt = user.MFASecretIssuedAt.UTC()
	}
	var confirmedAt any
	if !user.MFAConfirmedAt.IsZero() {
		confirmedAt = user.MFAConfirmedAt.UTC()
	}

	builder := strings.Builder{}
	builder.WriteString("UPDATE users SET username = $1, email = $2, password = $3")

	if user.EmailVerified {
		builder.WriteString(", email_verified_at = COALESCE(email_verified_at, now())")
	} else {
		builder.WriteString(", email_verified_at = NULL")
	}

	args := []any{normalizedName, normalizedEmail, user.PasswordHash}
	idx := 4

	if caps.hasLevel {
		builder.WriteString(fmt.Sprintf(", level = $%d", idx))
		args = append(args, user.Level)
		idx++
	}

	if caps.hasRole {
		builder.WriteString(fmt.Sprintf(", role = $%d", idx))
		args = append(args, user.Role)
		idx++
	}

	if caps.hasGroups {
		builder.WriteString(fmt.Sprintf(", groups = $%d", idx))
		args = append(args, arrayForQuery(user.Groups))
		idx++
	}

	if caps.hasPermissions {
		builder.WriteString(fmt.Sprintf(", permissions = $%d", idx))
		args = append(args, arrayForQuery(user.Permissions))
		idx++
	}

	if caps.hasMFATOTPSecret {
		builder.WriteString(fmt.Sprintf(", mfa_totp_secret = $%d", idx))
		args = append(args, nullForEmpty(user.MFATOTPSecret))
		idx++
	} else if strings.TrimSpace(user.MFATOTPSecret) != "" {
		return ErrMFANotSupported
	}

	if caps.hasMFAEnabled {
		builder.WriteString(fmt.Sprintf(", mfa_enabled = $%d", idx))
		args = append(args, user.MFAEnabled)
		idx++
	} else if user.MFAEnabled {
		return ErrMFANotSupported
	}

	if caps.hasMFASecretIssuedAt {
		builder.WriteString(fmt.Sprintf(", mfa_secret_issued_at = $%d", idx))
		args = append(args, issuedAt)
		idx++
	} else if !user.MFASecretIssuedAt.IsZero() {
		return ErrMFANotSupported
	}

	if caps.hasMFAConfirmedAt {
		builder.WriteString(fmt.Sprintf(", mfa_confirmed_at = $%d", idx))
		args = append(args, confirmedAt)
		idx++
	} else if !user.MFAConfirmedAt.IsZero() {
		return ErrMFANotSupported
	}

	if caps.hasUpdatedAt {
		builder.WriteString(", updated_at = now()")
	}

	builder.WriteString(fmt.Sprintf(" WHERE uuid = $%d RETURNING ", idx))
	args = append(args, user.ID)
	idx++

	if caps.hasCreatedAt {
		builder.WriteString("coalesce(created_at, now())")
	} else {
		builder.WriteString("now()")
	}

	if caps.hasUpdatedAt {
		builder.WriteString(", coalesce(updated_at, now())")
	} else {
		builder.WriteString(", now()")
	}

	query := builder.String()

	var createdAt time.Time
	var updatedAt time.Time
	err = s.db.QueryRowContext(ctx, query, args...).Scan(&createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrUserNotFound
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" {
				switch {
				case strings.Contains(pgErr.ConstraintName, "email"):
					return ErrEmailExists
				case strings.Contains(pgErr.ConstraintName, "name") || strings.Contains(pgErr.ConstraintName, "username"):
					return ErrNameExists
				}
			}
		}
		return err
	}

	user.Name = normalizedName
	user.Email = normalizedEmail
	user.CreatedAt = createdAt.UTC()
	user.UpdatedAt = updatedAt.UTC()
	return nil
}

func nullForEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func toUTCTime(value sql.NullTime) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time.UTC()
}

func formatIdentifier(value any) (string, error) {
	switch v := value.(type) {
	case nil:
		return "", errors.New("user id is nil")
	case string:
		return v, nil
	case []byte:
		return string(v), nil
	case [16]byte:
		id := uuid.UUID(v)
		return id.String(), nil
	case *[16]byte:
		if v == nil {
			return "", errors.New("user id is nil")
		}
		id := uuid.UUID(*v)
		return id.String(), nil
	case int64:
		return strconv.FormatInt(v, 10), nil
	case int32:
		return strconv.FormatInt(int64(v), 10), nil
	case int:
		return strconv.FormatInt(int64(v), 10), nil
	case uint64:
		return strconv.FormatUint(v, 10), nil
	case uint32:
		return strconv.FormatUint(uint64(v), 10), nil
	case pgtype.UUID:
		if !v.Valid {
			return "", errors.New("user id is nil")
		}
		return v.String(), nil
	case *pgtype.UUID:
		if v == nil || !v.Valid {
			return "", errors.New("user id is nil")
		}
		return v.String(), nil
	case fmt.Stringer:
		return v.String(), nil
	default:
		return "", fmt.Errorf("unsupported identifier type %T", value)
	}
}

func (s *postgresStore) capabilities(ctx context.Context) (schemaCapabilities, error) {
	s.capsMu.RLock()
	if s.capsLoaded {
		caps := s.caps
		s.capsMu.RUnlock()
		return caps, nil
	}
	s.capsMu.RUnlock()

	s.capsMu.Lock()
	defer s.capsMu.Unlock()
	if s.capsLoaded {
		return s.caps, nil
	}

	query := `SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'mfa_totp_secret'
  ) AS has_mfa_totp_secret,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'mfa_enabled'
  ) AS has_mfa_enabled,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'mfa_secret_issued_at'
  ) AS has_mfa_secret_issued_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'mfa_confirmed_at'
  ) AS has_mfa_confirmed_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'created_at'
  ) AS has_created_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'updated_at'
  ) AS has_updated_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'level'
  ) AS has_level,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'role'
  ) AS has_role,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'groups'
  ) AS has_groups,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND table_schema = ANY (current_schemas(false))
      AND column_name = 'permissions'
  ) AS has_permissions`

	row := s.db.QueryRowContext(ctx, query)
	var caps schemaCapabilities
	if err := row.Scan(
		&caps.hasMFATOTPSecret,
		&caps.hasMFAEnabled,
		&caps.hasMFASecretIssuedAt,
		&caps.hasMFAConfirmedAt,
		&caps.hasCreatedAt,
		&caps.hasUpdatedAt,
		&caps.hasLevel,
		&caps.hasRole,
		&caps.hasGroups,
		&caps.hasPermissions,
	); err != nil {
		return schemaCapabilities{}, err
	}

	s.caps = caps
	s.capsLoaded = true
	return caps, nil
}

func (s *postgresStore) selectUserQuery(caps schemaCapabilities, whereClause string) string {
	secretExpr := "NULL::text"
	if caps.hasMFATOTPSecret {
		secretExpr = "mfa_totp_secret"
	}

	enabledExpr := "false"
	if caps.hasMFAEnabled {
		enabledExpr = "coalesce(mfa_enabled, false)"
	}

	issuedExpr := "NULL::timestamptz"
	if caps.hasMFASecretIssuedAt {
		issuedExpr = "mfa_secret_issued_at"
	}

	confirmedExpr := "NULL::timestamptz"
	if caps.hasMFAConfirmedAt {
		confirmedExpr = "mfa_confirmed_at"
	}

	levelExpr := "0"
	if caps.hasLevel {
		levelExpr = "coalesce(level, 0)"
	}

	roleExpr := "'User'"
	if caps.hasRole {
		roleExpr = "coalesce(role, 'User')"
	}

	groupsExpr := "ARRAY[]::text[]"
	if caps.hasGroups {
		groupsExpr = "coalesce(groups, ARRAY[]::text[])"
	}

	permissionsExpr := "ARRAY[]::text[]"
	if caps.hasPermissions {
		permissionsExpr = "coalesce(permissions, ARRAY[]::text[])"
	}

	createdExpr := "now()"
	if caps.hasCreatedAt {
		createdExpr = "coalesce(created_at, now())"
	}

	updatedExpr := "now()"
	if caps.hasUpdatedAt {
		updatedExpr = "coalesce(updated_at, now())"
	}

	return fmt.Sprintf(`SELECT uuid, username, email, email_verified, password, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s FROM users %s`,
		secretExpr, enabledExpr, issuedExpr, confirmedExpr, levelExpr, roleExpr, groupsExpr, permissionsExpr, createdExpr, updatedExpr, whereClause)
}

func arrayForQuery(values []string) any {
	if len(values) == 0 {
		return nil
	}
	return values
}
