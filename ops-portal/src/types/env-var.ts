export interface EnvVar {
  id: string;
  key: string;
  value: string;
  value_hash: string;
  is_secret: boolean;
  scope: "global" | "region" | "cell" | "tenant";
  scope_id: string;
  source?: string; // "from global", "overridden by cell", etc.
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface EnvVarInput {
  key: string;
  value: string;
}

export interface EnvVarListResponse {
  env_vars: EnvVar[];
  total: number;
}

export interface EnvVarEffectiveResponse {
  env_vars: EnvVar[];
  tenant_id: string;
  total: number;
}

export interface EnvVarUpsertRequest {
  scope: string;
  scope_id: string;
  env_vars: EnvVarInput[];
}

export interface EnvVarUpsertResponse {
  status: string;
  scope: string;
  scope_id: string;
  count: number;
}

export interface RevealResponse {
  access_token: string;
  expires_in: number;
  scope: string;
}
