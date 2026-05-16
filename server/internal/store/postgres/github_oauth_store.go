package postgres

import (
	"context"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/featuresignals/server/internal/crypto"
	"github.com/featuresignals/server/internal/domain"
)

// ─── GitHub OAuth Token Methods (implements domain.GitHubOAuthStore) ──────
//
// These methods are on *Store so they satisfy the domain.Store interface,
// which now embeds GitHubOAuthStore. Tokens are encrypted at rest using
// AES-256-GCM with the master encryption key.

// StoreGitHubToken encrypts and stores a GitHub OAuth access token for the
// given org. Uses ON CONFLICT upsert — each org has at most one token.
func (s *Store) StoreGitHubToken(ctx context.Context, orgID, accessToken, githubUser, repoFullName string) error {
	if s.auditIntegrityKey == "" {
		return fmt.Errorf("store github token: encryption key not configured")
	}

	var key [32]byte
	kb, err := hex.DecodeString(s.auditIntegrityKey)
	if err != nil || len(kb) != 32 {
		return fmt.Errorf("store github token: invalid encryption key: %w", err)
	}
	copy(key[:], kb)

	plaintext := []byte(accessToken)
	ciphertext, nonce, err := crypto.Encrypt(plaintext, key)
	if err != nil {
		return fmt.Errorf("store github token: encrypt: %w", err)
	}

	// Prepend nonce to ciphertext for single-column storage.
	encrypted := make([]byte, 0, len(nonce)+len(ciphertext))
	encrypted = append(encrypted, nonce...)
	encrypted = append(encrypted, ciphertext...)
	encryptedHex := hex.EncodeToString(encrypted)

	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO github_tokens (org_id, encrypted_token, github_user, repo_full_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (org_id) DO UPDATE SET
			encrypted_token = EXCLUDED.encrypted_token,
			github_user     = EXCLUDED.github_user,
			repo_full_name  = EXCLUDED.repo_full_name,
			updated_at      = EXCLUDED.updated_at
	`, orgID, encryptedHex, githubUser, repoFullName, now, now)
	if err != nil {
		return fmt.Errorf("store github token: %w", err)
	}
	return nil
}

// GetGitHubToken retrieves and decrypts a GitHub OAuth token for the given org.
// Returns domain.ErrNotFound if no token exists.
func (s *Store) GetGitHubToken(ctx context.Context, orgID string) (*domain.GitHubToken, error) {
	if s.auditIntegrityKey == "" {
		return nil, fmt.Errorf("get github token: encryption key not configured")
	}

	var key [32]byte
	kb, err := hex.DecodeString(s.auditIntegrityKey)
	if err != nil || len(kb) != 32 {
		return nil, fmt.Errorf("get github token: invalid encryption key: %w", err)
	}
	copy(key[:], kb)

	var token domain.GitHubToken
	var encryptedHex string

	err = s.pool.QueryRow(ctx, `
		SELECT id, org_id, encrypted_token, github_user, repo_full_name, created_at, updated_at
		FROM github_tokens WHERE org_id = $1
	`, orgID).Scan(
		&token.ID, &token.OrgID, &encryptedHex,
		&token.GitHubUser, &token.RepoFullName,
		&token.CreatedAt, &token.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "github_token")
	}

	// Decrypt: first 12 bytes are nonce, rest is ciphertext.
	encrypted, err := hex.DecodeString(encryptedHex)
	if err != nil {
		return nil, fmt.Errorf("get github token: decode hex: %w", err)
	}
	if len(encrypted) < 12 {
		return nil, fmt.Errorf("get github token: invalid ciphertext length")
	}
	nonce := encrypted[:12]
	ciphertext := encrypted[12:]

	plaintext, err := crypto.Decrypt(ciphertext, nonce, key)
	if err != nil {
		return nil, fmt.Errorf("get github token: decrypt: %w", err)
	}
	token.EncryptedToken = string(plaintext)

	return &token, nil
}

// DeleteGitHubToken removes the GitHub OAuth token for the given org.
// Returns domain.ErrNotFound if no token exists.
func (s *Store) DeleteGitHubToken(ctx context.Context, orgID string) error {
	result, err := s.pool.Exec(ctx, `DELETE FROM github_tokens WHERE org_id = $1`, orgID)
	if err != nil {
		return fmt.Errorf("delete github token: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("github_token")
	}
	return nil
}
