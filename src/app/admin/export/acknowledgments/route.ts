import { exportAcknowledgmentRows, type AcknowledgmentExportRow } from "@/data/admin";
import { findCurrentOffering } from "@/data/offerings";
import { getAdminOrNull } from "@/lib/admin-session";
import { csvResponse, toCsv, unauthorized } from "@/lib/csv";

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

export async function GET() {
  if (!(await getAdminOrNull())) return unauthorized();
  const offering = await findCurrentOffering();
  if (!offering) return new Response("No offering", { status: 404 });

  const rows = await exportAcknowledgmentRows(offering.id);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`${offering.code}-acknowledgments-${date}.csv`, toCsv(COLUMNS, rows));
}
