package iac

import (
	"strings"
	"unicode"
)

// toSnakeCase converts a string to snake_case.
// It handles CamelCase, kebab-case, and space-separated input.
func toSnakeCase(s string) string {
	if s == "" {
		return ""
	}

	var result strings.Builder
	runes := []rune(s)
	for i, r := range runes {
		if r == '-' || r == ' ' || r == '.' {
			if i > 0 && i < len(runes)-1 {
				result.WriteRune('_')
			}
			continue
		}
		if unicode.IsUpper(r) {
			if i > 0 {
				prev := runes[i-1]
				if unicode.IsLower(prev) || (unicode.IsDigit(prev) && i+1 < len(runes) && unicode.IsLower(runes[i+1])) {
					result.WriteRune('_')
				}
			}
			result.WriteRune(unicode.ToLower(r))
		} else {
			result.WriteRune(r)
		}
	}
	return strings.Trim(result.String(), "_")
}

// indent prepends n spaces to each line of s.
func indent(s string, n int) string {
	if s == "" || n <= 0 {
		return s
	}
	prefix := strings.Repeat(" ", n)
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		if line != "" {
			lines[i] = prefix + line
		}
	}
	return strings.Join(lines, "\n")
}

// terraformResourceName converts a string to a valid Terraform resource name.
// Terraform resource names must start with a letter or underscore and may
// contain only letters, digits, underscores, and hyphens.
func terraformResourceName(s string) string {
	if s == "" {
		return "resource"
	}

	snake := toSnakeCase(s)
	if snake == "" {
		return "resource"
	}

	// Ensure it starts with a letter or underscore
	runes := []rune(snake)
	if !unicode.IsLetter(runes[0]) && runes[0] != '_' {
		snake = "r_" + snake
	}

	return snake
}

// pulumiResourceName converts a string to a valid Pulumi resource name.
// Pulumi names are PascalCase identifiers.
func pulumiResourceName(s string) string {
	if s == "" {
		return "Resource"
	}

	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '-' || r == '_' || r == ' ' || r == '.'
	})

	for i, p := range parts {
		if len(p) > 0 {
			runes := []rune(p)
			runes[0] = unicode.ToUpper(runes[0])
			parts[i] = string(runes)
		}
	}

	return strings.Join(parts, "")
}

// ansibleSanitize sanitizes a string for use as an Ansible variable name.
func ansibleSanitize(s string) string {
	if s == "" {
		return "var"
	}

	snake := toSnakeCase(s)
	runes := []rune(snake)

	// Ansible variable names must start with a letter
	if len(runes) > 0 && !unicode.IsLetter(runes[0]) {
		snake = "v_" + snake
	}

	return snake
}

// quoteList returns a comma-separated list of quoted strings.
func quoteList(items []string) string {
	if len(items) == 0 {
		return ""
	}
	quoted := make([]string, len(items))
	for i, item := range items {
		quoted[i] = `"` + item + `"`
	}
	return strings.Join(quoted, ", ")
}