"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { SegmentRulesEditor } from "@/components/segment-rules-editor";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Input, Label, EmptyState } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Users, Trash2, ChevronDown } from "lucide-react";
import type { Segment, Condition } from "@/lib/types";
import { cn } from "@/lib/utils";

const MATCH_TYPE_OPTIONS = [
  { value: "all", label: "All conditions must match" },
  { value: "any", label: "Any condition must match" },
];

export default function SegmentsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", match_type: "all" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function reload() {
    if (!token || !projectId) return;
    api.listSegments(token, projectId).then((s) => setSegments(s ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token, projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    try {
      await api.createSegment(token, projectId, { ...form, rules: [] });
      setShowCreate(false);
      setForm({ key: "", name: "", description: "", match_type: "all" });
      toast("Segment created", "success");
      reload();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create segment", "error");
    }
  }

  async function handleDelete(segKey: string) {
    if (!token || !projectId) return;
    try {
      await api.deleteSegment(token, projectId, segKey);
      setDeleting(null);
      toast("Segment deleted", "success");
      reload();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete segment", "error");
      setDeleting(null);
    }
  }

  async function handleSaveRules(segKey: string, rules: Condition[], matchType: string) {
    if (!token || !projectId) return;
    try {
      await api.updateSegment(token, projectId, segKey, { rules, match_type: matchType });
      toast("Segment rules saved", "success");
      reload();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to save rules", "error");
    }
  }

  if (!projectId) {
    return (
      <EmptyState
        icon={Users}
        title="No project selected"
        description="Create a project using the sidebar to start managing segments."
        className="py-24"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Segments"
        description="Reusable audience definitions for targeting"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>Create Segment</Button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-4 shadow-sm ring-1 ring-indigo-100 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Key</Label>
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="beta-users" required className="mt-1" />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beta Users" required className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Users enrolled in beta program" className="mt-1" />
          </div>
          <div>
            <Label>Match Type</Label>
            <div className="mt-1">
              <Select value={form.match_type} onValueChange={(val) => setForm({ ...form, match_type: val })} options={MATCH_TYPE_OPTIONS} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <Card>
        <div className="divide-y divide-slate-100">
          {segments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No segments yet"
              description="Create a segment to define reusable audiences."
            />
          ) : (
            segments.map((seg) => {
              const isExpanded = expanded === seg.key;
              return (
                <div key={seg.id}>
                  <div
                    className={cn(
                      "flex flex-col gap-2 px-4 py-3 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4",
                      isExpanded ? "bg-indigo-50/40" : "hover:bg-indigo-50/30",
                    )}
                    onClick={() => setExpanded(isExpanded ? null : seg.key)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-slate-900">{seg.key}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{seg.name} &middot; Match {seg.match_type} &middot; {seg.rules?.length || 0} rules</p>
                      {seg.description && <p className="mt-0.5 text-xs text-slate-400">{seg.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {deleting === seg.key ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="destructive-ghost" onClick={() => handleDelete(seg.key)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeleting(seg.key); }}
                          title="Delete segment"
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 sm:px-6 animate-fade-in">
                      <SegmentRulesEditor
                        rules={seg.rules ?? []}
                        matchType={seg.match_type}
                        onSave={(rules, matchType) => handleSaveRules(seg.key, rules, matchType)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
