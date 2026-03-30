package eval

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/featuresignals/server/internal/domain"
)

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

	switch cond.Operator {
	case domain.OpEquals:
		return len(cond.Values) > 0 && strVal == cond.Values[0]
	case domain.OpNotEquals:
		return len(cond.Values) > 0 && strVal != cond.Values[0]
	case domain.OpContains:
		return len(cond.Values) > 0 && strings.Contains(strVal, cond.Values[0])
	case domain.OpStartsWith:
		return len(cond.Values) > 0 && strings.HasPrefix(strVal, cond.Values[0])
	case domain.OpEndsWith:
		return len(cond.Values) > 0 && strings.HasSuffix(strVal, cond.Values[0])
	case domain.OpIn:
		for _, v := range cond.Values {
			if strVal == v {
				return true
			}
		}
		return false
	case domain.OpNotIn:
		for _, v := range cond.Values {
			if strVal == v {
				return false
			}
		}
		return true
	case domain.OpGT, domain.OpGTE, domain.OpLT, domain.OpLTE:
		return compareNumeric(strVal, cond.Values, cond.Operator)
	case domain.OpRegex:
		if len(cond.Values) == 0 {
			return false
		}
		re, err := regexp.Compile(cond.Values[0])
		if err != nil {
			return false
		}
		return re.MatchString(strVal)
	default:
		return false
	}
}

func compareNumeric(strVal string, values []string, op domain.Operator) bool {
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
	switch op {
	case domain.OpGT:
		return a > b
	case domain.OpGTE:
		return a >= b
	case domain.OpLT:
		return a < b
	case domain.OpLTE:
		return a <= b
	default:
		return false
	}
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
