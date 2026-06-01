/**
 * POST /api/ocr/business-card
 * Body: { image: "<base64 image, no data: prefix>" }
 *
 * Runs Google Cloud Vision TEXT_DETECTION on a business-card photo and returns
 * structured lead fields for the mobile review form. Requires GOOGLE_VISION_API_KEY.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { parseBusinessCard } from "@/lib/card-parser";

export const maxDuration = 30;

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR is not configured. Set GOOGLE_VISION_API_KEY on the server." },
      { status: 503 }
    );
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Strip a possible "data:image/...;base64," prefix
  const image = (body.image ?? "").replace(/^data:image\/[a-z]+;base64,/i, "");
  if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  // Guard against very large payloads (~8MB of base64 ≈ 6MB image)
  if (image.length > 8_000_000) {
    return NextResponse.json({ error: "Image too large (max ~6MB)" }, { status: 413 });
  }

  let visionRes: Response;
  try {
    visionRes = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: image },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            imageContext: { languageHints: ["en"] },
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the OCR service" }, { status: 502 });
  }

  if (!visionRes.ok) {
    const detail = await visionRes.text().catch(() => "");
    console.error("Vision API error", visionRes.status, detail.slice(0, 300));
    return NextResponse.json({ error: "OCR service returned an error" }, { status: 502 });
  }

  const data = await visionRes.json();
  const rawText: string =
    data?.responses?.[0]?.fullTextAnnotation?.text ??
    data?.responses?.[0]?.textAnnotations?.[0]?.description ??
    "";

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "No text found on the card. Try a clearer photo.", fields: null },
      { status: 200 }
    );
  }

  const fields = parseBusinessCard(rawText);
  return NextResponse.json({ fields });
}
