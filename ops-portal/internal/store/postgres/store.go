package postgres

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/featuresignals/ops-portal/internal/migrate"
)

type Store struct {
	Pool            *pgxpool.Pool
	Clusters        *ClusterStore
	Users           *UserStore
	Deploy          *DeploymentStore
	Config          *ConfigSnapshotStore
	Audit           *AuditStore
	ConfigTemplates *ConfigTemplateStore
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db url: %w", err)
	}
	config.MaxConns = 20
	config.MinConns = 3

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	if err := migrate.Up(ctx, pool); err != nil {
		pool.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	s := &Store{
		Pool:            pool,
		Clusters:        NewClusterStore(pool),
		Users:           NewUserStore(pool),
		Deploy:          NewDeploymentStore(pool),
		Config:          NewConfigSnapshotStore(pool),
		Audit:           NewAuditStore(pool),
		ConfigTemplates: NewConfigTemplateStore(pool),
	}

	slog.Info("connected to postgres", "min_conns", config.MinConns, "max_conns", config.MaxConns)
	return s, nil
}

func (s *Store) Close() {
	s.Pool.Close()
}
