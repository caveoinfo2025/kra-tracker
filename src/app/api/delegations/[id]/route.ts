import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { revokeDelegation } from "@/lib/workflow-engine";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await revokeDelegation(Number(id), session.user.employeeId!);
  if (!ok) return NextResponse.json({ error: "Failed to revoke" }, { status: 503 });
  return NextResponse.json({ success: true });
}
