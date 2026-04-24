export interface Cell {
  id: string;
  name: string;
  region: string;
  cloud: string;
  tenantCount: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  status: CellStatus;
  createdAt: string;
  updatedAt: string;
}

export type CellStatus = 'healthy' | 'degraded' | 'down' | 'empty' | 'draining';

export interface CellHealth {
  cellId: string;
  cellName: string;
  status: CellStatus;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  networkInBps: number;
  networkOutBps: number;
  tenantCount: number;
  lastCheckedAt: string;
}

export interface CellMetrics {
  cpu: TimeSeriesPoint[];
  memory: TimeSeriesPoint[];
  disk: TimeSeriesPoint[];
  network: NetworkMetrics;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface NetworkMetrics {
  inBps: TimeSeriesPoint[];
  outBps: TimeSeriesPoint[];
}

export interface PodStatus {
  name: string;
  status: 'running' | 'pending' | 'failed' | 'succeeded';
  restarts: number;
  cpuUsage: number;
  memoryUsage: number;
  age: string;
}

export interface CellLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

export interface CellListResponse {
  cells: Cell[];
  total: number;
}

export interface CellHealthResponse {
  cells: CellHealth[];
  summary: {
    healthy: number;
    degraded: number;
    down: number;
    empty: number;
    draining: number;
    total: number;
  };
}

export interface ScaleRequest {
  replicas: number;
  reason: string;
}

export interface DrainRequest {
  reason: string;
  drainTimeout: number;
  migrateTenants: boolean;
  targetCellId?: string;
}

export interface MigrateRequest {
  tenantIds: string[];
  targetCellId: string;
  reason: string;
}
