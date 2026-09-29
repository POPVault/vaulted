import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getDocument, resolveDocumentPath } from "@/data/documents";
import { findCurrentOffering } from "@/data/offerings";
import { getInvestorOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

function json(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * Streams a gated offering document. Layouts do not run for route handlers,
 * so authorization happens here. The file is resolved only from the stored
 * filePath of a document belonging to the investor's offering.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const offering = await findCurrentOffering();
  if (!offering) return json(401, "unauthorized");
  const investor = await getInvestorOrNull(offering.id);
  if (!investor) return json(401, "unauthorized");

  const { id } = await params;
  if (!/^[1-9][0-9]{0,9}$/.test(id)) return json(404, "not_found");
  const doc = await getDocument(Number(id), offering.id);
  if (!doc) return json(404, "not_found");

  const filePath = resolveDocumentPath(doc.filePath);
  if (!filePath) return json(404, "not_found");
  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return json(404, "not_found");
    size = info.size;
  } catch {
    return json(404, "not_found");
  }

  const filename = path.basename(filePath).replace(/[^A-Za-z0-9._-]/g, "_");
  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
