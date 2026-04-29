package domain

import "time"

type ClusterMetric struct {
	ID         string    `json:"id"`
	ClusterID  string    `json:"cluster_id"`
	CPU        float64   `json:"cpu"`
	Memory     float64   `json:"memory"`
	Disk       float64   `json:"disk"`
	RecordedAt time.Time `json:"recorded_at"`
}