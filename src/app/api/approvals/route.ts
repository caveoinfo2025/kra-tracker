import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listApprovalRequests, getPendingForApprover } from "@/lib/workflow-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const inbox = searchParams.get("inbox") === "true";

  if (inbox) {
    const requests = await getPendingForApprover(session.user.employeeId!);
    return NextResponse.json({ requests });
  }

  const requests = await listApprovalRequests({
    requestedBy: searchParams.get("requestedBy") ? Number(searchParams.get("requestedBy")) : undefined,
    approverId:  searchParams.get("approverId")  ? Number(searchParams.get("approverId"))  : undefined,
    status:      searchParams.get("status")      ?? undefined,
    entityType:  searchParams.get("entityType")  ?? undefined,
    take:        searchParams.get("take")         ? Number(searchParams.get("take"))        : undefined,
  });
  return NextResponse.json({ requests });
}
