package domain

// Store is a composite interface that groups all store interfaces together.
// This is the single dependency for the router and main.go, but individual
// handlers receive only the narrowest interface they need (ISP).
type Store struct {
	Clusters        ClusterStore
	Users           OpsUserStore
	Deploy          DeploymentStore
	Config          ConfigSnapshotStore
	Audit           AuditStore
	ConfigTemplates ConfigTemplateStore
}