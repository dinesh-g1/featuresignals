// Package migrate provides embedded database migrations using golang-migrate.
//
// All .up.sql and .down.sql files in the migrations/ directory are embedded
// into the binary via go:embed and run automatically on server startup.
//
// Usage in main.go:
//
//	if err := migrate.RunUp(ctx, cfg.DatabaseURL, logger, migrate.ShouldSkip()); err != nil {
//	    logger.Error("migration failed", "error", err)
//	    os.Exit(1)
//	}
package migrate

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// RunUp applies all pending migrations against the database.
// If skip is true, it returns immediately without running any migrations.
// Use skip=true when migrations are run externally (e.g., CI/CD pipeline).
func RunUp(ctx context.Context, databaseURL string, logger *slog.Logger, skip bool) error {
	if skip {
		logger.Info("migrations skipped via SKIP_MIGRATIONS flag")
		return nil
	}

	logger.Info("running database migrations...")

	sourceDriver, err := iofs.New(migrationFS, "migrations")
	if err != nil {
		return fmt.Errorf("create migration source: %w", err)
	}

	// Convert postgres:// URL to pgx5:// URL format
	pgxDsn := strings.Replace(databaseURL, "postgres://", "pgx5://", 1)

	m, err := migrate.NewWithSourceInstance("iofs", sourceDriver, pgxDsn)
	if err != nil {
		return fmt.Errorf("create migrate instance: %w", err)
	}

	// Set a reasonable timeout for migrations to prevent hanging startup
	const migrationTimeout = 5 * time.Minute
	ctx, cancel := context.WithTimeout(ctx, migrationTimeout)
	defer cancel()

	// Log current version before running
	curVer, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("get current version: %w", err)
	}

	if err == migrate.ErrNilVersion {
		logger.Info("no previous migrations found, applying all")
	} else if dirty {
		// Dirty state means a migration partially applied. Force to the PREVIOUS
		// version so m.Up() will re-run the failed migration from scratch.
		prevVer := uint(0)
		if curVer > 0 {
			prevVer = curVer - 1
		}
		logger.Warn("database is at a dirty version, forcing to previous version to recover", "dirty_version", curVer, "target_version", prevVer)
		if err := m.Force(int(prevVer)); err != nil {
			return fmt.Errorf("database is dirty and force-recovery failed (version %d): %w", curVer, err)
		}
		logger.Info("dirty flag cleared, reapplying pending migrations")
	} else {
		logger.Info("current migration version", "version", curVer)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("apply migrations: %w", err)
	}

	if err == migrate.ErrNoChange {
		logger.Info("database is up to date, no migrations to apply")
		return nil
	}

	finalVer, _, err := m.Version()
	if err != nil {
		return fmt.Errorf("get final version: %w", err)
	}

	logger.Info("migrations completed", "version", finalVer)
	return nil
}

// Status returns the current migration status for diagnostics.
func Status(databaseURL string) (version uint, dirty bool, err error) {
	sourceDriver, err := iofs.New(migrationFS, "migrations")
	if err != nil {
		return 0, false, fmt.Errorf("create migration source: %w", err)
	}

	pgxDsn := strings.Replace(databaseURL, "postgres://", "pgx5://", 1)
	m, err := migrate.NewWithSourceInstance("iofs", sourceDriver, pgxDsn)
	if err != nil {
		return 0, false, fmt.Errorf("create migrate instance: %w", err)
	}

	ver, dirty, err := m.Version()
	if err == migrate.ErrNilVersion {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return ver, dirty, nil
}

// ListPending returns all migration files that haven't been applied yet.
func ListPending(databaseURL string) ([]string, error) {
	sourceDriver, err := iofs.New(migrationFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("create migration source: %w", err)
	}

	pgxDsn := strings.Replace(databaseURL, "postgres://", "pgx5://", 1)
	m, err := migrate.NewWithSourceInstance("iofs", sourceDriver, pgxDsn)
	if err != nil {
		return nil, fmt.Errorf("create migrate instance: %w", err)
	}

	curVer, _, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return nil, fmt.Errorf("get current version: %w", err)
	}

	// List all migration files
	files, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	type migFile struct {
		version uint64
		name    string
	}

	var upMigs []migFile
	for _, f := range files {
		name := f.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		verStr := strings.SplitN(name, "_", 2)[0]
		ver, err := strconv.ParseUint(verStr, 10, 64)
		if err != nil {
			continue
		}
		if ver > uint64(curVer) {
			upMigs = append(upMigs, migFile{version: ver, name: name})
		}
	}

	sort.Slice(upMigs, func(i, j int) bool {
		return upMigs[i].version < upMigs[j].version
	})

	result := make([]string, len(upMigs))
	for i, m := range upMigs {
		result[i] = m.name
	}
	return result, nil
}

// Count returns the total number of embedded migration files (up migrations).
func Count() (int, error) {
	files, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return 0, fmt.Errorf("read migrations dir: %w", err)
	}

	count := 0
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".up.sql") {
			count++
		}
	}
	return count, nil
}

// ShouldSkip checks the SKIP_MIGRATIONS environment variable.
// Returns true if SKIP_MIGRATIONS is set to "1", "true", or "yes" (case-insensitive).
func ShouldSkip() bool {
	v := strings.ToLower(os.Getenv("SKIP_MIGRATIONS"))
	return v == "1" || v == "true" || v == "yes"
}

// EmbeddedFile represents a single embedded migration file.
type EmbeddedFile struct {
	Name    string
	Version uint64
	Up      bool
}

// ListAllFiles returns all embedded migration files for inspection.
func ListAllFiles() ([]EmbeddedFile, error) {
	files, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	var result []EmbeddedFile
	for _, f := range files {
		name := f.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}

		verStr := strings.SplitN(name, "_", 2)[0]
		ver, err := strconv.ParseUint(verStr, 10, 64)
		if err != nil {
			continue
		}

		isUp := strings.HasSuffix(name, ".up.sql")
		isDown := strings.HasSuffix(name, ".down.sql")

		if isUp || isDown {
			result = append(result, EmbeddedFile{
				Name:    name,
				Version: uint64(ver),
				Up:      isUp,
			})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Version != result[j].Version {
			return result[i].Version < result[j].Version
		}
		return result[i].Name < result[j].Name
	})

	return result, nil
}

// MigrationSource returns the embedded filesystem containing all migrations.
// This can be used for inspection or debugging.
func MigrationSource() (fs.FS, error) {
	sub, err := fs.Sub(migrationFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("failed to create migration sub-FS: %w", err)
	}
	return sub, nil
}

// ReadMigrationFile reads and returns the content of a specific migration file.
// The name should be the filename without path (e.g., "000001_init_schema.up.sql").
func ReadMigrationFile(name string) (string, error) {
	data, err := migrationFS.ReadFile(filepath.Join("migrations", name))
	if err != nil {
		return "", fmt.Errorf("read file %s: %w", name, err)
	}
	return string(data), nil
}
