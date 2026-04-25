package queue

import (
	"encoding/json"
	"time"

	"github.com/hibiken/asynq"
)

// Task types — asynq task type identifiers for the cell provisioning queue.
const (
	TypeProvisionCell   = "provision:cell"
	TypeDeprovisionCell = "provision:deprovision"
)

// ProvisionCellPayload is enqueued when a new cell provisioning is requested.
type ProvisionCellPayload struct {
	CellID     string `json:"cell_id"`
	Name       string `json:"name"`
	Provider   string `json:"provider"`
	ServerType string `json:"server_type"`
	Region     string `json:"region"`
	UserData   string `json:"user_data,omitempty"`
}

// DeprovisionCellPayload is enqueued when a cell should be destroyed.
type DeprovisionCellPayload struct {
	CellID   string `json:"cell_id"`
	Provider string `json:"provider"`
}

// NewProvisionCellTask creates an asynq task for provisioning a cell.
// Configured with MaxRetry(3) and a 15-minute timeout to account for
// cloud provider provisioning latency.
func NewProvisionCellTask(payload ProvisionCellPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeProvisionCell, data,
		asynq.MaxRetry(3),
		asynq.Timeout(15*time.Minute),
	), nil
}

// NewDeprovisionCellTask creates an asynq task for deprovisioning a cell.
// Configured with MaxRetry(2) and a 10-minute timeout.
func NewDeprovisionCellTask(payload DeprovisionCellPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeDeprovisionCell, data,
		asynq.MaxRetry(2),
		asynq.Timeout(10*time.Minute),
	), nil
}