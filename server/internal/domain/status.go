package domain

import "time"

// StatusCheck represents a single health check of one component in one region.
type StatusCheck struct {
	ID        int64     `json:"id"`
	Region    string    `json:"region"`
	Component string    `json:"component"`
	Status    string    `json:"status"`
	LatencyMs int       `json:"latency_ms"`
	Message   string    `json:"message,omitempty"`
	CheckedAt time.Time `json:"checked_at"`
}

// DailyComponentStatus aggregates uptime for a component/region over a single day.
type DailyComponentStatus struct {
	Date              string  `json:"date"`
	Region            string  `json:"region"`
	Component         string  `json:"component"`
	UptimePct         float64 `json:"uptime_pct"`
	TotalChecks       int     `json:"total_checks"`
	OperationalChecks int     `json:"operational_checks"`
}
