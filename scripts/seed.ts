// pnpm seed [--with-demo-investor] [--placeholder-docs] [--images <dir>]
//
// Loads the offering from ../vaulted-landing/functions/invest/_content and
// makes the database match it. Every image the items reference is copied from
// ../vaulted-landing/invest/images (or --images <dir>) into
// public/offerings/<code>/; the seed fails if one is found in neither place. Re-runnable: the offering is upserted by code
// (phase is preserved) and its items, comps, documents and updates are
// replaced. Investor records are never touched.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadEnvLocal } from "./lib/env";

loadEnvLocal();

const argv = process.argv.slice(2);
const args = new Set(argv);
const WITH_DEMO_INVESTOR = args.has("--with-demo-investor");
const PLACEHOLDER_DOCS = args.has("--placeholder-docs");

/** The value of `--name <value>` or `--name=<value>`, or null when absent. */
function option(name: string): string | null {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} needs a folder, for example ${name} ./images`);
      return value;
    }
    if (argv[i].startsWith(`${name}=`)) return argv[i].slice(name.length + 1);
  }
  return null;
}

const LANDING = path.resolve(process.cwd(), "..", "vaulted-landing");
const CONTENT_DIR = path.join(LANDING, "functions", "invest", "_content");
const IMAGES_OPTION = option("--images");
const IMAGES_DIR = IMAGES_OPTION
  ? path.resolve(process.cwd(), IMAGES_OPTION)
  : path.join(LANDING, "invest", "images");
const IMAGE_EXTENSIONS = new Set([".svg", ".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const DEMO_EMAIL = "demo@example.com";
const APP_URL = "http://localhost:3000";

const nullableString = z.string().nullable().optional();

const OfferingJson = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  overview: z.array(z.string()),
  how_it_works: z.array(z.object({ title: z.string(), text: z.string() })),
  stats: z.object({
    price_per_unit_usd: z.number().positive(),
    close_date: nullableString,
  }),
  key_terms: z.array(z.object({ label: z.string(), value: z.string() })),
  how_you_get_paid: z
    .object({ intro: z.string(), example_steps: z.array(z.string()) })
    .nullable()
    .optional(),
  items: z.array(
    z.object({
      number: z.number().int(),
      title: z.string(),
      photographer: z.string().default(""),
      year: z.string().default(""),
      description: z.string().default(""),
      estimate: z.string().default(""),
      image: z.string().min(1),
      caption: z.string().default(""),
    }),
  ),
  provenance: z.string().default(""),
  custody: z.string().default(""),
  comps: z.array(
    z.object({
      description: z.string(),
      price: z.string().default(""),
      source: z.string().default(""),
      date: z.string().default(""),
    }),
  ),
  key_risks: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  contact_email: z.string().default(""),
  documents: z.array(
    z.object({
      title: z.string(),
      path: z.string().min(1),
      version: z.string(),
      date: z.string(),
    }),
  ),
  esign_url: nullableString,
  wire: z
    .object({
      bank_name: z.string(),
      account_name: z.string(),
      account_number: z.string(),
      routing_number: z.string(),
      instructions: z.string(),
    })
    .nullable()
    .optional(),
  legal_line: z.string().default(""),
  legend: z.string().default(""),
});

const UpdatesJson = z.array(
  z.object({ date: z.string(), title: z.string(), body: z.string() }),
);

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** A key term value as a whole number, or null when it is not one ("TBD"). */
function keyTermNumber(
  terms: { label: string; value: string }[],
  label: string,
): number | null {
  const term = terms.find((t) => t.label.trim().toLowerCase() === label.toLowerCase());
  if (!term) return null;
  const value = term.value.trim();
  if (!/^\d{1,3}(,\d{3})*$|^\d+$/.test(value)) return null;
  return Number(value.replace(/,/g, ""));
}

/** An ISO date (YYYY-MM-DD), or null for TBD, blank or anything else. */
function isoDateOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * Copies every image the items reference from IMAGES_DIR into
 * public/offerings/<code>/. A file missing from IMAGES_DIR is fine when it is
 * already in the target folder. Throws, listing every problem, when an image
 * has an unsupported extension or is found in neither place.
 */
function copyImages(
  code: string,
  imageNames: string[],
): { copied: number; kept: number; target: string } {
  const target = path.resolve(process.cwd(), "public", "offerings", code.toLowerCase());
  const names = [...new Set(imageNames)];
  const unsupported = names.filter((n) => !IMAGE_EXTENSIONS.has(path.extname(n).toLowerCase()));
  if (unsupported.length) {
    throw new Error(
      `Unsupported image type for: ${unsupported.join(", ")}. Use one of ${[...IMAGE_EXTENSIONS].join(", ")}.`,
    );
  }
  const missing = names.filter((n) => !isFile(path.join(IMAGES_DIR, n)) && !isFile(path.join(target, n)));
  if (missing.length) {
    throw new Error(
      `Missing ${missing.length === 1 ? "image" : "images"} referenced by offering items:\n` +
        missing.map((n) => `  ${n}`).join("\n") +
        `\nNot found in ${IMAGES_DIR}${existsSync(IMAGES_DIR) ? "" : " (folder does not exist)"}` +
        ` or in ${target}.\nAdd the files there, or pass --images <dir> with the folder that has them.`,
    );
  }
  mkdirSync(target, { recursive: true });
  let copied = 0;
  for (const name of names) {
    const from = path.join(IMAGES_DIR, name);
    if (!isFile(from)) continue;
    copyFileSync(from, path.join(target, name));
    copied++;
  }
  return { copied, kept: names.length - copied, target };
}

/** PDF literal string escaping. */
function pdfText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
}

/** A minimal valid one-page PDF showing a few lines of Helvetica text. */
function placeholderPdf(lines: string[]): Buffer {
  const text = lines
    .map((line, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 72 ${720 - i * 28} Td (${pdfText(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function main() {
  // Dynamic imports so .env.local (DATABASE_PATH) is loaded before the
  // database client opens its file.
  const { client, db } = await import("@/db/client");
  try {
    const { eq } = await import("drizzle-orm");
    const schema = await import("@/db/schema");
    const { runMigrations } = await import("@/db/migrate");
    const { writeTransaction } = await import("@/data/executor");
    const { PLACEHOLDER_MARKER, documentsRoot, resolveDocumentPath } = await import("@/data/documents");
    const { createInvestor } = await import("@/data/investors");
    const { grantOfferingAccess } = await import("@/data/investorOfferings");
    const { syncAndReport } = await import("./lib/docs");
    const { offerings, items, comps, documents, updates, investors } = schema;

    const offeringFile = path.join(CONTENT_DIR, "offering.json");
    const updatesFile = path.join(CONTENT_DIR, "updates.json");
    const source = OfferingJson.parse(readJson(offeringFile));
    const sourceUpdates = existsSync(updatesFile) ? UpdatesJson.parse(readJson(updatesFile)) : [];

    // Images first, so a missing file fails the seed before the database changes.
    const images = copyImages(
      source.code,
      source.items.map((item) => path.posix.basename(item.image)),
    );

    await runMigrations();

    const imageDir = `/offerings/${source.code.toLowerCase()}`;
    const fields = {
      name: source.name,
      overview: source.overview,
      pricePerUnitCents: Math.round(source.stats.price_per_unit_usd * 100),
      totalUnits: keyTermNumber(source.key_terms, "Total units"),
      investorUnitsOffered: keyTermNumber(source.key_terms, "Investor units offered"),
      partnerUnits: keyTermNumber(source.key_terms, "Partner units retained"),
      vaultedUnits: keyTermNumber(source.key_terms, "Vaulted units"),
      closeDate: isoDateOrNull(source.stats.close_date),
      keyTerms: source.key_terms,
      howItWorks: source.how_it_works,
      howYouGetPaid: source.how_you_get_paid ?? null,
      provenance: source.provenance,
      custody: source.custody,
      risks: source.key_risks,
      faq: source.faq,
      contactEmail: source.contact_email,
      wireInstructions: source.wire ?? null,
      esignUrl: source.esign_url ?? null,
      legalLine: source.legal_line,
      legend: source.legend,
    };
    const documentRows = source.documents.map((d) => ({
      title: d.title,
      filePath: path.posix.basename(d.path),
      version: d.version,
      date: d.date,
    }));
    for (const d of documentRows) {
      if (!resolveDocumentPath(d.filePath)) throw new Error(`Invalid document path: ${d.filePath}`);
    }

    const offering = await writeTransaction(async (tx) => {
      // Insert with phase "preview"; on conflict the existing phase is kept.
      const [row] = await tx
        .insert(offerings)
        .values({ code: source.code, phase: "preview", ...fields })
        .onConflictDoUpdate({
          target: offerings.code,
          set: { ...fields, updatedAt: new Date().toISOString() },
        })
        .returning();
      const offeringId = row.id;

      await tx.delete(items).where(eq(items.offeringId, offeringId));
      await tx.delete(comps).where(eq(comps.offeringId, offeringId));
      await tx.delete(documents).where(eq(documents.offeringId, offeringId));
      await tx.delete(updates).where(eq(updates.offeringId, offeringId));

      if (source.items.length) {
        await tx.insert(items).values(
          source.items.map((item) => ({
            offeringId,
            number: item.number,
            title: item.title,
            photographer: item.photographer,
            year: item.year,
            description: item.description,
            estimate: item.estimate,
            image: `${imageDir}/${path.posix.basename(item.image)}`,
            caption: item.caption,
          })),
        );
      }
      if (source.comps.length) {
        await tx.insert(comps).values(source.comps.map((c) => ({ offeringId, ...c })));
      }
      if (documentRows.length) {
        await tx.insert(documents).values(documentRows.map((d) => ({ offeringId, ...d })));
      }
      if (sourceUpdates.length) {
        await tx.insert(updates).values(sourceUpdates.map((u) => ({ offeringId, ...u })));
      }
      return row;
    });

    const written: string[] = [];
    if (PLACEHOLDER_DOCS) {
      mkdirSync(documentsRoot(), { recursive: true });
      for (const d of documentRows) {
        const file = resolveDocumentPath(d.filePath);
        if (!file || existsSync(file)) continue;
        writeFileSync(
          file,
          placeholderPdf([
            d.title,
            `${source.name} (${source.code})`,
            `Version ${d.version}, ${d.date}`,
            PLACEHOLDER_MARKER,
            "For local development only.",
          ]),
        );
        written.push(d.filePath);
      }
    }

    console.log(`Documents (${documentsRoot()}):`);
    const docs = await syncAndReport(offering.id);
    if (written.length) console.log(`  Wrote placeholder PDFs: ${written.join(", ")}`);

    let inviteUrl: string | null = null;
    if (WITH_DEMO_INVESTOR) {
      const [existing] = await db
        .select()
        .from(investors)
        .where(eq(investors.email, DEMO_EMAIL))
        .limit(1);
      let investor = existing;
      if (investor) {
        await grantOfferingAccess(investor.id, offering.id);
      } else {
        investor = await createInvestor(
          {
            name: "Demo Investor",
            email: DEMO_EMAIL,
            relationshipNote: "Local development demo investor created by pnpm seed.",
          },
          offering.id,
        );
      }
      if (investor.revokedAt) console.log("Note: the demo investor is revoked; the link will not work.");
      inviteUrl = `${APP_URL}/invest/i/${investor.inviteToken}`;
    }

    const count = async (table: typeof items | typeof comps | typeof documents | typeof updates) =>
      (await db.select({ id: table.id }).from(table).where(eq(table.offeringId, offering.id))).length;
    const verified = docs.filter((d) => d.ok).length;
    const summary: [string, string][] = [
      ["offering", `${offering.code} "${offering.name}" (id ${offering.id}, phase ${offering.phase})`],
      ["items", String(await count(items))],
      ["comps", String(await count(comps))],
      ["documents", `${await count(documents)} (${verified} verified, ${docs.length - verified} missing)`],
      ["updates", String(await count(updates))],
      [
        "images",
        `${images.copied + images.kept} referenced in public${imageDir} (${images.copied} copied from ${IMAGES_DIR}, ${images.kept} already present)`,
      ],
    ];
    console.log("\nSeed summary");
    const width = Math.max(...summary.map(([k]) => k.length));
    for (const [k, v] of summary) console.log(`  ${k.padEnd(width)}  ${v}`);
    if (verified < docs.length) {
      console.log(
        `\nDrop PDFs named exactly as filePath into ${documentsRoot()} and run pnpm docs:sync.`,
      );
    }
    if (inviteUrl) console.log(`\nDemo invite (${DEMO_EMAIL}): ${inviteUrl}`);
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
