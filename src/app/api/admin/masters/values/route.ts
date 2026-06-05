import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import { listValues, createValue, updateValue } from "@/lib/master-data";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const definitionId     = searchParams.get("definitionId");

  if (!definitionId) return NextResponse.json({ values: [] });

  try {
    const values = await listValues(Number(definitionId));
    return NextResponse.json({ values });
  } catch {
    return NextResponse.json({ values: [] });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = session.user.employeeId!;

  try {
    const body = await req.json() as Record<string, unknown>;

    // PATCH-style update via POST with id + _method
    if (body.id && body._method === "PATCH") {
      const ok = await updateValue(
        body.id as number,
        {
          value:        body.value        as string  | undefined,
          description:  body.description  as string  | undefined,
          metadataJson: body.metadataJson as string  | undefined,
          sortOrder:    body.sortOrder    as number  | undefined,
          status:       body.status       as string  | undefined,
        },
        actorId,
      );
      if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 503 });
      return NextResponse.json({ ok: true });
    }

    const value = await createValue({
      masterDefinitionId: body.masterDefinitionId as number,
      value:              body.value              as string,
      code:               body.code               as string,
      description:        body.description        as string | undefined,
      metadataJson:       body.metadataJson        as string | undefined,
      sortOrder:          body.sortOrder           as number | undefined,
      parentId:           body.parentId            as number | undefined,
      actorId,
    });

    if (!value) return NextResponse.json({ error: "Failed to create value" }, { status: 503 });
    return NextResponse.json({ value }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
