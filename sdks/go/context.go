package featuresignals

// EvalContext represents the user/entity being evaluated.
type EvalContext struct {
	Key        string
	Attributes map[string]interface{}
}

// NewContext creates a new evaluation context.
func NewContext(key string) EvalContext {
	return EvalContext{Key: key, Attributes: make(map[string]interface{})}
}

// WithAttribute adds an attribute to the context.
func (c EvalContext) WithAttribute(key string, value interface{}) EvalContext {
	c.Attributes[key] = value
	return c
}
