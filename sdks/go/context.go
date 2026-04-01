package featuresignals

// EvalContext represents the user/entity being evaluated.
type EvalContext struct {
	Key        string                 `json:"key"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// NewContext creates a new evaluation context with the given user key.
func NewContext(key string) EvalContext {
	return EvalContext{Key: key, Attributes: make(map[string]interface{})}
}

// WithAttribute returns a copy of the context with the given attribute added.
func (c EvalContext) WithAttribute(key string, value interface{}) EvalContext {
	attrs := make(map[string]interface{}, len(c.Attributes)+1)
	for k, v := range c.Attributes {
		attrs[k] = v
	}
	attrs[key] = value
	return EvalContext{Key: c.Key, Attributes: attrs}
}
