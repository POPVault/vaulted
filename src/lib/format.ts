/** Shown wherever a value is still open (CONTEXT.md: never invent numbers). */
export function tbd(): string {
  return "TBD";
}

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Cents to "$1,234", or "$1,234.50" when there are cents. Null is TBD. */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return tbd();
  const rounded = Math.round(cents);
  return rounded % 100 === 0
    ? wholeDollars.format(rounded / 100)
    : dollarsAndCents.format(rounded / 100);
}

/** Units to "1,234". Null is TBD. */
export function formatUnits(units: number | null | undefined): string {
  if (units === null || units === undefined || !Number.isFinite(units)) return tbd();
  return integer.format(units);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "29 Sep 2026". Accepts an ISO date ("2026-09-29"), an ISO timestamp or a
 * Date. Date-only strings are read as calendar dates, not shifted by time zone.
 * Null or unparseable input is TBD.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return tbd();
  const date = typeof value === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value) : value;
  if (Number.isNaN(date.getTime())) return tbd();
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
