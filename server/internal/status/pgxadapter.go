package status

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PgxPoolAdapter adapts pgxpool.Pool to the HealthChecker and PoolStats interfaces.
type PgxPoolAdapter struct {
	pool *pgxpool.Pool
}

func NewPgxPoolAdapter(pool *pgxpool.Pool) *PgxPoolAdapter {
	return &PgxPoolAdapter{pool: pool}
}

func (a *PgxPoolAdapter) Ping(ctx context.Context) error {
	return a.pool.Ping(ctx)
}

func (a *PgxPoolAdapter) AcquiredConns() int32 {
	return a.pool.Stat().AcquiredConns()
}

func (a *PgxPoolAdapter) MaxConns() int32 {
	return a.pool.Stat().MaxConns()
}
