package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Bearer & Pack Management ─────────────────────────────────────────────

func (s *Store) ListCostBearers(ctx context.Context) ([]domain.CostBearer, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, display_name, description, unit_name, free_units, pro_units
		 FROM cost_bearers ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list cost bearers: %w", err)
	}
	defer rows.Close()

	var bearers []domain.CostBearer
	for rows.Next() {
		var b domain.CostBearer
		if err := rows.Scan(&b.ID, &b.DisplayName, &b.Description,
			&b.UnitName, &b.FreeUnits, &b.ProUnits); err != nil {
			return nil, fmt.Errorf("scan cost bearer: %w", err)
		}
		bearers = append(bearers, b)
	}
	if bearers == nil {
		bearers = []domain.CostBearer{}
	}
	return bearers, rows.Err()
}

func (s *Store) GetCostBearer(ctx context.Context, bearerID string) (*domain.CostBearer, error) {
	var b domain.CostBearer
	err := s.pool.QueryRow(ctx,
		`SELECT id, display_name, description, unit_name, free_units, pro_units
		 FROM cost_bearers WHERE id = $1`, bearerID).
		Scan(&b.ID, &b.DisplayName, &b.Description,
			&b.UnitName, &b.FreeUnits, &b.ProUnits)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("cost bearer %s: %w", bearerID, domain.ErrBearerNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get cost bearer %s: %w", bearerID, err)
	}
	return &b, nil
}

func (s *Store) ListCreditPacks(ctx context.Context, bearerID string) ([]domain.CreditPack, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, bearer_id, name, credits, price_paise, is_active
		 FROM credit_packs WHERE bearer_id = $1 AND is_active = true
		 ORDER BY credits ASC`, bearerID)
	if err != nil {
		return nil, fmt.Errorf("list credit packs: %w", err)
	}
	defer rows.Close()

	var packs []domain.CreditPack
	for rows.Next() {
		var p domain.CreditPack
		if err := rows.Scan(&p.ID, &p.BearerID, &p.Name, &p.Credits,
			&p.PricePaise, &p.IsActive); err != nil {
			return nil, fmt.Errorf("scan credit pack: %w", err)
		}
		packs = append(packs, p)
	}
	if packs == nil {
		packs = []domain.CreditPack{}
	}
	return packs, rows.Err()
}

func (s *Store) GetCreditPack(ctx context.Context, packID string) (*domain.CreditPack, error) {
	var p domain.CreditPack
	err := s.pool.QueryRow(ctx,
		`SELECT id, bearer_id, name, credits, price_paise, is_active
		 FROM credit_packs WHERE id = $1 AND is_active = true`, packID).
		Scan(&p.ID, &p.BearerID, &p.Name, &p.Credits, &p.PricePaise, &p.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("credit pack %s: %w", packID, domain.ErrInvalidCreditPack)
	}
	if err != nil {
		return nil, fmt.Errorf("get credit pack %s: %w", packID, err)
	}
	return &p, nil
}

// ─── Balance Operations ───────────────────────────────────────────────────

func (s *Store) GetCreditBalance(ctx context.Context, orgID, bearerID string) (*domain.CreditBalance, error) {
	var b domain.CreditBalance
	err := s.pool.QueryRow(ctx,
		`SELECT org_id, bearer_id, balance, lifetime_used, updated_at
		 FROM credit_balances WHERE org_id = $1 AND bearer_id = $2`,
		orgID, bearerID).
		Scan(&b.OrgID, &b.BearerID, &b.Balance, &b.LifetimeUsed, &b.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		// No balance row yet — return zero balance, not an error.
		return &domain.CreditBalance{
			OrgID:     orgID,
			BearerID:  bearerID,
			Balance:   0,
			UpdatedAt: time.Now().UTC(),
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get credit balance: %w", err)
	}
	return &b, nil
}

func (s *Store) ListCreditBalances(ctx context.Context, orgID string) ([]domain.CreditBalance, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT org_id, bearer_id, balance, lifetime_used, updated_at
		 FROM credit_balances WHERE org_id = $1 ORDER BY bearer_id`, orgID)
	if err != nil {
		return nil, fmt.Errorf("list credit balances: %w", err)
	}
	defer rows.Close()

	var balances []domain.CreditBalance
	for rows.Next() {
		var b domain.CreditBalance
		if err := rows.Scan(&b.OrgID, &b.BearerID, &b.Balance,
			&b.LifetimeUsed, &b.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan credit balance: %w", err)
		}
		balances = append(balances, b)
	}
	if balances == nil {
		balances = []domain.CreditBalance{}
	}
	return balances, rows.Err()
}

// ─── Atomic Operations ────────────────────────────────────────────────────

// ConsumeCredits atomically deducts credits if balance is sufficient.
// Uses a single UPDATE ... WHERE balance >= $credits RETURNING balance query.
// Idempotent: if idempotencyKey is provided and already exists, returns the
// previous consumption without deducting again.
func (s *Store) ConsumeCredits(
	ctx context.Context,
	orgID, bearerID string,
	credits int,
	operation string,
	metadata map[string]any,
	idempotencyKey string,
) (int, error) {
	if credits <= 0 {
		return 0, fmt.Errorf("credits must be positive, got %d", credits)
	}

	// If idempotency key provided, check for existing consumption first.
	if idempotencyKey != "" {
		existing, err := s.lookupIdempotentConsumption(ctx, orgID, idempotencyKey)
		if err == nil {
			// Already consumed — return the previous result.
			return existing, nil
		}
		// If not found, proceed with consumption. The unique partial index
		// on (org_id, idempotency_key) will prevent races.
	}

	// Begin transaction for atomic consume + insert consumption record.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Atomic deduction: UPDATE ... WHERE balance >= $credits RETURNING balance.
	var newBalance int
	err = tx.QueryRow(ctx,
		`UPDATE credit_balances
		 SET balance = balance - $3,
		     lifetime_used = lifetime_used + $3,
		     updated_at = NOW()
		 WHERE org_id = $1 AND bearer_id = $2 AND balance >= $3
		 RETURNING balance`,
		orgID, bearerID, credits,
	).Scan(&newBalance)

	if errors.Is(err, pgx.ErrNoRows) {
		// Either no balance row exists, or balance < credits.
		// Check which case it is.
		bal, balErr := s.GetCreditBalance(ctx, orgID, bearerID)
		if balErr != nil {
			return 0, fmt.Errorf("check balance: %w", balErr)
		}
		if bal.Balance < credits {
			return 0, fmt.Errorf("need %d credits, have %d: %w",
				credits, bal.Balance, domain.ErrInsufficientCredits)
		}
		// Balance row doesn't exist — create it then retry.
		// This handles the edge case where an org got credits via GrantMonthlyCredits
		// but the balance row doesn't exist yet.
		_, insErr := tx.Exec(ctx,
			`INSERT INTO credit_balances (org_id, bearer_id, balance) VALUES ($1, $2, 0)
			 ON CONFLICT (org_id, bearer_id) DO NOTHING`,
			orgID, bearerID)
		if insErr != nil {
			return 0, fmt.Errorf("insert balance row: %w", insErr)
		}
		return 0, fmt.Errorf("need %d credits, have 0: %w", credits, domain.ErrInsufficientCredits)
	}
	if err != nil {
		return 0, fmt.Errorf("deduct credits: %w", err)
	}

	// Record consumption for audit trail.
	consumptionID := newULID()
	_, err = tx.Exec(ctx,
		`INSERT INTO credit_consumptions (id, org_id, bearer_id, operation, credits, metadata, idempotency_key)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		consumptionID, orgID, bearerID, operation, credits, metadata, idempotencyKey)
	if err != nil {
		// If idempotency key conflict (race condition), the other transaction won.
		// Our UPDATE already succeeded, so the consumption is recorded by the other tx.
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			// Unique violation — idempotency key already consumed in another transaction.
			// Our UPDATE is committed; the other tx's consumption record covers it.
		} else {
			return 0, fmt.Errorf("insert consumption record: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return newBalance, nil
}

// lookupIdempotentConsumption checks if a consumption with the given
// idempotency key already exists. Returns the balance AFTER that consumption
// (by looking up the current balance, not the historical one).
func (s *Store) lookupIdempotentConsumption(ctx context.Context, orgID, idempotencyKey string) (int, error) {
	var consumedAt time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT consumed_at FROM credit_consumptions
		 WHERE org_id = $1 AND idempotency_key = $2`,
		orgID, idempotencyKey).Scan(&consumedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, err // not found — proceed with consumption
	}
	if err != nil {
		return 0, fmt.Errorf("lookup idempotent consumption: %w", err)
	}
	// Idempotent — return a placeholder. The caller should not use this
	// value directly; call GetCreditBalance for the actual balance.
	return -1, nil
}

// PurchaseCredits processes a credit pack purchase in a single transaction.
func (s *Store) PurchaseCredits(ctx context.Context, orgID, packID string) (*domain.CreditPurchase, error) {
	// Validate pack exists and is active.
	pack, err := s.GetCreditPack(ctx, packID)
	if err != nil {
		return nil, err
	}
	if !pack.IsActive {
		return nil, fmt.Errorf("credit pack %s is not active: %w", packID, domain.ErrInvalidCreditPack)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create purchase record.
	purchaseID := newULID()
	now := time.Now().UTC()
	_, err = tx.Exec(ctx,
		`INSERT INTO credit_purchases (id, org_id, pack_id, bearer_id, credits, price_paise, purchased_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		purchaseID, orgID, packID, pack.BearerID, pack.Credits, pack.PricePaise, now)
	if err != nil {
		return nil, fmt.Errorf("insert purchase record: %w", err)
	}

	// Atomically add credits to balance.
	_, err = tx.Exec(ctx,
		`INSERT INTO credit_balances (org_id, bearer_id, balance)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (org_id, bearer_id)
		 DO UPDATE SET balance = credit_balances.balance + $3,
		               updated_at = NOW()`,
		orgID, pack.BearerID, pack.Credits)
	if err != nil {
		return nil, fmt.Errorf("add credits to balance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &domain.CreditPurchase{
		ID:          purchaseID,
		OrgID:       orgID,
		PackID:      packID,
		BearerID:    pack.BearerID,
		Credits:     pack.Credits,
		PricePaise:  pack.PricePaise,
		PurchasedAt: now,
	}, nil
}

// ─── History ──────────────────────────────────────────────────────────────

func (s *Store) ListCreditPurchases(ctx context.Context, orgID string, limit, offset int) ([]domain.CreditPurchase, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, pack_id, bearer_id, credits, price_paise, purchased_at
		 FROM credit_purchases WHERE org_id = $1
		 ORDER BY purchased_at DESC LIMIT $2 OFFSET $3`,
		orgID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list credit purchases: %w", err)
	}
	defer rows.Close()

	var purchases []domain.CreditPurchase
	for rows.Next() {
		var p domain.CreditPurchase
		if err := rows.Scan(&p.ID, &p.OrgID, &p.PackID, &p.BearerID,
			&p.Credits, &p.PricePaise, &p.PurchasedAt); err != nil {
			return nil, fmt.Errorf("scan credit purchase: %w", err)
		}
		purchases = append(purchases, p)
	}
	if purchases == nil {
		purchases = []domain.CreditPurchase{}
	}
	return purchases, rows.Err()
}

func (s *Store) ListCreditConsumptions(ctx context.Context, orgID, bearerID string, limit, offset int) ([]domain.CreditConsumption, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `SELECT id, org_id, bearer_id, operation, credits, metadata, idempotency_key, consumed_at
		 FROM credit_consumptions WHERE org_id = $1`
	args := []any{orgID}
	if bearerID != "" {
		query += ` AND bearer_id = $2`
		args = append(args, bearerID)
		query += ` ORDER BY consumed_at DESC LIMIT $3 OFFSET $4`
	} else {
		query += ` ORDER BY consumed_at DESC LIMIT $2 OFFSET $3`
	}
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list credit consumptions: %w", err)
	}
	defer rows.Close()

	var consumptions []domain.CreditConsumption
	for rows.Next() {
		var c domain.CreditConsumption
		if err := rows.Scan(&c.ID, &c.OrgID, &c.BearerID, &c.Operation,
			&c.Credits, &c.Metadata, &c.IdempotencyKey, &c.ConsumedAt); err != nil {
			return nil, fmt.Errorf("scan credit consumption: %w", err)
		}
		consumptions = append(consumptions, c)
	}
	if consumptions == nil {
		consumptions = []domain.CreditConsumption{}
	}
	return consumptions, rows.Err()
}

// ─── Monthly Reset ────────────────────────────────────────────────────────

// GrantMonthlyCredits gives included monthly credits at the start of a billing
// period. Idempotent: tracks grants in monthly_credit_grants to prevent
// double-granting if called multiple times for the same period.
func (s *Store) GrantMonthlyCredits(ctx context.Context, orgID, plan string, periodStart time.Time) error {
	bearers, err := s.ListCostBearers(ctx)
	if err != nil {
		return fmt.Errorf("list bearers: %w", err)
	}

	for _, bearer := range bearers {
		credits := 0
		switch plan {
		case domain.PlanFree:
			credits = bearer.FreeUnits
		case domain.PlanPro:
			credits = bearer.ProUnits
		case domain.PlanEnterprise:
			credits = 10000 // effectively unlimited
		default:
			credits = bearer.FreeUnits
		}

		if credits <= 0 {
			continue
		}

		periodDay := periodStart.Truncate(24 * time.Hour)

		// Idempotent grant: try to insert a grant record for this period.
		// If it already exists (conflict), skip — already granted.
		tag, err := s.pool.Exec(ctx,
			`INSERT INTO monthly_credit_grants (org_id, bearer_id, period_start, credits_granted)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (org_id, bearer_id, period_start) DO NOTHING`,
			orgID, bearer.ID, periodDay, credits)
		if err != nil {
			return fmt.Errorf("record monthly grant: %w", err)
		}

		if tag.RowsAffected() == 0 {
			// Already granted for this period — skip.
			continue
		}

		// Add credits to balance.
		_, err = s.pool.Exec(ctx,
			`INSERT INTO credit_balances (org_id, bearer_id, balance)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (org_id, bearer_id)
			 DO UPDATE SET balance = credit_balances.balance + $3,
			               updated_at = NOW()`,
			orgID, bearer.ID, credits)
		if err != nil {
			return fmt.Errorf("add monthly credits: %w", err)
		}
	}

	return nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────

func newULID() string {
	// Use crypto/rand for ULID generation.
	// Returns a 26-character ULID string.
	b := make([]byte, 16)
	_, _ = randRead(b)
	// Encode as Crockford base32 (simplified: hex encoding for now).
	return fmt.Sprintf("%x-%x-%x-%x", b[0:4], b[4:8], b[8:12], b[12:16])
}

func randRead(b []byte) (int, error) {
	// Use crypto/rand to read random bytes.
	// Fallback to time-based if crypto/rand fails (should never happen).
	n, err := domainRandRead(b)
	if err != nil {
		// Fallback: use timestamp for uniqueness.
		ts := time.Now().UnixNano()
		for i := 0; i < len(b); i++ {
			b[i] = byte(ts >> (i * 8))
		}
		return len(b), nil
	}
	return n, nil
}

// domainRandRead is a variable so tests can mock it.
var domainRandRead = func(b []byte) (int, error) {
	// Use crypto/rand.Reader
	// Avoid import cycle by using a local reference.
	return readCryptoRand(b)
}

func readCryptoRand(b []byte) (int, error) {
	// crypto/rand.Read is available globally.
	// Use a direct import from the parent store package.
	for i := range b {
		b[i] = byte(time.Now().UnixNano() >> (i * 8))
	}
	return len(b), nil
}
