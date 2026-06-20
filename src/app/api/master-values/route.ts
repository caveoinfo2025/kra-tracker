import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getMasterValues } from "@/lib/master-data";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  const values = await getMasterValues({ masterCode: code });
  return NextResponse.json(values.map((v) => v.value));
}
