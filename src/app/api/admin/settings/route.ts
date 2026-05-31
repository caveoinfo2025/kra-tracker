/**
 * GET  /api/admin/settings        — all settings (merged with defaults)
 * POST /api/admin/settings        — bulk upsert { updates: Record<string, unknown> }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getAllSettings, setSetting, SETTING_META } from "@/lib/settings";

async function requireManager() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  if (!session.user.isManager) return { error: "Forbidden — manager only", status: 403 };
  return { session };
}

export async function GET() {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const values = await getAllSettings();

  // Return settings enriched with metadata
  const settings = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    ...(SETTING_META[key] ?? { category: "misc", label: key, description: "" }),
  }));

  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json();
  const updates: Record<string, unknown> = body.updates ?? {};
  const employeeId = check.session!.user.employeeId;

  const results: { key: string; ok: boolean; error?: string }[] = [];

  for (const [key, value] of Object.entries(updates)) {
    try {
      await setSetting(key, value, employeeId);
      results.push({ key, ok: true });
    } catch (e) {
      results.push({ key, ok: false, error: String(e) });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ results }, { status: allOk ? 200 : 207 });
}
