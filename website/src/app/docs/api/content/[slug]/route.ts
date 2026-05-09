import { NextRequest, NextResponse } from "next/server";
import { getDocContent } from "@/lib/docs";

/**
 * GET /docs/api/content/{slug}?section=heading-id
 *
 * Returns rendered documentation content as JSON for use by
 * FlagEngine's contextual DocsPanel.
 *
 * Response shape:
 *   { title, description, content (HTML), toc, contentHash }
 *
 * Caching: public, CDN-friendly. Content is immutable until the
 * next deployment — set long max-age with s-maxage override.
 *
 * Note: This route requires a server runtime (not static export).
 * The website's next.config.ts must NOT set `output: "export"`
 * for this endpoint to function at runtime.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const section = request.nextUrl.searchParams.get("section") ?? undefined;

  try {
    const doc = await getDocContent(slug, section);

    return NextResponse.json(doc, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ETag: doc.contentHash,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests from FlagEngine.
 * FlagEngine runs on a different port during development,
 * so we need to allow cross-origin requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
