'use client';

import { useProvisionStatus, ProvisionEvent, ProvisionStatus } from '@/hooks/use-provision-status';

interface ProvisionTimelineProps {
  cellId: string;
}

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  provisioning_started: { label: 'Creating cell record...', icon: '🔄' },
  enqueued: { label: 'Enqueuing provision task...', icon: '📋' },
  bootstrap_started: { label: 'Provisioning Hetzner server...', icon: '🖥️' },
  bootstrap_ssh_ready: { label: 'Waiting for SSH...', icon: '🔗' },
  bootstrap_completed: { label: 'Bootstrapping k3s...', icon: '⚙️' },
  provisioning_completed: { label: 'Deploying FeatureSignals stack...', icon: '📦' },
  provisioning_failed: { label: 'Provisioning complete!', icon: '✅' },
  bootstrap_failed: { label: 'Provisioning failed', icon: '❌' },
};

function getEventDisplay(eventType: string): { label: string; icon: string } {
  return EVENT_LABELS[eventType] || { label: eventType.replace(/_/g, ' '), icon: '•' };
}

export function ProvisionTimeline({ cellId }: ProvisionTimelineProps) {
  const { events, status, error } = useProvisionStatus(cellId);

  if (events.length === 0 && status === 'idle') {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-medium text-gray-700">Provision Progress</h4>

      <div className="space-y-2">
        {events.map((event, idx) => {
          const display = getEventDisplay(event.event_type);
          const isLast = idx === events.length - 1;
          return (
            <div key={event.id} className="flex items-start gap-2">
              <span className="mt-0.5 text-sm">
                {isLast && (status === 'streaming' || status === 'connecting') ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                ) : (
                  display.icon
                )}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{display.label}</p>
                {event.metadata?.public_ip && (
                  <p className="text-xs text-gray-500">IP: {event.metadata.public_ip}</p>
                )}
                {event.metadata?.server_id && (
                  <p className="text-xs text-gray-500">Server: {event.metadata.server_id}</p>
                )}
                {event.metadata?.error && (
                  <p className="text-xs text-red-500">Error: {event.metadata.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-amber-600">{error}</p>
      )}

      {status === 'completed' && (
        <p className="mt-2 text-xs text-green-600">✅ Cell is ready and running!</p>
      )}

      {status === 'failed' && (
        <p className="mt-2 text-xs text-red-600">Provisioning failed. Check logs for details.</p>
      )}
    </div>
  );
}
