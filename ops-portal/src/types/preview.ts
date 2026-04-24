/**
 * Preview Environment Types
 *
 * Represents demo/preview environments provisioned for customers.
 * Previews auto-delete after their TTL expires.
 */

/** Preview environment status */
export type PreviewStatus = 'active' | 'expiring' | 'expired' | 'deleting';

/** Preview environment source type */
export type PreviewSource = 'sandbox' | 'demo' | 'pr' | 'manual';

/** Preview environment */
export interface Preview {
  /** Unique identifier */
  id: string;

  /** Human-readable name (e.g., "pr-142", "demo-acme") */
  name: string;

  /** Source/trigger of this preview */
  source: PreviewSource;

  /** Git PR number, tag, or branch reference */
  ref: string;

  /** ID of the user who created this preview */
  ownerId: string;

  /** Name of the user who created this preview */
  ownerName: string;

  /** ID of the tenant this preview is for (if applicable) */
  tenantId: string | null;

  /** Name of the tenant this preview is for */
  tenantName: string | null;

  /** Current status */
  status: PreviewStatus;

  /** ISO 8601 timestamp of creation */
  createdAt: string;

  /** TTL duration in seconds */
  ttlSeconds: number;

  /** ISO 8601 timestamp when this preview expires */
  expiresAt: string;

  /** Whether sample data was included */
  includeSampleData: boolean;

  /** URL to access this preview */
  previewUrl: string | null;
}

/** Preview creation request */
export interface CreatePreviewRequest {
  /** Git tag, branch, or PR number */
  ref: string;

  /** Tenant slug or ID to associate this preview with */
  tenantId?: string;

  /** TTL in seconds (defaults to 7 days = 604800) */
  ttlSeconds?: number;

  /** Whether to include sample data */
  includeSampleData?: boolean;

  /** Optional display name (auto-generated if not provided) */
  name?: string;
}

/** Preview list response with pagination */
export interface PreviewList {
  /** Active previews */
  data: Preview[];

  /** Total number of previews (across all pages) */
  total: number;

  /** Maximum concurrent previews allowed */
  maxPreviews: number;
}

/** Preview TTL update request */
export interface UpdatePreviewTTLRequest {
  /** New TTL in seconds */
  ttlSeconds: number;
}

/** Preview deletion response */
export interface DeletePreviewResponse {
  /** Whether the deletion was initiated successfully */
  success: boolean;

  /** Expected time until fully cleaned up */
  estimatedCleanupSeconds: number;
}
