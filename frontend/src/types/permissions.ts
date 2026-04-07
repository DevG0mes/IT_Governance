export type PermissionLevel = 'none' | 'read' | 'edit';

export type ModuleId =
  | 'dashboard'
  | 'inventory'
  | 'employees'
  | 'contracts'
  | 'catalog'
  | 'licenses'
  | 'maintenance'
  | 'offboarding'
  | 'import'
  | 'export'
  | 'admin'
  | 'settings';

export type PermissionsMap = Record<ModuleId, PermissionLevel>;

