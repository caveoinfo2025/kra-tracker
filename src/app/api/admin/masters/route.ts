import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import {
  listCategories, createCategory,
  listDefinitions, createDefinition, getDefinitionByCode,
  listValidationRules, createValidationRule,
  listMasterAudit,
} from "@/lib/master-data";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type             = searchParams.get("type") ?? "stats";
  const definitionId     = searchParams.get("definitionId");

  try {
    if (type === "categories") {
      const categories = await listCategories();
      return NextResponse.json({ categories });
    }

    if (type === "definitions") {
      const definitions = await listDefinitions({ status: "ACTIVE" });
      return NextResponse.json({ definitions });
    }

    if (type === "validation-rules") {
      if (!definitionId) return NextResponse.json({ rules: [] });
      const rules = await listValidationRules(Number(definitionId));
      return NextResponse.json({ rules });
    }

    if (type === "audit") {
      const audit = await listMasterAudit({ take: 200 });
      return NextResponse.json({ audit });
    }

    // Default: return aggregate stats
    const [categories, definitions] = await Promise.all([
      listCategories(),
      listDefinitions(),
    ]);
    return NextResponse.json({
      categories:  categories.length,
      definitions: definitions.length,
      values:      0,
      overrides:   0,
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = session.user.employeeId!;

  try {
    const body = await req.json() as Record<string, unknown>;
    const type = body.type as string | undefined;

    if (type === "category") {
      const cat = await createCategory({
        name:        body.name        as string,
        code:        body.code        as string,
        description: body.description as string | undefined,
      });
      if (!cat) return NextResponse.json({ error: "Failed to create category" }, { status: 503 });
      return NextResponse.json({ category: cat }, { status: 201 });
    }

    if (type === "definition") {
      const def = await createDefinition({
        categoryId:           body.categoryId           as number,
        name:                 body.name                 as string,
        code:                 body.code                 as string,
        description:          body.description          as string | undefined,
        allowCompanyOverride: body.allowCompanyOverride as boolean | undefined,
        allowBranchOverride:  body.allowBranchOverride  as boolean | undefined,
        requiresApproval:     body.requiresApproval     as boolean | undefined,
        actorId,
      });
      if (!def) return NextResponse.json({ error: "Failed to create definition" }, { status: 503 });
      return NextResponse.json({ definition: def }, { status: 201 });
    }

    if (type === "validation-rule") {
      const rule = await createValidationRule({
        masterDefinitionId: body.masterDefinitionId as number,
        ruleName:           body.ruleName           as string,
        policyId:           body.policyId           as number | undefined,
      });
      if (!rule) return NextResponse.json({ error: "Failed to create rule" }, { status: 503 });
      return NextResponse.json({ rule }, { status: 201 });
    }

    // Also support GET-by-code shorthand
    if (type === "definition-by-code") {
      const def = await getDefinitionByCode(body.code as string);
      return NextResponse.json({ definition: def });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
