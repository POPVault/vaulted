import { exportInvestorsRows } from "@/data/admin";
import { findCurrentOffering } from "@/data/offerings";
import { getAdminOrNull } from "@/lib/admin-session";
import { csvResponse, toCsv, unauthorized } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Matches the keys of exportInvestorsRows, so an empty export still has a header. */
const COLUMNS = [
  "investor_id",
  "name",
  "email",
  "relationship_note",
  "code",
  "invited_at",
  "revoked_at",
  "last_viewed_at",
  "acknowledged_at",
  "acknowledged_hash",
  "acknowledgment_current",
  "interest_units",
  "interest_note",
  "q_name",
  "q_email",
  "q_phone",
  "q_address1",
  "q_address2",
  "q_city",
  "q_state",
  "q_postal_code",
  "q_investor_status",
  "q_status_basis",
  "q_relationship_confirmed",
  "q_bad_actor_confirmed",
  "q_signature_name",
  "q_signature_date",
  "q_submitted_at",
  "q_ip",
  "sub_units",
  "sub_amount_cents",
  "sub_wire_reference",
  "sub_status",
  "sub_created_at",
  "sub_accepted_at",
  "sub_signed_at",
  "sub_funded_at",
  "sub_cancelled_at",
  "sub_ip",
];

export async function GET() {
  if (!(await getAdminOrNull())) return unauthorized();
  const offering = await findCurrentOffering();
  if (!offering) return new Response("No offering", { status: 404 });

  const rows = await exportInvestorsRows(offering.id);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`${offering.code}-investors-${date}.csv`, toCsv(COLUMNS, rows));
}
