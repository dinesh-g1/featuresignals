export interface EnvVar {
  key: string;
  value: string;
  source: 'global' | 'cloud' | 'region' | 'cell' | 'tenant';
  sourceLabel: string;
  overridable: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface EnvVarOverride {
  key: string;
  value: string;
}

export interface EnvVarList {
  envVars: EnvVar[];
  effective: boolean;
  cellId: string;
}

export interface EnvVarUpdateRequest {
  overrides: EnvVarOverride[];
}

export interface EnvVarUpdateResponse {
  updated: number;
  envVars: EnvVar[];
}
