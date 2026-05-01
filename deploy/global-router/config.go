package main

import (
	"errors"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Router RouterConfig `yaml:"router"`
}

type RouterConfig struct {
	Domain       string        `yaml:"domain"`
	Email        string        `yaml:"email"`
	TLS          TLSConfig     `yaml:"tls"`
	DNS          DNSConfig     `yaml:"dns"`
	Domains      []Domain      `yaml:"domains"`
	RateLimit    RateLimitCfg  `yaml:"rate_limit"`
	Cluster      ClusterInfo   `yaml:"cluster"`
	PeerClusters []ClusterInfo `yaml:"peer_clusters"`
	ConnLimit    int           `yaml:"conn_limit"`
	MaxIPs       int           `yaml:"max_ips"`
}

type TLSConfig struct {
	CacheDir string `yaml:"cache_dir"`
	Port     int    `yaml:"port"`
}

type DNSConfig struct {
	Enabled bool `yaml:"enabled"`
	Port    int  `yaml:"port"`
}

type Domain struct {
	Name      string `yaml:"name"`
	Type      string `yaml:"type"` // "static" or "proxy"
	Root      string `yaml:"root,omitempty"`
	Target    string `yaml:"target,omitempty"`
	RateLimit string `yaml:"rate_limit,omitempty"`
	Auth      string `yaml:"auth,omitempty"`
}

type RateLimitCfg struct {
	Default string `yaml:"default"`
	Burst   int    `yaml:"burst"`
	Window  string `yaml:"window"`
}

type ClusterInfo struct {
	Name     string `yaml:"name"`
	Region   string `yaml:"region"`
	PublicIP string `yaml:"public_ip"`
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// Validate checks the configuration for required fields and applies defaults.
// Returns an error describing all validation failures.
func (c *Config) Validate() error {
	var errs []error

	if len(c.Router.Domains) == 0 {
		errs = append(errs, errors.New("router.domains: at least one domain must be configured"))
	}

	if c.Router.Cluster.Name == "" {
		errs = append(errs, errors.New("router.cluster.name: required"))
	}

	// Apply defaults
	if c.Router.TLS.Port == 0 {
		c.Router.TLS.Port = 443
	}
	if c.Router.TLS.CacheDir == "" {
		c.Router.TLS.CacheDir = "/data/certs"
	}
	if c.Router.ConnLimit <= 0 {
		c.Router.ConnLimit = 100
	}
	if c.Router.MaxIPs <= 0 {
		c.Router.MaxIPs = 100000
	}

	// Validate each domain
	for i, d := range c.Router.Domains {
		if d.Name == "" {
			errs = append(errs, fmt.Errorf("router.domains[%d].name: required", i))
		}
		if d.Type != "static" && d.Type != "proxy" {
			errs = append(errs, fmt.Errorf("router.domains[%d].type: must be 'static' or 'proxy', got '%s'", i, d.Type))
		}
		if d.Type == "static" && d.Root == "" {
			errs = append(errs, fmt.Errorf("router.domains[%d].root: required for static domains", i))
		}
		if d.Type == "proxy" && d.Target == "" {
			errs = append(errs, fmt.Errorf("router.domains[%d].target: required for proxy domains", i))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("config validation failed: %w", errors.Join(errs...))
	}
	return nil
}