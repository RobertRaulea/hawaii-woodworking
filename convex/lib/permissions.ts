// Pure role/permission model shared by backend guards and the frontend.
// Do not import from convex/server or _generated here.

export const STAFF_ROLES = ['admin', 'seller', 'atelier'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = {
  'pos.sell': ['admin', 'seller'],
  'inventory.read': ['admin', 'seller', 'atelier'],
  'inventory.readAll': ['admin', 'atelier'],
  'inventory.transfer': ['admin', 'atelier'],
  'inventory.reconcile': ['admin', 'atelier'],
  'inventory.adjust': ['admin', 'atelier'],
  'products.posOptions': ['admin', 'atelier'],
  'transfers.view': ['admin', 'atelier', 'seller'],
  'transfers.request': ['admin', 'seller'],
  'transfers.execute': ['admin', 'atelier'],
  'orders.fulfill': ['admin', 'atelier'],
  'orders.manage': ['admin'],
  'fairs.manage': ['admin'],
  'catalog.manage': ['admin'],
  'customers.manage': ['admin'],
  'staff.manage': ['admin'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const parseRole = (value: unknown): StaffRole | null =>
  typeof value === 'string' &&
  (STAFF_ROLES as readonly string[]).includes(value)
    ? (value as StaffRole)
    : null;

export const hasPermission = (
  role: StaffRole | null,
  permission: Permission,
): boolean =>
  role !== null &&
  (PERMISSIONS[permission] as readonly StaffRole[]).includes(role);

export const permissionsFor = (role: StaffRole | null): Permission[] =>
  role === null
    ? []
    : (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
        hasPermission(role, permission),
      );

export const HOME_PATH: Record<StaffRole, string> = {
  admin: '/admin/products',
  seller: '/admin/pos',
  atelier: '/admin/inventory',
};
