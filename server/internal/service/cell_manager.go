// Package service implements domain interfaces as orchestrating services.
// CellManager manages the lifecycle of k3s-based cells (single-node clusters)
// that run FeatureSignals workloads. For MVP, all operations target the local
// k3s cluster. Future versions will provision Hetzner VPSes via hcloud API.
package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/featuresignals/server/internal/domain"
)

// CellManager implements domain.CellManager by orchestrating Kubernetes
// resources on the local k3s cluster. For MVP, cells are namespaced deployments
// within the same single-node k3s instance. The architecture abstracts provider
// details so that future implementations can provision real VPS instances.
type CellManager struct {
	store      domain.CellStore
	k8sClients *kubernetes.Clientset
	logger     *slog.Logger
}

// NewCellManager creates a new CellManager with the given store, Kubernetes
// config, and logger. If kubeconfigPath is empty, it attempts in-cluster config.
// This constructor requires k8s.io/client-go and k8s.io/apimachinery as dependencies.
func NewCellManager(
	store domain.CellStore,
	kubeconfigPath string,
	logger *slog.Logger,
) (*CellManager, error) {
	config, err := buildK8sConfig(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("build k8s config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("create kubernetes clientset: %w", err)
	}

	return &CellManager{
		store:      store,
		k8sClients: clientset,
		logger:     logger.With("service", "cell_manager"),
	}, nil
}

// Provision creates a new cell: records metadata in the store and creates
// the cell's Kubernetes namespace. For MVP, cells are namespaced deployments
// within the same single-node k3s instance. Future versions will provision
// a VPS via the cloud provider API and install k3s + the Helm chart remotely.
func (m *CellManager) Provision(ctx context.Context, req *domain.CellProvisionRequest) (*domain.Cell, error) {
	logger := m.logger.With("provider", req.Provider, "region", req.Region)

	cell := &domain.Cell{
		ID:       uuid.New().String(),
		Name:     req.Name,
		Provider: req.Provider,
		Region:   req.Region,
		Status:   domain.CellStatusProvisioning,
		Version:  "0.1.0",
		CPU:      domain.ResourceUsage{Total: 4, Used: 0, Available: 4, Percent: 0},
		Memory:   domain.ResourceUsage{Total: 8, Used: 0, Available: 8, Percent: 0},
		Disk:     domain.ResourceUsage{Total: 80, Used: 0, Available: 80, Percent: 0},
	}

	if err := m.store.CreateCell(ctx, cell); err != nil {
		return nil, fmt.Errorf("create cell record: %w", err)
	}

	// Create the cell namespace to isolate workloads.
	if err := m.ensureNamespace(ctx, cell.ID); err != nil {
		return nil, fmt.Errorf("ensure cell namespace: %w", err)
	}

	cell.Status = domain.CellStatusRunning
	cell.UpdatedAt = time.Now().UTC()
	if err := m.store.UpdateCell(ctx, cell); err != nil {
		return nil, fmt.Errorf("update cell status to running: %w", err)
	}

	logger.Info("cell provisioned", "cell_id", cell.ID, "cell_name", cell.Name)
	return cell, nil
}

// Decommission tears down a cell: drains tenants, removes the Kubernetes
// namespace (which cascadingly deletes all resources), and removes the
// database record. All tenants must be migrated off before calling this.
func (m *CellManager) Decommission(ctx context.Context, cellID string) error {
	logger := m.logger.With("cell_id", cellID)

	cell, err := m.store.GetCell(ctx, cellID)
	if err != nil {
		return fmt.Errorf("get cell for decommission: %w", err)
	}

	// Drain first to move tenants off.
	if err := m.Drain(ctx, cellID); err != nil {
		logger.Warn("drain during decommission encountered issues", "error", err)
		// Continue even if drain has partial failures.
	}

	// Delete the cell namespace (removes all workloads).
	if err := m.deleteNamespace(ctx, cell.ID); err != nil {
		return fmt.Errorf("delete cell namespace: %w", err)
	}

	// Remove the database record.
	if err := m.store.DeleteCell(ctx, cellID); err != nil {
		return fmt.Errorf("delete cell record: %w", err)
	}

	logger.Info("cell decommissioned",
		"provider", cell.Provider,
		"region", cell.Region,
	)
	return nil
}

// GetStatus returns the current operational health of a cell by querying
// its Kubernetes namespace for pod status. Falls back to stored data if
// the Kubernetes API is unreachable.
func (m *CellManager) GetStatus(ctx context.Context, cellID string) (*domain.CellStatus, error) {
	logger := m.logger.With("cell_id", cellID)

	cell, err := m.store.GetCell(ctx, cellID)
	if err != nil {
		return nil, fmt.Errorf("get cell for status: %w", err)
	}

	pods, healthy, unhealthy, err := m.countPods(ctx, cell.ID)
	if err != nil {
		logger.Warn("failed to count pods, using stored data", "error", err)
		return &domain.CellStatus{
			CellID:    cell.ID,
			Phase:     cell.Status,
			Pods:      0,
			Healthy:   0,
			Unhealthy: 0,
		}, nil
	}

	phase := cell.Status
	if unhealthy > 0 && pods > 0 {
		phase = domain.CellStatusDegraded
	}

	return &domain.CellStatus{
		CellID:    cell.ID,
		Phase:     phase,
		Pods:      pods,
		Healthy:   healthy,
		Unhealthy: unhealthy,
	}, nil
}

// List returns all cells matching the given filter, ordered by creation
// date descending. Applies default pagination limits.
func (m *CellManager) List(ctx context.Context, filter domain.CellFilter) ([]*domain.Cell, error) {
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	cells, err := m.store.ListCells(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list cells: %w", err)
	}
	return cells, nil
}

// Scale adjusts the number of application replicas for the cell's deployment.
// For single-node k3s MVP, this controls the pod count of the FeatureSignals
// deployment. In future multi-node deployments, this will scale the VPS itself.
func (m *CellManager) Scale(ctx context.Context, cellID string, replicas int32) error {
	logger := m.logger.With("cell_id", cellID, "replicas", replicas)

	if replicas < 1 {
		return domain.NewValidationError("replicas", "must be at least 1")
	}

	cell, err := m.store.GetCell(ctx, cellID)
	if err != nil {
		return fmt.Errorf("get cell for scale: %w", err)
	}

	if err := m.scaleDeployment(ctx, cell.ID, "featuresignals-api", replicas); err != nil {
		return fmt.Errorf("scale api deployment: %w", err)
	}
	if err := m.scaleDeployment(ctx, cell.ID, "featuresignals-dashboard", replicas); err != nil {
		return fmt.Errorf("scale dashboard deployment: %w", err)
	}

	logger.Info("cell scaled")
	return nil
}

// Drain marks a cell as "draining" in preparation for maintenance or
// decommissioning. In the MVP, this updates the status in the store.
// Future implementations will cordon the k3s node, evict pods with PDBs,
// and migrate tenants to other cells.
func (m *CellManager) Drain(ctx context.Context, cellID string) error {
	logger := m.logger.With("cell_id", cellID)

	cell, err := m.store.GetCell(ctx, cellID)
	if err != nil {
		return fmt.Errorf("get cell for drain: %w", err)
	}

	// Mark as draining — the scheduler will block new tenant assignments.
	cell.Status = domain.CellStatusDraining
	cell.UpdatedAt = time.Now().UTC()
	if err := m.store.UpdateCell(ctx, cell); err != nil {
		return fmt.Errorf("update cell status to draining: %w", err)
	}

	logger.Info("cell drain initiated")

	// Mark as down after drain completes.
	cell.Status = domain.CellStatusDown
	cell.UpdatedAt = time.Now().UTC()
	if err := m.store.UpdateCell(ctx, cell); err != nil {
		return fmt.Errorf("update cell status to down: %w", err)
	}

	logger.Info("cell drain completed")
	return nil
}

// GetMetrics returns resource utilization metrics for a cell. For MVP, this
// reads from the store's last-known values. Future: poll k3s node metrics
// via the Kubernetes Metrics API or a monitoring agent.
func (m *CellManager) GetMetrics(ctx context.Context, cellID string) (*domain.CellMetrics, error) {
	cell, err := m.store.GetCell(ctx, cellID)
	if err != nil {
		return nil, fmt.Errorf("get cell for metrics: %w", err)
	}

	now := time.Now().UTC()
	metrics := &domain.CellMetrics{
		CellID:      cell.ID,
		CPUPercent:  cell.CPU.Percent,
		MemPercent:  cell.Memory.Percent,
		DiskPercent: cell.Disk.Percent,
		RequestRate: 0,
		ErrorRate:   0,
		CollectedAt: now,
	}

	// Attempt to refresh from Kubernetes if the cell is running.
	if cell.Status == domain.CellStatusRunning || cell.Status == domain.CellStatusDegraded {
		cpu, mem, disk, err := m.collectNodeMetrics(ctx)
		if err != nil {
			m.logger.Warn("failed to collect node metrics, using stored values",
				"cell_id", cellID, "error", err,
			)
			return metrics, nil
		}
		metrics.CPUPercent = cpu
		metrics.MemPercent = mem
		metrics.DiskPercent = disk

		// Persist updated metrics back to the store.
		cell.CPU.Percent = cpu
		cell.Memory.Percent = mem
		cell.Disk.Percent = disk
		cell.UpdatedAt = now
		if err := m.store.UpdateCell(ctx, cell); err != nil {
			m.logger.Warn("failed to persist updated metrics",
				"cell_id", cellID, "error", err,
			)
		}
	}

	return metrics, nil
}

// ensureNamespace creates a Kubernetes namespace for the cell if it doesn't
// already exist. Namespaces are labeled for operator discovery.
func (m *CellManager) ensureNamespace(ctx context.Context, cellID string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: cellNamespace(cellID),
			Labels: map[string]string{
				"app.kubernetes.io/component": "cell",
				"cell.featuresignals.com/id":  cellID,
			},
		},
	}
	_, err := m.k8sClients.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	if err != nil && !apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("create namespace: %w", err)
	}
	return nil
}

// deleteNamespace removes the Kubernetes namespace for the cell, which
// cascadingly deletes all its resources (pods, services, configmaps, etc).
func (m *CellManager) deleteNamespace(ctx context.Context, cellID string) error {
	propagation := metav1.DeletePropagationForeground
	err := m.k8sClients.CoreV1().Namespaces().Delete(ctx,
		cellNamespace(cellID),
		metav1.DeleteOptions{PropagationPolicy: &propagation},
	)
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("delete namespace: %w", err)
	}
	return nil
}

// countPods queries the Kubernetes API for pod counts in the cell namespace.
// A pod is healthy if it is Running and all its containers report Ready.
func (m *CellManager) countPods(ctx context.Context, cellID string) (total, healthy, unhealthy int, _ error) {
	pods, err := m.k8sClients.CoreV1().Pods(cellNamespace(cellID)).List(ctx, metav1.ListOptions{})
	if err != nil {
		return 0, 0, 0, fmt.Errorf("list pods: %w", err)
	}

	for _, pod := range pods.Items {
		total++
		if pod.Status.Phase == corev1.PodRunning {
			allReady := true
			for _, c := range pod.Status.ContainerStatuses {
				if !c.Ready {
					allReady = false
					break
				}
			}
			if allReady {
				healthy++
			} else {
				unhealthy++
			}
		} else {
			unhealthy++
		}
	}

	return total, healthy, unhealthy, nil
}

// scaleDeployment updates the replica count of a named deployment in the
// cell's Kubernetes namespace.
func (m *CellManager) scaleDeployment(ctx context.Context, cellID, name string, replicas int32) error {
	deployment, err := m.k8sClients.AppsV1().Deployments(cellNamespace(cellID)).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get deployment %s: %w", name, err)
	}
	deployment.Spec.Replicas = &replicas
	_, err = m.k8sClients.AppsV1().Deployments(cellNamespace(cellID)).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update deployment %s replicas: %w", name, err)
	}
	return nil
}

// collectNodeMetrics reads resource utilization from the k3s node. For MVP,
// this returns zero values. Production implementations should use the
// Kubernetes Metrics API (metrics-server) or a node exporter.
func (m *CellManager) collectNodeMetrics(_ context.Context) (cpu, mem, disk float64, _ error) {
	// TODO: Implementation using k8s.io/metrics or node-exporter endpoint.
	// For MVP, return zero (metrics-server not deployed by default on k3s).
	return 0, 0, 0, nil
}

// cellNamespace returns the Kubernetes namespace name for a given cell ID.
func cellNamespace(cellID string) string {
	return "cell-" + cellID
}

// buildK8sConfig constructs a Kubernetes client configuration. It prefers
// in-cluster config when running inside a pod. Falls back to a kubeconfig
// file when kubeconfigPath is non-empty.
func buildK8sConfig(kubeconfigPath string) (*rest.Config, error) {
	if kubeconfigPath == "" {
		config, err := rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("in-cluster config: %w", err)
		}
		return config, nil
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("build config from %s: %w", kubeconfigPath, err)
	}
	return config, nil
}