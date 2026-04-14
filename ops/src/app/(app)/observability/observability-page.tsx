"use client";

import { useState } from "react";
import { Eye, Database, BarChart3, Search, Terminal } from "lucide-react";

export function ObservabilityPage() {
  const [activeTab, setActiveTab] = useState<"logs" | "database" | "metrics" | "terminal">("logs");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Observability</h1>
        <p className="mt-1 text-sm text-gray-400">Logs, database access, metrics, and terminal for customer environments</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1 border border-gray-800">
        <TabButton icon={<Search className="h-4 w-4" />} label="Logs" active={activeTab === "logs"} onClick={() => setActiveTab("logs")} />
        <TabButton icon={<Database className="h-4 w-4" />} label="Database" active={activeTab === "database"} onClick={() => setActiveTab("database")} />
        <TabButton icon={<BarChart3 className="h-4 w-4" />} label="Metrics" active={activeTab === "metrics"} onClick={() => setActiveTab("metrics")} />
        <TabButton icon={<Terminal className="h-4 w-4" />} label="Terminal" active={activeTab === "terminal"} onClick={() => setActiveTab("terminal")} />
      </div>

      {activeTab === "logs" && <LogsPanel />}
      {activeTab === "database" && <DatabasePanel />}
      {activeTab === "metrics" && <MetricsPanel />}
      {activeTab === "terminal" && <TerminalPanel />}
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LogsPanel() {
  const [envId, setEnvId] = useState("");
  const [service, setService] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchLogs() {
    if (!envId) return;
    setLoading(true);
      setError(null);
    try {
      // Placeholder - actual implementation fetches from backend
      setLogs([
        `[2026-04-14T10:23:45Z] INFO  server: Request processed org_id=abc123 duration=45ms`,
        `[2026-04-14T10:23:46Z] DEBUG server: Cache hit for flag evaluation flag_id=flag_xyz`,
        `[2026-04-14T10:23:47Z] INFO  server: Health check passed`,
        `[2026-04-14T10:23:48Z] WARN  server: Slow query detected duration=1234ms query="SELECT * FROM flags"`,
        `[2026-04-14T10:23:49Z] INFO  caddy: TLS certificate renewed for customer1.featuresignals.com`,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" value={envId} onChange={(e) => setEnvId(e.target.value)} placeholder="Environment ID" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
          <option value="">All Services</option>
          <option value="server">API Server</option>
          <option value="dashboard">Dashboard</option>
          <option value="caddy">Caddy</option>
          <option value="postgres">PostgreSQL</option>
        </select>
        <button onClick={fetchLogs} disabled={!envId || loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Loading..." : "Fetch Logs"}
        </button>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 font-mono text-xs text-gray-300 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-600">Enter an environment ID and click "Fetch Logs"</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="py-0.5">
              {line.includes("ERROR") ? (
                <span className="text-red-400">{line}</span>
              ) : line.includes("WARN") ? (
                <span className="text-yellow-400">{line}</span>
              ) : line.includes("DEBUG") ? (
                <span className="text-blue-400">{line}</span>
              ) : (
                <span>{line}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DatabasePanel() {
  const [envId, setEnvId] = useState("");
  const [query, setQuery] = useState("SELECT COUNT(*) FROM organizations;");
  const [results, setResults] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" value={envId} onChange={(e) => setEnvId(e.target.value)} placeholder="Environment ID" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-300">SQL Query (Read-Only)</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
          placeholder="SELECT ... FROM ... WHERE ..."
        />
        <button className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Execute Query
        </button>
        {results && (
          <pre className="mt-4 rounded-lg bg-gray-950 p-4 font-mono text-xs text-gray-300 max-h-64 overflow-y-auto">
            {results}
          </pre>
        )}
      </div>
    </div>
  );
}

function MetricsPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-600" />
        <p className="text-gray-500">SigNoz/Grafana integration goes here.</p>
        <p className="mt-1 text-sm text-gray-600">Embed dashboards from your central monitoring instance.</p>
      </div>
    </div>
  );
}

function TerminalPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <p className="mb-2 text-sm font-medium text-gray-300">SSH Terminal (Break-Glass Access)</p>
        <div className="rounded-lg bg-gray-950 p-4 font-mono text-xs text-gray-300 h-96 overflow-y-auto">
          <p className="text-gray-600">Click "Connect" to start a break-glass SSH session.</p>
          <p className="text-gray-600">Sessions are limited to 15 minutes and fully audited.</p>
        </div>
        <button className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          Connect (15 min session)
        </button>
      </div>
    </div>
  );
}
