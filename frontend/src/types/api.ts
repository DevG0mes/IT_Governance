import type { PermissionsMap } from './permissions';

export type SystemUser = {
  id: number;
  nome: string;
  email: string;
  cargo?: string | null;
  permissionsJSON?: unknown;
  permissions_json?: unknown;
  profile_id?: number | null;
  profileNome?: string | null;
  permissions?: Partial<PermissionsMap> | Record<string, unknown>;
};

export type AccessProfile = {
  id: number;
  nome: string;
  permissionsJSON: string;
  permissions?: Partial<PermissionsMap> | Record<string, unknown>;
};

