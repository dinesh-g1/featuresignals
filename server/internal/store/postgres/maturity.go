// Package postgres implements domain.MaturityReader and domain.MaturityWriter
// against PostgreSQL using pgx.
//
// The MaturityStore manages the organisations.maturity_level column, which
// drives Console progressive disclosure. New organisations default to L1 (Solo).
// All queries enforce tenant isolation via org_id and use parameterised queries.

package postgres

import (
	"context"
	"errors"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compile-time interface checks ─────────────────────────────────────────

var _ domain.MaturityReader = (*MaturityStore)(nil)
var _ domain.MaturityWriter = (*MaturityStore)(nil)

// ─── MaturityStore ─────────────────────────────────────────────────────────

// MaturityStore implements domain.MaturityReader and domain.MaturityWriter
// against PostgreSQL. It is a standalone store, keeping the maturity
// surface area independently testable and deployable.
type MaturityStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewMaturityStore creates a new MaturityStore backed by the given connection pool.
func NewMaturityStore(pool *pgxpool.Pool, logger *slog.Logger) *MaturityStore {
	return &MaturityStore{pool: pool, logger: logger}
}

// ─── MaturityReader: GetConfig ─────────────────────────────────────────────

// GetConfig returns the MaturityConfig for the given organisation. If the
// maturity_level column is NULL or the organisation is not found, it returns
// the default L1 (Solo) config — new orgs start at L1.
func (s *MaturityStore) GetConfig(ctx context.Context, orgID string) (*domain.MaturityConfig, error) {
	var level int
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(maturity_level, 1) FROM organizations WHERE id = $1`,
		orgID,
	).Scan(&level)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Organisation not found; return safe default.
			cfg := domain.DefaultConfig(domain.MaturitySolo)
			return &cfg, nil
		}
		return nil, err
	}

	lvl := domain.ConsoleMaturityLevel(level)
	if !domain.ValidConsoleMaturityLevel(level) {
		lvl = domain.MaturitySolo
	}
	cfg := domain.DefaultConfig(lvl)
	return &cfg, nil
}

// ─── MaturityWriter: SetLevel ──────────────────────────────────────────────

// SetLevel updates the organisation's maturity level and returns the new
// configuration. Returns domain.ErrNotFound if the organisation does not exist,
// and domain.ErrValidation if the level is out of range.
func (s *MaturityStore) SetLevel(ctx context.Context, orgID string, level domain.ConsoleMaturityLevel, updatedBy string) (*domain.MaturityConfig, error) {
	if !domain.ValidConsoleMaturityLevel(int(level)) {
		return nil, domain.NewValidationError("level", "must be between 1 and 5")
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE organizations SET maturity_level = $2, updated_at = NOW() WHERE id = $1`,
		orgID, int(level),
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.WrapNotFound("organisation")
	}

	cfg := domain.DefaultConfig(level)
	return &cfg, nil
}
