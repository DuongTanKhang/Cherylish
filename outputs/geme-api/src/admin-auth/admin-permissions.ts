import { Injectable, SetMetadata } from "@nestjs/common";
import type { AdminIdentity } from "./admin-auth.service.js";

export const ADMIN_PERMISSION_KEY = "geme.admin.permissions";
export const ADMIN_PERMISSION_CATALOG = [
  "dashboard.read", "orders.read", "orders.write", "customers.read", "customers.write",
  "inventory.read", "inventory.write", "returns.read", "returns.manage", "finance.read", "finance.manage",
  "audit.read", "settings.manage", "social.read", "social.draft", "social.approve", "social.publish", "social.connect",
  "calendar.read", "calendar.manage", "marketing.read", "marketing.manage",
] as const;

// Route-level metadata is retained for the GEME controllers. AdminAuthGuard in
// this project enforces the signed admin identity and rejects CONTENT_EDITOR.
export const RequireAdminPermissions = (...permissions: string[]) => SetMetadata(ADMIN_PERMISSION_KEY, permissions);

@Injectable()
export class AdminPermissionService {
  async getEffectivePermissions(identity: AdminIdentity): Promise<string[]> {
    return identity.role === "SUPER_ADMIN" || identity.role === "ADMIN" ? [...ADMIN_PERMISSION_CATALOG] : [];
  }
}
