package eval

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// OperatorFunc evaluates a condition operator.
// strVal is the stringified attribute value; values are the condition values.
type OperatorFunc func(strVal string, values []string) bool

// operatorRegistry maps operators to their evaluation function.
// New operators can be registered via RegisterOperator (OCP).
var operatorRegistry = map[domain.Operator]OperatorFunc{
	domain.OpEquals:     opEquals,
	domain.OpNotEquals:  opNotEquals,
	domain.OpContains:   opContains,
	domain.OpStartsWith: opStartsWith,
	domain.OpEndsWith:   opEndsWith,
	domain.OpIn:         opIn,
	domain.OpNotIn:      opNotIn,
	domain.OpGT:         opGT,
	domain.OpGTE:        opGTE,
	domain.OpLT:         opLT,
	domain.OpLTE:        opLTE,
	domain.OpRegex:      opRegex,
}

// RegisterOperator registers (or overrides) an operator evaluation function.
func RegisterOperator(op domain.Operator, fn OperatorFunc) {
	operatorRegistry[op] = fn
}

// ── Regex compile cache ─────────────────────────────────────────────────────

var (
	regexCacheMu sync.RWMutex
	regexCache   = make(map[string]*regexp.Regexp, 64)
)

func getCachedRegex(pattern string) (*regexp.Regexp, error) {
	regexCacheMu.RLock()
	re, ok := regexCache[pattern]
	regexCacheMu.RUnlock()
	if ok {
		return re, nil
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}
	regexCacheMu.Lock()
	regexCache[pattern] = re
	regexCacheMu.Unlock()
	return re, nil
}

// ── Operator implementations ────────────────────────────────────────────────

func opEquals(strVal string, values []string) bool {
	return len(values) > 0 && strVal == values[0]
}

func opNotEquals(strVal string, values []string) bool {
	return len(values) > 0 && strVal != values[0]
}

func opContains(strVal string, values []string) bool {
	return len(values) > 0 && strings.Contains(strVal, values[0])
}

func opStartsWith(strVal string, values []string) bool {
	return len(values) > 0 && strings.HasPrefix(strVal, values[0])
}

func opEndsWith(strVal string, values []string) bool {
	return len(values) > 0 && strings.HasSuffix(strVal, values[0])
}

func opIn(strVal string, values []string) bool {
	for _, v := range values {
		if strVal == v {
			return true
		}
	}
	return false
}

func opNotIn(strVal string, values []string) bool {
	for _, v := range values {
		if strVal == v {
			return false
		}
	}
	return true
}

func numericOp(strVal string, values []string, cmp func(a, b float64) bool) bool {
	if len(values) == 0 {
		return false
	}
	a, err := strconv.ParseFloat(strVal, 64)
	if err != nil {
		return false
	}
	b, err := strconv.ParseFloat(values[0], 64)
	if err != nil {
		return false
	}
	return cmp(a, b)
}

func opGT(strVal string, values []string) bool {
	return numericOp(strVal, values, func(a, b float64) bool { return a > b })
}

func opGTE(strVal string, values []string) bool {
	return numericOp(strVal, values, func(a, b float64) bool { return a >= b })
}

func opLT(strVal string, values []string) bool {
	return numericOp(strVal, values, func(a, b float64) bool { return a < b })
}

func opLTE(strVal string, values []string) bool {
	return numericOp(strVal, values, func(a, b float64) bool { return a <= b })
}

func opRegex(strVal string, values []string) bool {
	if len(values) == 0 {
		return false
	}
	re, err := getCachedRegex(values[0])
	if err != nil {
		return false
	}
	return re.MatchString(strVal)
}

// ── Public API ──────────────────────────────────────────────────────────────

// MatchCondition evaluates a single condition against an evaluation context.
func MatchCondition(cond domain.Condition, ctx domain.EvalContext) bool {
	attrVal, exists := ctx.GetAttribute(cond.Attribute)
	if !exists {
		return cond.Operator == domain.OpExists && len(cond.Values) > 0 && cond.Values[0] == "false"
	}

	if cond.Operator == domain.OpExists {
		return len(cond.Values) == 0 || cond.Values[0] != "false"
	}

	strVal := fmt.Sprintf("%v", attrVal)

	fn, ok := operatorRegistry[cond.Operator]
	if !ok {
		return false
	}
	return fn(strVal, cond.Values)
}

// MatchConditions evaluates multiple conditions using the given match type.
func MatchConditions(conditions []domain.Condition, ctx domain.EvalContext, matchType domain.MatchType) bool {
	if len(conditions) == 0 {
		return true
	}

	for _, cond := range conditions {
		matched := MatchCondition(cond, ctx)
		if matchType == domain.MatchAny && matched {
			return true
		}
		if matchType == domain.MatchAll && !matched {
			return false
		}
	}

	return matchType == domain.MatchAll
}
