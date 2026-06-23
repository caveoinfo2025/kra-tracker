import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { updateKRATemplateItem } from "@/lib/performance-engine";

// Re-links (or otherwise edits) a single KRATemplateItem without touching
// any sibling item — updateKRATemplate() on the parent template route
// deletes and recreates the whole item set, which is unsafe when only one
// item needs to change.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const item = await updateKRATemplateItem(Number(id), input);
  return NextResponse.json(item);
}
