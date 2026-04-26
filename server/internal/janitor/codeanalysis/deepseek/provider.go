package deepseek

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"time"

	"github.com/featuresignals/server/internal/janitor/codeanalysis"
)

const (
	defaultModel     = "deepseek-chat"
	defaultBaseURL   = "https://api.deepseek.com/v1"
	defaultTimeout   = 60 * time.Second
	defaultMaxTokens = 4096
)

// DeepSeekProvider implements CodeAnalysisProvider using DeepSeek's API.
type DeepSeekProvider struct {
	apiKey      string
	model       string
	baseURL     string
	client      *http.Client
	logger      *slog.Logger
	temperature float64
	maxTokens   int
}

// NewDeepSeekProvider creates a new DeepSeek provider.
func NewDeepSeekProvider(config codeanalysis.ProviderConfig) (codeanalysis.CodeAnalysisProvider, error) {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	model := config.Model
	if model == "" {
		model = defaultModel
	}
	timeout := config.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	maxTokens := config.MaxTokens
	if maxTokens <= 0 {
		maxTokens = defaultMaxTokens
	}
	temp := config.Temperature
	if temp == 0 {
		temp = 0.1
	}

	return &DeepSeekProvider{
		apiKey:      config.APIKey,
		model:       model,
		baseURL:     baseURL,
		client:      &http.Client{Timeout: timeout},
		logger:      slog.With("provider", "deepseek", "model", model),
		temperature: temp,
		maxTokens:   maxTokens,
	}, nil
}

func (p *DeepSeekProvider) Name() string { return "deepseek" }

// chatMessage represents a message in the chat completion request.
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatRequest is the request body for DeepSeek's chat completions endpoint.
type chatRequest struct {
	Model          string          `json:"model"`
	Messages       []chatMessage   `json:"messages"`
	Temperature    float64         `json:"temperature"`
	MaxTokens      int             `json:"max_tokens"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type responseFormat struct {
	Type string `json:"type"`
}

// chatResponse is the response from DeepSeek's chat completions endpoint.
type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage *struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage,omitempty"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code,omitempty"`
	} `json:"error,omitempty"`
}

func (p *DeepSeekProvider) AnalyzeFlagReferences(ctx context.Context, req codeanalysis.AnalyzeRequest) (*codeanalysis.AnalyzeResponse, error) {
	prompt := BuildAnalysisPrompt(req)
	resp, err := p.callLLM(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("deepseek analyze: %w", err)
	}

	var result analysisResult
	if err := json.Unmarshal([]byte(resp), &result); err != nil {
		return nil, fmt.Errorf("deepseek parse analysis response: %w", err)
	}

	response := &codeanalysis.AnalyzeResponse{
		OverallSafe: result.OverallSafe,
		Confidence:  result.Confidence,
		Summary:     result.Notes,
		Files:       make([]codeanalysis.FileAnalysisResult, 0),
	}

	for _, ref := range result.References {
		var cleaned []byte
		if ref.CleanedSnippet != "" {
			cleaned = []byte(ref.CleanedSnippet)
		}

		refType := ref.ReferenceType
		if refType == "" {
			refType = "conditional"
		}
		keepBranch := ref.KeepBranch
		if keepBranch == "" {
			keepBranch = "true_branch"
		}

		response.Files = append(response.Files, codeanalysis.FileAnalysisResult{
			FilePath: req.FlagKey + ".analyzed",
			Safe:     ref.SafeToRemove,
			References: []codeanalysis.FlagReferenceAnalysis{{
				Line:          ref.Line,
				Column:        ref.Column,
				ReferenceType: refType,
				SafeToRemove:  ref.SafeToRemove,
				KeepBranch:    keepBranch,
				Reason:        ref.Reason,
			}},
			CleanedCode: cleaned,
			Issues:      []string{},
		})
	}

	return response, nil
}

func (p *DeepSeekProvider) GeneratePRDescription(ctx context.Context, flagKey, flagName string, changes []codeanalysis.FileChange) (string, error) {
	prompt := BuildPRDescriptionPrompt(flagKey, flagName, changes)
	resp, err := p.callLLM(ctx, prompt)
	if err != nil {
		return "", fmt.Errorf("deepseek generate pr description: %w", err)
	}

	var result struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal([]byte(resp), &result); err != nil {
		return resp, nil
	}
	return result.Title + "\n\n" + result.Description, nil
}

func (p *DeepSeekProvider) ValidateCleanup(ctx context.Context, req codeanalysis.ValidateRequest) (*codeanalysis.ValidateResponse, error) {
	prompt := BuildValidationPrompt(req)
	resp, err := p.callLLM(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("deepseek validate: %w", err)
	}

	var result validationResult
	if err := json.Unmarshal([]byte(resp), &result); err != nil {
		return nil, fmt.Errorf("deepseek parse validation response: %w", err)
	}

	return &codeanalysis.ValidateResponse{
		Valid:      result.Valid,
		Confidence: result.Confidence,
		Issues:     result.Issues,
	}, nil
}

func (p *DeepSeekProvider) callLLM(ctx context.Context, prompt string) (string, error) {
	reqBody := chatRequest{
		Model:       p.model,
		Temperature: p.temperature,
		MaxTokens:   p.maxTokens,
		ResponseFormat: &responseFormat{Type: "json_object"},
		Messages: []chatMessage{
			{Role: "system", Content: "You are a senior software engineer analyzing code to safely remove stale feature flags. Your responses must be valid JSON only."},
			{Role: "user", Content: prompt},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("http call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp chatResponse
		if json.Unmarshal(respBody, &errResp) == nil && errResp.Error != nil {
			return "", fmt.Errorf("deepseek API error (status %d): %s", resp.StatusCode, errResp.Error.Message)
		}
		return "", fmt.Errorf("deepseek API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return chatResp.Choices[0].Message.Content, nil
}

// analysisResult mirrors the JSON structure expected from the LLM.
type analysisResult struct {
	References []struct {
		Line           int     `json:"line"`
		Column         int     `json:"column"`
		ReferenceType  string  `json:"reference_type"`
		SafeToRemove   bool    `json:"safe_to_remove"`
		KeepBranch     string  `json:"keep_branch"`
		Reason         string  `json:"reason"`
		CleanedSnippet string  `json:"cleaned_snippet"`
	} `json:"references"`
	OverallSafe bool    `json:"overall_safe"`
	Confidence  float64 `json:"confidence"`
	Notes       string  `json:"notes"`
}

type validationResult struct {
	Valid      bool     `json:"valid"`
	Confidence float64  `json:"confidence"`
	Issues     []string `json:"issues"`
}

// Register adds the DeepSeek provider to the given registry.
func Register(r *codeanalysis.ProviderRegistry) error {
	return r.Register("deepseek", NewDeepSeekProvider, codeanalysis.ProviderCapabilities{
		SupportsSelfHosted: true,
		RequiresAPIKey:     true,
		SupportsRedaction:  false,
		Status:             "active",
	})
}

// Ensure interface compliance.
var _ codeanalysis.CodeAnalysisProvider = (*DeepSeekProvider)(nil)