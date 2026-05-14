"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import type { ABMBehavior } from "@/lib/abm-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { label: string; variant: "success" | "default" | "warning" | "danger" }
  > = {
    active: { label: "LIVE", variant: "success" },
    draft: { label: "Draft", variant: "default" },
    paused: { label: "Paused", variant: "warning" },
    retired: { label: "Retired", variant: "default" },
  };
  const v = variants[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function BehaviorDetailPage() {
  const params = useParams<{ behaviorKey: string }>();
  const router = useRouter();
  const behaviorKey = params.behaviorKey;

  const [behavior, setBehavior] = useState<ABMBehavior | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentType, setAgentType] = useState("");
  const [status, setStatus] = useState("draft");
  const [rolloutPercentage, setRolloutPercentage] = useState(100);

  const fetchBehavior = useCallback(async () => {
    if (!behaviorKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<ABMBehavior>(
        `/v1/abm/behaviors/${behaviorKey}`,
      );
      setBehavior(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setAgentType(data.agent_type ?? "");
      setStatus(data.status);
      setRolloutPercentage(data.rollout_percentage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load behavior");
    } finally {
      setIsLoading(false);
    }
  }, [behaviorKey]);

  useEffect(() => {
    fetchBehavior();
  }, [fetchBehavior]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updated = await apiPatch<ABMBehavior>(
        `/v1/abm/behaviors/${behaviorKey}`,
        {
          name,
          description,
          agent_type: agentType,
          status,
          rollout_percentage: rolloutPercentage,
        },
      );
      setBehavior(updated);
      setSaveMessage("Behavior updated successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to update behavior",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this behavior? This action cannot be undone.")) return;
    try {
      await apiDelete(`/v1/abm/behaviors/${behaviorKey}`);
      router.push("/abm");
    } catch {
      setSaveMessage("Failed to delete behavior.");
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────
  if (!behavior && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">Behavior Not Found</h2>
        <p className="text-muted-foreground mb-4">
          This agent behavior may have been deleted or moved.
        </p>
        <Link href="/abm">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Behaviors
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchBehavior} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  if (!behavior) return null;

  // ─── Detail View ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/abm">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{behavior.name}</h1>
          <p className="text-muted-foreground">
            Behavior key: <code className="text-sm">{behavior.key}</code>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Manage this behavior&apos;s settings, variants, and targeting rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Behavior name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this behavior control?"
              rows={3}
            />
          </div>

          {/* Agent Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentType">Agent Type</Label>
              <Input
                id="agentType"
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
                placeholder="e.g., recommender, search"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "LIVE" },
                  { value: "paused", label: "Paused" },
                  { value: "retired", label: "Retired" },
                ]}
                placeholder="Select status"
              />
            </div>
          </div>

          {/* Rollout Percentage */}
          <div className="space-y-2">
            <Label htmlFor="rolloutPercentage">
              Rollout Percentage: {rolloutPercentage}%
            </Label>
            <Input
              id="rolloutPercentage"
              type="number"
              value={rolloutPercentage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v))
                  setRolloutPercentage(Math.max(0, Math.min(100, v)));
              }}
              min={0}
              max={100}
              className="w-24"
            />
          </div>

          {/* Variants Summary */}
          {behavior.variants && behavior.variants.length > 0 && (
            <div className="space-y-2">
              <Label>Variants</Label>
              <div className="grid grid-cols-2 gap-2">
                {behavior.variants.map((v) => (
                  <div key={v.key} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">
                      {v.name}
                      {v.key === behavior.default_variant && (
                        <Badge variant="default" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      Key: <code>{v.key}</code> · Weight: {v.weight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Targeting Rules Summary */}
          {behavior.targeting_rules && behavior.targeting_rules.length > 0 && (
            <div className="space-y-2">
              <Label>Targeting Rules</Label>
              <div className="space-y-1">
                {behavior.targeting_rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <Badge variant="default">P{rule.priority}</Badge>
                    <span>{rule.name}</span>
                    <span className="text-muted-foreground">
                      → {rule.variant}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="danger" onClick={handleDelete} size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Behavior
            </Button>
            <div className="flex items-center gap-2">
              {saveMessage && (
                <span
                  className={`text-sm ${saveMessage.includes("success") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                >
                  {saveMessage}
                </span>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>Created: {new Date(behavior.created_at).toLocaleString()}</div>
          <div>Updated: {new Date(behavior.updated_at).toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
