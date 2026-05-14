// Package agent provides the Agent Runtime implementation.
//
// CELEvaluator implements a simplified CEL-like expression evaluator for
// governance policy rules. It supports field access, comparison operators,
// logical operators, and string/integer literals.
//
// This is the concrete evaluator wired into PolicyGovernanceStep to
// evaluate policy expressions against agent actions at runtime.
package agent

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// CELEvaluator evaluates CEL-like policy expressions against an action context.
// For v1, it implements a simplified expression evaluator supporting:
//   - Field access: agent.maturity, action.scope, org.plan
//   - Comparison: ==, !=, <, >, <=, >=
//   - Logical: &&, ||
//   - String literals: "production"
//   - Integer literals: 3, 5
type CELEvaluator struct {
	timeout time.Duration
}

// NewCELEvaluator creates a CEL evaluator with the given timeout.
func NewCELEvaluator(timeout time.Duration) *CELEvaluator {
	if timeout <= 0 {
		timeout = 10 * time.Millisecond
	}
	return &CELEvaluator{timeout: timeout}
}

// Evaluate implements domain.PolicyEvaluator. It evaluates all applicable
// policies against the action and returns the aggregated result.
// All rules in a policy must pass; if any fail, the policy fails.
// The first failing policy determines the response effect.
func (e *CELEvaluator) Evaluate(ctx context.Context, action domain.AgentAction, policies []domain.Policy) (*domain.PolicyEvalResult, error) {
	// Apply timeout
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	// Build the evaluation context from the action
	evalCtx := buildEvalContext(action)

	// Evaluate policies in priority order (already sorted by the store).
	// First failing policy short-circuits and determines the response.
	for _, policy := range policies {
		if !policy.Enabled {
			continue
		}

		start := time.Now()
		var failures []domain.PolicyRuleFailure

		for _, rule := range policy.Rules {
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("cel evaluation timeout after %v", e.timeout)
			default:
			}

			ok, actual, err := e.evaluateCEL(rule.Expression, evalCtx)
			if err != nil {
				// Expression parse/eval errors are treated as rule failures
				failures = append(failures, domain.PolicyRuleFailure{
					RuleName:    rule.Name,
					Expression:  rule.Expression,
					Message:     rule.Message,
					ActualValue: fmt.Sprintf("eval error: %v", err),
				})
				continue
			}

			if !ok {
				failures = append(failures, domain.PolicyRuleFailure{
					RuleName:    rule.Name,
					Expression:  rule.Expression,
					Message:     rule.Message,
					ActualValue: actual,
				})
			}
		}

		elapsed := time.Since(start)

		if len(failures) > 0 {
			return &domain.PolicyEvalResult{
				PolicyID:      policy.ID,
				PolicyName:    policy.Name,
				Passed:        false,
				Failures:      failures,
				Effect:        policy.Effect,
				EvaluatedAt:   time.Now().UTC(),
				EvalDurationMs: elapsed.Milliseconds(),
			}, nil
		}
	}

	// All policies passed
	return &domain.PolicyEvalResult{
		Passed:        true,
		EvaluatedAt:   time.Now().UTC(),
	}, nil
}

// EvaluateExpression evaluates a single CEL-like expression against a
// context map. This is the public API for evaluating individual expressions
// outside of the policy governance pipeline.
func (e *CELEvaluator) EvaluateExpression(ctx context.Context, expression string, ctxMap map[string]interface{}) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	resultCh := make(chan struct {
		ok  bool
		err error
	}, 1)

	go func() {
			ok, _, err := e.evaluateCEL(expression, ctxMap)
		resultCh <- struct {
			ok  bool
			err error
		}{ok, err}
	}()

	select {
	case <-ctx.Done():
		return false, fmt.Errorf("cel expression evaluation timeout after %v", e.timeout)
	case result := <-resultCh:
		return result.ok, result.err
	}
}

// ─── Context Building ──────────────────────────────────────────────────────

// buildEvalContext constructs a flat map from the AgentAction for CEL evaluation.
// The map uses dot-separated keys matching the expression field access paths:
//
//	action.agent.maturity.current_level -> evalCtx["action"]["agent"]["maturity"]["current_level"]
//	action.decision.confidence          -> evalCtx["action"]["decision"]["confidence"]
//	org.plan                            -> evalCtx["org"]["plan"]
func buildEvalContext(action domain.AgentAction) map[string]interface{} {
	evalCtx := make(map[string]interface{})

	// ── action ──
	actionMap := make(map[string]interface{})

	// action.agent
	agentMap := make(map[string]interface{})
	maturityMap := map[string]interface{}{
		"current_level": float64(1), // placeholder
	}
	agentMap["maturity"] = maturityMap
	agentMap["id"] = action.AgentID
	agentMap["type"] = action.AgentType
	actionMap["agent"] = agentMap

	// action.context
	contextMap := map[string]interface{}{
		"org_id":         action.Context.OrgID,
		"project_id":     action.Context.ProjectID,
		"environment_id": action.Context.EnvironmentID,
		"user_id":        action.Context.UserID,
	}
	actionMap["context"] = contextMap

	// action.decision
	decisionMap := map[string]interface{}{
		"action":          action.ToolName,
		"confidence":      float64(0), // placeholder
		"requires_human":  false,
	}
	actionMap["decision"] = decisionMap

	// action.blast_radius
	blastMap := map[string]interface{}{
		"affected_percentage": float64(0), // placeholder
	}
	actionMap["blast_radius"] = blastMap

	evalCtx["action"] = actionMap

	// ── org ──
	evalCtx["org"] = map[string]interface{}{
		"plan":   "", // populated from metadata if available
		"org_id": action.Context.OrgID,
	}

	// ── now ──
	evalCtx["now"] = time.Now().UTC().Format(time.RFC3339)

	// Copy metadata into eval context at top level
	for k, v := range action.Context.Metadata {
		evalCtx[k] = v
	}

	return evalCtx
}

// ─── Expression Parser & Evaluator ─────────────────────────────────────────

// evaluateCEL parses and evaluates a single CEL-like expression.
// Returns (result, actualValue, error).
func (e *CELEvaluator) evaluateCEL(expr string, ctx map[string]interface{}) (bool, string, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return false, "", fmt.Errorf("empty expression")
	}

	p := &celParser{
		input: expr,
		pos:   0,
		ctx:   ctx,
	}
	result, err := p.parseOr()
	if err != nil {
		return false, "", err
	}

	// Skip trailing whitespace
	p.skipWhitespace()
	if p.pos < len(p.input) {
		return false, "", fmt.Errorf("unexpected trailing input at position %d: %q", p.pos, p.input[p.pos:])
	}

	valStr := fmt.Sprintf("%v", result)
	return toBool(result), valStr, nil
}

// toBool converts an interface{} to bool for comparison results.
// Non-boolean values are treated as falsy (except non-empty strings and non-zero numbers).
func toBool(v interface{}) bool {
	switch val := v.(type) {
	case bool:
		return val
	case string:
		return val != ""
	case float64:
		return val != 0
	case int64:
		return val != 0
	case nil:
		return false
	default:
		return v != nil
	}
}

// ─── Parser ────────────────────────────────────────────────────────────────

type celParser struct {
	input string
	pos   int
	ctx   map[string]interface{}
}

func (p *celParser) peek() byte {
	if p.pos < len(p.input) {
		return p.input[p.pos]
	}
	return 0
}

func (p *celParser) advance() byte {
	ch := p.peek()
	if ch != 0 {
		p.pos++
	}
	return ch
}

func (p *celParser) skipWhitespace() {
	for p.pos < len(p.input) && (p.input[p.pos] == ' ' || p.input[p.pos] == '\t' || p.input[p.pos] == '\n' || p.input[p.pos] == '\r') {
		p.pos++
	}
}

// parseOr handles || (lowest precedence).
func (p *celParser) parseOr() (interface{}, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}

	for {
		p.skipWhitespace()
		if p.pos+1 < len(p.input) && p.input[p.pos] == '|' && p.input[p.pos+1] == '|' {
			p.pos += 2
			right, err := p.parseAnd()
			if err != nil {
				return nil, err
			}
			left = toBool(left) || toBool(right)
		} else {
			break
		}
	}
	return left, nil
}

// parseAnd handles &&.
func (p *celParser) parseAnd() (interface{}, error) {
	left, err := p.parseComparison()
	if err != nil {
		return nil, err
	}

	for {
		p.skipWhitespace()
		if p.pos+1 < len(p.input) && p.input[p.pos] == '&' && p.input[p.pos+1] == '&' {
			p.pos += 2
			right, err := p.parseComparison()
			if err != nil {
				return nil, err
			}
			left = toBool(left) && toBool(right)
		} else {
			break
		}
	}
	return left, nil
}

// parseComparison handles ==, !=, <, >, <=, >=.
func (p *celParser) parseComparison() (interface{}, error) {
	left, err := p.parsePrimary()
	if err != nil {
		return nil, err
	}

	p.skipWhitespace()

	// Check for comparison operator
	if p.pos >= len(p.input) {
		return left, nil
	}

	op := ""
	switch {
	case p.pos+1 < len(p.input) && p.input[p.pos] == '=' && p.input[p.pos+1] == '=':
		op = "=="
		p.pos += 2
	case p.pos+1 < len(p.input) && p.input[p.pos] == '!' && p.input[p.pos+1] == '=':
		op = "!="
		p.pos += 2
	case p.pos+1 < len(p.input) && p.input[p.pos] == '<' && p.input[p.pos+1] == '=':
		op = "<="
		p.pos += 2
	case p.pos+1 < len(p.input) && p.input[p.pos] == '>' && p.input[p.pos+1] == '=':
		op = ">="
		p.pos += 2
	case p.input[p.pos] == '<':
		op = "<"
		p.pos++
	case p.input[p.pos] == '>':
		op = ">"
		p.pos++
	}

	if op == "" {
		return left, nil
	}

	right, err := p.parsePrimary()
	if err != nil {
		return nil, err
	}

	return compare(op, left, right)
}

// parsePrimary handles literals, field access, and parenthesized expressions.
func (p *celParser) parsePrimary() (interface{}, error) {
	p.skipWhitespace()

	if p.pos >= len(p.input) {
		return nil, fmt.Errorf("unexpected end of expression at position %d", p.pos)
	}

	ch := p.peek()

	switch {
	case ch == '(':
		p.advance() // consume (
		result, err := p.parseOr()
		if err != nil {
			return nil, err
		}
		p.skipWhitespace()
		if p.peek() != ')' {
			return nil, fmt.Errorf("expected ')' at position %d", p.pos)
		}
		p.advance() // consume )
		return result, nil

	case ch == '"' || ch == '\'':
		return p.parseString()

	case ch >= '0' && ch <= '9' || ch == '-':
		return p.parseNumber()

	case ch == 't' || ch == 'f' || ch == 'n':
		return p.parseKeyword()

	default:
		return p.parseFieldAccess()
	}
}

// parseString parses a quoted string literal.
func (p *celParser) parseString() (string, error) {
	quote := p.advance() // consume opening quote
	var buf strings.Builder
	for {
		if p.pos >= len(p.input) {
			return "", fmt.Errorf("unterminated string literal at position %d", p.pos)
		}
		ch := p.advance()
		if ch == '\\' {
			if p.pos < len(p.input) {
				next := p.advance()
				switch next {
				case 'n':
					buf.WriteByte('\n')
				case 't':
					buf.WriteByte('\t')
				case '\\':
					buf.WriteByte('\\')
				case '"':
					buf.WriteByte('"')
				case '\'':
					buf.WriteByte('\'')
				default:
					buf.WriteByte(next)
				}
			}
		} else if ch == quote {
			return buf.String(), nil
		} else {
			buf.WriteByte(ch)
		}
	}
}

// parseNumber parses an integer or float literal.
func (p *celParser) parseNumber() (interface{}, error) {
	start := p.pos
	// Optional leading minus
	if p.peek() == '-' {
		p.advance()
	}
	for p.pos < len(p.input) && p.input[p.pos] >= '0' && p.input[p.pos] <= '9' {
		p.advance()
	}
	// Optional decimal part
	if p.pos < len(p.input) && p.input[p.pos] == '.' {
		p.advance()
		for p.pos < len(p.input) && p.input[p.pos] >= '0' && p.input[p.pos] <= '9' {
			p.advance()
		}
	}

	numStr := p.input[start:p.pos]
	if strings.Contains(numStr, ".") {
		f, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number literal %q: %w", numStr, err)
		}
		return f, nil
	}
	i, err := strconv.ParseInt(numStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid number literal %q: %w", numStr, err)
	}
	return float64(i), nil // always return float for consistency in comparisons
}

// parseKeyword parses true, false, or null.
func (p *celParser) parseKeyword() (interface{}, error) {
	start := p.pos
	for p.pos < len(p.input) && ((p.input[p.pos] >= 'a' && p.input[p.pos] <= 'z') || (p.input[p.pos] >= 'A' && p.input[p.pos] <= 'Z')) {
		p.advance()
	}
	word := p.input[start:p.pos]
	switch strings.ToLower(word) {
	case "true":
		return true, nil
	case "false":
		return false, nil
	case "null":
		return nil, nil
	default:
		return nil, fmt.Errorf("unexpected keyword %q at position %d", word, start)
	}
}

// parseFieldAccess parses a dotted identifier path like "agent.maturity.current_level".
func (p *celParser) parseFieldAccess() (interface{}, error) {
	start := p.pos
	// First identifier segment
	if !isIdentStart(p.peek()) {
		return nil, fmt.Errorf("unexpected character %q at position %d", p.peek(), p.pos)
	}
	p.advance()
	for p.pos < len(p.input) && isIdentPart(p.input[p.pos]) {
		p.advance()
	}

	// Collect all segments
	segments := []string{p.input[start:p.pos]}

	for p.pos < len(p.input) && p.input[p.pos] == '.' {
		p.advance() // consume .
		segStart := p.pos
		if p.pos >= len(p.input) || !isIdentStart(p.input[p.pos]) {
			return nil, fmt.Errorf("expected identifier after '.' at position %d", p.pos)
		}
		p.advance()
		for p.pos < len(p.input) && isIdentPart(p.input[p.pos]) {
			p.advance()
		}
		segments = append(segments, p.input[segStart:p.pos])
	}

	// Additionally support method calls: now.getDayOfWeek()
	// For v1, method calls return a placeholder value
	if p.pos < len(p.input) && p.input[p.pos] == '(' {
		p.advance() // consume (
		p.skipWhitespace()
		if p.peek() != ')' {
			// Parse arguments (simplified: ignore them)
			for p.pos < len(p.input) && p.peek() != ')' {
				p.advance()
			}
		}
		if p.peek() == ')' {
			p.advance()
		}
		// Method call on context — return placeholder for v1
		if len(segments) > 0 && segments[0] == "now" {
			return "method_call", nil
		}
		return nil, fmt.Errorf("method calls not supported for %q", strings.Join(segments, "."))
	}

	// Resolve the path in the context
	return resolvePath(segments, p.ctx)
}

// resolvePath walks the context map along the segment path.
func resolvePath(segments []string, ctx map[string]interface{}) (interface{}, error) {
	var current interface{} = ctx
	for _, seg := range segments {
		m, ok := current.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("cannot access field %q on non-object value: %v", seg, current)
		}
		val, exists := m[seg]
		if !exists {
			return nil, fmt.Errorf("field %q not found in context", seg)
		}
		current = val
	}
	return current, nil
}

func isIdentStart(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_'
}

func isIdentPart(ch byte) bool {
	return isIdentStart(ch) || (ch >= '0' && ch <= '9')
}

// ─── Comparison ────────────────────────────────────────────────────────────

// compare performs a runtime comparison between two values.
func compare(op string, left, right interface{}) (bool, error) {
	// Try numeric comparison first
	lf, lIsNum := toFloat(left)
	rf, rIsNum := toFloat(right)

	if lIsNum && rIsNum {
		switch op {
		case "==":
			return lf == rf, nil
		case "!=":
			return lf != rf, nil
		case "<":
			return lf < rf, nil
		case ">":
			return lf > rf, nil
		case "<=":
			return lf <= rf, nil
		case ">=":
			return lf >= rf, nil
		}
	}

	// String comparison
	ls := fmt.Sprintf("%v", left)
	rs := fmt.Sprintf("%v", right)

	switch op {
	case "==":
		return ls == rs, nil
	case "!=":
		return ls != rs, nil
	case "<":
		return ls < rs, nil
	case ">":
		return ls > rs, nil
	case "<=":
		return ls <= rs, nil
	case ">=":
		return ls >= rs, nil
	default:
		return false, fmt.Errorf("unknown operator %q", op)
	}
}

// toFloat attempts to convert a value to float64.
func toFloat(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case int64:
		return float64(val), true
	case int:
		return float64(val), true
	case string:
		f, err := strconv.ParseFloat(val, 64)
		if err != nil {
			return 0, false
		}
		return f, true
	case bool:
		if val {
			return 1, true
		}
		return 0, true
	default:
		return 0, false
	}
}
