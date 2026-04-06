package payment

import "fmt"

// Registry maps gateway names to their implementations.
// Populated during application startup in main.go.
type Registry struct {
	gateways map[string]Gateway
}

// NewRegistry creates an empty gateway registry.
func NewRegistry() *Registry {
	return &Registry{gateways: make(map[string]Gateway)}
}

// Register adds a gateway to the registry. Panics if name is empty.
func (r *Registry) Register(gw Gateway) {
	if gw.Name() == "" {
		panic("payment: gateway name must not be empty")
	}
	r.gateways[gw.Name()] = gw
}

// Get returns the gateway with the given name or an error if not found.
func (r *Registry) Get(name string) (Gateway, error) {
	gw, ok := r.gateways[name]
	if !ok {
		return nil, fmt.Errorf("payment gateway %q not registered", name)
	}
	return gw, nil
}

// Has returns true if a gateway with the given name is registered.
func (r *Registry) Has(name string) bool {
	_, ok := r.gateways[name]
	return ok
}

// Names returns the list of registered gateway names.
func (r *Registry) Names() []string {
	names := make([]string, 0, len(r.gateways))
	for name := range r.gateways {
		names = append(names, name)
	}
	return names
}
