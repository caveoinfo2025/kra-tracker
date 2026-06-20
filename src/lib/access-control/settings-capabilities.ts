/**
 * Settings capabilities helper — Step 2K.
 *
 * Computes which Settings landing-page cards a session should see, derived
 * from access-control's actual (module, resource, action) grants rather than
 * the legacy canAccessSettings()/isManager predicates in roles.ts.
 *
 * Loads all of a user's permissions ONCE per request (a single DB round-trip
 * via getAllPermissions()) rather than calling hasPermission() once per card.
 *
 * Manager fallback: isManager employees see every card, matching
 * hasPermission()'s own backward-compatible manager bypass (index.ts:42) and
 * getNavigationCapabilities()'s ALL_TRUE shortcut (navigation.ts:74).
 *
 * This is UX-only — it controls what's SHOWN on /settings, not what's
 * ALLOWED. Each Settings subpage keeps its own server-side guard as the real
 * security boundary (see docs/RBAC_MIGRATION_TRACKER.md §2K for the subpages
 * still gated only by isManager/canAccessSettings).
 *
 * CRM gap: no Settings/CRM/* permission exists in the catalogue yet (same
 * documented gap as navigation.ts's canViewCRMSettings). The CRM card falls
 * back to isManager, mirroring the actual guard on /settings/crm.
 */
import type { Session } from "next-auth";
import { getAllPermissions } from "./index";

export interface SettingsCardCapabilities {
  organization: boolean;
  identity:     boolean;
  masters:      boolean;
  finance:      boolean;
  crm:          boolean;
  workflow:     boolean;
  policy:       boolean;
  communication: boolean;
  integration:  boolean;
  security:     boolean;
  performance:  boolean;
}

export interface SettingsCapabilities {
  canViewSettings: boolean;
  cards: SettingsCardCapabilities;
}

const ALL_TRUE_CARDS: SettingsCardCapabilities = {
  organization: true, identity: true, masters: true, finance: true, crm: true,
  workflow: true, policy: true, communication: true, integration: true,
  security: true, performance: true,
};

const ALL_FALSE_CARDS: SettingsCardCapabilities = {
  organization: false, identity: false, masters: false, finance: false, crm: false,
  workflow: false, policy: false, communication: false, integration: false,
  security: false, performance: false,
};

export async function getSettingsCapabilities(
  session: Session | null | undefined,
): Promise<SettingsCapabilities> {
  if (!session?.user) return { canViewSettings: false, cards: ALL_FALSE_CARDS };
  if (session.user.isManager) return { canViewSettings: true, cards: ALL_TRUE_CARDS };

  const userId = (session.user as { employeeId?: number }).employeeId;
  if (!userId) return { canViewSettings: false, cards: ALL_FALSE_CARDS };

  const perms = await getAllPermissions(userId);
  const has = (module: string, resource: string, action: string) =>
    perms.some((p) => p.module === module && p.resource === resource && p.action === action);

  const organization  = has("Settings", "Organization", "VIEW") || has("Settings", "Organization", "EDIT");
  const identity       = has("Settings", "Identity", "VIEW") || has("Settings", "Identity", "EDIT");
  const masters         = has("Settings", "Masters", "VIEW") || has("Settings", "Masters", "EDIT");
  const finance          = has("Settings", "Finance", "VIEW") || has("Settings", "Finance", "EDIT");
  const workflow          = has("Settings", "Workflow", "VIEW") || has("Settings", "Workflow", "EDIT");
  const policy             = has("Settings", "Policy", "VIEW") || has("Settings", "Policy", "EDIT");
  const communication       = has("Settings", "CommunicationAdmin", "VIEW") || has("Settings", "CommunicationAdmin", "EDIT");
  const integration          = has("Settings", "IntegrationAdmin", "VIEW") || has("Settings", "IntegrationAdmin", "EDIT");
  const security               = has("Settings", "SecurityAdmin", "VIEW") || has("Settings", "SecurityAdmin", "EDIT");
  const performance              = has("Settings", "Performance", "VIEW") || has("Settings", "Performance", "EDIT");
  // Settings/CRM does not exist in the catalogue yet (documented gap, same as
  // navigation.ts's canViewCRMSettings) — /settings/crm itself only checks
  // isManager, so mirror that here instead of inventing a permission name.
  const crm = false;

  const cards: SettingsCardCapabilities = {
    organization, identity, masters, finance, crm,
    workflow, policy, communication, integration, security, performance,
  };

  const canViewSettings = Object.values(cards).some(Boolean);

  return { canViewSettings, cards };
}
