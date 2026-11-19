export const SUPER_ADMIN_PERMISSIONS = [
  "dashboard.read",
  "returns.read", "finance.read", "audit.read", "calendar.read", "calendar.manage",
  "marketing.read", "marketing.manage", "access.manage",
  "orders.read", "orders.write", "shipping.read", "shipping.manage",
  "customers.read", "customers.write", "catalog.read", "catalog.write",
  "catalog.content.write", "catalog.price.write", "catalog.publish", "catalog.delete",
  "promotions.read", "promotions.write", "content.read", "content.write",
  "social.read", "social.draft", "social.approve", "social.publish", "social.connect", "social.manage",
  "integrations.read", "integrations.manage", "inventory.read", "inventory.write",
  "settings.manage", "contacts.read", "contacts.manage",
] as const;

export function resolveAdminPermissions(identity: unknown): string[] {
  if (!identity || typeof identity !== "object") return [];
  const candidate = identity as { permissions?: unknown; role?: unknown };
  if (Array.isArray(candidate.permissions)) {
    return candidate.permissions.filter((value): value is string => typeof value === "string");
  }
  if (candidate.role === "SUPER_ADMIN") return [...SUPER_ADMIN_PERMISSIONS];
  if (candidate.role === "ADMIN") return SUPER_ADMIN_PERMISSIONS.filter((permission) => permission !== "access.manage");
  return [];
}
