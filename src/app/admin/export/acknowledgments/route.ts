import { exportAcknowledgmentRows, type AcknowledgmentExportRow } from "@/data/admin";
import { findCurrentOffering } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { ADMIN_LIMIT, ADMIN_WINDOW_MINUTES, getAdminOrNull } from "@/lib/admin-session";
import { csvResponse, toCsv, unauthorized } from "@/lib/csv";
import { clientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

const COLUMNS: (keyof AcknowledgmentExportRow)[] = [
  "acknowledgment_id",
  "investor_id",
  "name",
  "email",
  "acknowledged_at",
  "ip",
  "documents_hash",
  "documents_json",
];

export async function GET(request: Request) {
  if (!(await getAdminOrNull())) return unauthorized();
  const limit = await consume(`admin:${clientIp(request.headers)}`, ADMIN_LIMIT, ADMIN_WINDOW_MINUTES);
  if (!limit.allowed) {
    return new Response("Too many requests", { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const offering = await findCurrentOffering();
  if (!offering) return new Response("No offering", { status: 404 });

  const rows = await exportAcknowledgmentRows(offering.id);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`${offering.code}-acknowledgments-${date}.csv`, toCsv(COLUMNS, rows));
}
