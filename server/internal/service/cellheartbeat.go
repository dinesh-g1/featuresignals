package service

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/provision"
)

// cellFailureTracker tracks consecutive SSH failures per cell.
type cellFailureTracker struct {
	mu       sync.Mutex
	failures map[string]int
}

func (t *cellFailureTracker) recordFailure(cellID string) int {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.failures[cellID]++
	return t.failures[cellID]
}

func (t *cellFailureTracker) recordSuccess(cellID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.failures, cellID)
}

func (t *cellFailureTracker) isDegraded(cellID string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.failures[cellID] >= 3
}

// Run periodically collects metrics from all running cells and updates the store.
func Run(ctx context.Context, store domain.CellStore, sshAccess *provision.SSHAccess, logger *slog.Logger, interval time.Duration) {
	tracker := &cellFailureTracker{failures: make(map[string]int)}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	logger.Info("cell heartbeat started", "interval", interval)

	for {
		select {
		case <-ctx.Done():
			logger.Info("cell heartbeat stopped")
			return
		case <-ticker.C:
			collectMetrics(ctx, store, sshAccess, logger, tracker)
		}
	}
}

func collectMetrics(ctx context.Context, store domain.CellStore, sshAccess *provision.SSHAccess, logger *slog.Logger, tracker *cellFailureTracker) {
	cells, err := store.ListCells(ctx, domain.CellFilter{Limit: 100})
	if err != nil {
		logger.Error("heartbeat: failed to list cells", "error", err)
		return
	}

	for _, cell := range cells {
		if cell.Status != "running" && cell.Status != "degraded" {
			continue
		}
		if cell.PublicIP == "" {
			continue
		}

		cellID := cell.ID
		metrics, err := collectCellMetrics(ctx, sshAccess, cell.PublicIP)
		if err != nil {
			failures := tracker.recordFailure(cellID)
			logger.Warn("heartbeat: failed to collect metrics",
				"cell_id", cellID, "public_ip", cell.PublicIP,
				"consecutive_failures", failures, "error", err,
			)
			if tracker.isDegraded(cellID) && cell.Status != "degraded" {
				cell.Status = "degraded"
				cell.UpdatedAt = time.Now().UTC()
				if updateErr := store.UpdateCell(ctx, cell); updateErr != nil {
					logger.Error("heartbeat: failed to mark cell degraded", "cell_id", cellID, "error", updateErr)
				}
				logger.Warn("heartbeat: cell marked degraded", "cell_id", cellID, "public_ip", cell.PublicIP)
			}
			continue
		}

		// Success: update metrics and restore status
		tracker.recordSuccess(cellID)
		cell.CPU.Percent = metrics.CPUPercent
		cell.Memory.Percent = metrics.MemPercent
		cell.Disk.Percent = metrics.DiskPercent
		cell.CPU.Used = math.Round(float64(cell.CPU.Total) * metrics.CPUPercent / 100)
		cell.Memory.Used = math.Round(float64(cell.Memory.Total) * metrics.MemPercent / 100)
		cell.Disk.Used = math.Round(float64(cell.Disk.Total) * metrics.DiskPercent / 100)

		if cell.Status == "degraded" {
			cell.Status = "running"
			logger.Info("heartbeat: cell recovered from degraded", "cell_id", cellID)
		}
		cell.UpdatedAt = time.Now().UTC()
		if err := store.UpdateCell(ctx, cell); err != nil {
			logger.Error("heartbeat: failed to update cell metrics", "cell_id", cellID, "error", err)
		} else {
			logger.Debug("heartbeat: cell metrics updated",
				"cell_id", cellID,
				"cpu", fmt.Sprintf("%.1f%%", metrics.CPUPercent),
				"mem", fmt.Sprintf("%.1f%%", metrics.MemPercent),
				"disk", fmt.Sprintf("%.1f%%", metrics.DiskPercent),
			)
		}
	}
}

type cellMetrics struct {
	CPUPercent  float64
	MemPercent  float64
	DiskPercent float64
}

func collectCellMetrics(ctx context.Context, sshAccess *provision.SSHAccess, host string) (*cellMetrics, error) {
	// Run free -m for memory
	memOutput, err := sshAccess.Execute(ctx, host, "free -m | awk '/^Mem:/ {print $3,$2}'")
	if err != nil {
		return nil, fmt.Errorf("memory: %w", err)
	}
	memParts := strings.Fields(memOutput)
	var memPercent float64
	if len(memParts) >= 2 {
		used, _ := strconv.ParseFloat(memParts[0], 64)
		total, _ := strconv.ParseFloat(memParts[1], 64)
		if total > 0 {
			memPercent = used / total * 100
		}
	}

	// Run df -h / for disk
	diskOutput, err := sshAccess.Execute(ctx, host, "df / | awk 'NR==2 {print $3,$2}'")
	if err != nil {
		return nil, fmt.Errorf("disk: %w", err)
	}
	// df output is in 1K blocks
	diskParts := strings.Fields(diskOutput)
	var diskPercent float64
	if len(diskParts) >= 2 {
		used, _ := strconv.ParseFloat(diskParts[0], 64)
		total, _ := strconv.ParseFloat(diskParts[1], 64)
		if total > 0 {
			diskPercent = used / total * 100
		}
	}

	// Run top for CPU (using /proc/stat)
	cpuOutput, err := sshAccess.Execute(ctx, host, "top -bn1 | grep 'Cpu(s)' | awk '{print $8}'")
	if err != nil {
		// Fallback: try /proc/stat
		cpuOutput, err = sshAccess.Execute(ctx, host, "awk '/^cpu / {idle=$5; total=$2+$3+$4+$5+$6+$7+$8; print (1-idle/total)*100}' /proc/stat")
		if err != nil {
			return nil, fmt.Errorf("cpu: %w", err)
		}
	}
	cpuStr := strings.TrimSpace(cpuOutput)
	var cpuPercent float64
	if cpuStr != "" {
		cpuPercent, _ = strconv.ParseFloat(cpuStr, 64)
		// top -bn1 gives idle %, so CPU% = 100 - idle%
		if cpuPercent < 50 {
			cpuPercent = 100 - cpuPercent
		}
	}

	return &cellMetrics{
		CPUPercent:  math.Round(cpuPercent*10) / 10,
		MemPercent:  math.Round(memPercent*10) / 10,
		DiskPercent: math.Round(diskPercent*10) / 10,
	}, nil
}