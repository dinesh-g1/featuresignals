package github

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

var ErrNotConfigured = errors.New("GitHub not configured — set GITHUB_TOKEN")

type WorkflowRun struct {
	ID         int64  `json:"id"`
	Status     string `json:"status"`
	Conclusion string `json:"conclusion"`
	HTMLURL    string `json:"html_url"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type Client struct {
	token string
	owner string
	repo  string
	http  *http.Client
}

func NewClient(token, owner, repo string) *Client {
	return &Client{
		token: token,
		owner: owner,
		repo:  repo,
		http:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) configured() bool {
	return c.token != "" && c.owner != "" && c.repo != ""
}

// TriggerWorkflow sends a workflow_dispatch event.
// POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
func (c *Client) TriggerWorkflow(ctx context.Context, workflowID string, ref string, inputs map[string]string) (int64, error) {
	if !c.configured() {
		return 0, fmt.Errorf("trigger workflow: %w", ErrNotConfigured)
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/workflows/%s/dispatches", c.owner, c.repo, workflowID)

	body := map[string]interface{}{
		"ref": ref,
	}
	if inputs != nil {
		body["inputs"] = inputs
	}

	payload, _ := json.Marshal(body)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, fmt.Errorf("trigger workflow request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusCreated {
		return 0, fmt.Errorf("GitHub returned status %d", resp.StatusCode)
	}

	// GitHub returns 204 No Content for workflow_dispatch, no run ID
	// We return 0 and let the caller handle it
	return 0, nil
}

// GetWorkflowRun fetches a workflow run's status.
func (c *Client) GetWorkflowRun(ctx context.Context, runID int64) (*WorkflowRun, error) {
	if !c.configured() {
		return nil, fmt.Errorf("get workflow run: %w", ErrNotConfigured)
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%d", c.owner, c.repo, runID)

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get workflow run request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned status %d", resp.StatusCode)
	}

	var run WorkflowRun
	if err := json.NewDecoder(resp.Body).Decode(&run); err != nil {
		return nil, fmt.Errorf("decode workflow run: %w", err)
	}

	return &run, nil
}

// ListRecentWorkflowRuns lists recent runs for a workflow.
func (c *Client) ListRecentWorkflowRuns(ctx context.Context, workflowID string) ([]WorkflowRun, error) {
	if !c.configured() {
		return nil, fmt.Errorf("list workflow runs: %w", ErrNotConfigured)
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/workflows/%s/runs?per_page=10", c.owner, c.repo, workflowID)

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list workflow runs request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned status %d", resp.StatusCode)
	}

	var result struct {
		WorkflowRuns []WorkflowRun `json:"workflow_runs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode workflow runs: %w", err)
	}

	return result.WorkflowRuns, nil
}

// ListWorkflowIDs returns a list of available workflow IDs.
func (c *Client) ListWorkflowIDs(ctx context.Context) ([]string, error) {
	if !c.configured() {
		return nil, fmt.Errorf("list workflows: %w", ErrNotConfigured)
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/workflows?per_page=50", c.owner, c.repo)

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list workflows request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned status %d", resp.StatusCode)
	}

	var result struct {
		Workflows []struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
			Path string `json:"path"`
		} `json:"workflows"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode workflows: %w", err)
	}

	var ids []string
	for _, w := range result.Workflows {
		ids = append(ids, fmt.Sprintf("%d", w.ID))
	}
	return ids, nil
}