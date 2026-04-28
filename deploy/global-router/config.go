package main

import (
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