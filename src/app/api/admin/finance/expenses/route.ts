import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  listExpenseLimitRules,
  upsertExpenseLimitRule,
} from "@/lib/finance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const [categories, limitRules] = await Promise.all([
    listExpenseCategories(),
    listExpenseLimitRules(categoryId ? Number(categoryId) : undefined),
  ]);
  return NextResponse.json({ categories, limitRules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    type: "category" | "limit_rule";
    [key: string]: unknown;
  };

  if (body.type === "category") {
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }
    const category = await createExpenseCategory(body as unknown as Parameters<typeof createExpenseCategory>[0]);
    return NextResponse.json({ category }, { status: 201 });
  }

  if (body.type === "limit_rule") {
    if (!body.expenseCategoryId || !body.scopeType || !body.scopeId) {
      return NextResponse.json({ error: "expenseCategoryId, scopeType, scopeId required" }, { status: 400 });
    }
    const rule = await upsertExpenseLimitRule(body as unknown as Parameters<typeof upsertExpenseLimitRule>[0]);
    return NextResponse.json({ rule }, { status: 201 });
  }

  return NextResponse.json({ error: "type must be category or limit_rule" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...data } = body;
  const category = await updateExpenseCategory(id, data as Parameters<typeof updateExpenseCategory>[1]);
  return NextResponse.json({ category });
}
