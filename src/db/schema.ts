import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  FaqEntry,
  HowItWorksStep,
  HowYouGetPaid,
  KeyTerm,
  WireInstructions,
} from "./types";

const now = () => new Date().toISOString();

const createdAt = () => text("created_at").notNull().$defaultFn(now);
const updatedAt = () =>
  text("updated_at").notNull().$defaultFn(now).$onUpdateFn(now);

export const PHASES = ["preview", "open", "closed"] as const;
export type Phase = (typeof PHASES)[number];

export const INVESTOR_STATUSES = ["accredited", "sophisticated"] as const;
export type InvestorStatus = (typeof INVESTOR_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "requested",
  "accepted",
  "signed",
  "funded",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const STATUS_ACTIONS = [
  "set_accepted",
  "set_signed",
  "set_funded",
  "clear_funded",
  "clear_signed",
  "clear_accepted",
  "cancel",
  "uncancel",
] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];

// Offering

export const offerings = sqliteTable(
  "offerings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    overview: text("overview", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    phase: text("phase", { enum: PHASES }).notNull().default("preview"),
    pricePerUnitCents: integer("price_per_unit_cents").notNull(),
    totalUnits: integer("total_units"),
    investorUnitsOffered: integer("investor_units_offered"),
    partnerUnits: integer("partner_units"),
    vaultedUnits: integer("vaulted_units"),
    closeDate: text("close_date"),
    keyTerms: text("key_terms", { mode: "json" })
      .$type<KeyTerm[]>()
      .notNull()
      .default(sql`'[]'`),
    howItWorks: text("how_it_works", { mode: "json" })
      .$type<HowItWorksStep[]>()
      .notNull()
      .default(sql`'[]'`),
    howYouGetPaid: text("how_you_get_paid", {
      mode: "json",
    }).$type<HowYouGetPaid>(),
    provenance: text("provenance").notNull().default(""),
    custody: text("custody").notNull().default(""),
    risks: text("risks", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    faq: text("faq", { mode: "json" })
      .$type<FaqEntry[]>()
      .notNull()
      .default(sql`'[]'`),
    contactEmail: text("contact_email").notNull().default(""),
    wireInstructions: text("wire_instructions", {
      mode: "json",
    }).$type<WireInstructions>(),
    esignUrl: text("esign_url"),
    legalLine: text("legal_line").notNull().default(""),
    legend: text("legend").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("offerings_code_unique").on(t.code)],
);

// Content tables

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    photographer: text("photographer").notNull().default(""),
    year: text("year").notNull().default(""),
    description: text("description").notNull().default(""),
    estimate: text("estimate").notNull().default(""),
    image: text("image").notNull(),
    caption: text("caption").notNull().default(""),
  },
  (t) => [index("items_offering_idx").on(t.offeringId)],
);

export const comps = sqliteTable(
  "comps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    price: text("price").notNull().default(""),
    source: text("source").notNull().default(""),
    date: text("date").notNull().default(""),
  },
  (t) => [index("comps_offering_idx").on(t.offeringId)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Relative to ./private/documents. Never client supplied.
    filePath: text("file_path").notNull(),
    version: text("version").notNull(),
    date: text("date").notNull(),
    // sha256 hex of the file bytes; null until computed by seed or docs:sync.
    contentHash: text("content_hash"),
    sizeBytes: integer("size_bytes"),
  },
  (t) => [
    uniqueIndex("documents_offering_file_unique").on(t.offeringId, t.filePath),
  ],
);

export const updates = sqliteTable(
  "updates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
  },
  (t) => [index("updates_offering_idx").on(t.offeringId)],
);

// Investors

export const investors = sqliteTable(
  "investors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    relationshipNote: text("relationship_note").notNull(),
    inviteToken: text("invite_token").notNull(),
    code: text("code").notNull(),
    revokedAt: text("revoked_at"),
    lastViewedAt: text("last_viewed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("investors_invite_token_unique").on(t.inviteToken),
    uniqueIndex("investors_code_unique").on(t.code),
  ],
);

export const investorOfferings = sqliteTable(
  "investor_offerings",
  {
    investorId: integer("investor_id")
      .notNull()
      .references(() => investors.id),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.investorId, t.offeringId] })],
);

// Investor records

export const acknowledgments = sqliteTable(
  "acknowledgments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    investorId: integer("investor_id")
      .notNull()
      .references(() => investors.id),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id),
    documentsHash: text("documents_hash").notNull(),
    documentsJson: text("documents_json").notNull(),
    createdAt: createdAt(),
    ip: text("ip").notNull().default(""),
  },
  (t) => [index("acks_investor_offering_idx").on(t.investorId, t.offeringId)],
);

export const interests = sqliteTable(
  "interests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    investorId: integer("investor_id")
      .notNull()
      .references(() => investors.id),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id),
    units: integer("units").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ip: text("ip").notNull().default(""),
  },
  (t) => [
    uniqueIndex("interests_investor_offering_unique").on(
      t.investorId,
      t.offeringId,
    ),
  ],
);

export const questionnaires = sqliteTable(
  "questionnaires",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    investorId: integer("investor_id")
      .notNull()
      .references(() => investors.id),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address1: text("address1").notNull(),
    address2: text("address2").notNull().default(""),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    investorStatus: text("investor_status", {
      enum: INVESTOR_STATUSES,
    }).notNull(),
    statusBasis: text("status_basis").notNull(),
    relationshipConfirmed: integer("relationship_confirmed", {
      mode: "boolean",
    }).notNull(),
    badActorConfirmed: integer("bad_actor_confirmed", {
      mode: "boolean",
    }).notNull(),
    signatureName: text("signature_name").notNull(),
    signatureDate: text("signature_date").notNull(),
    createdAt: createdAt(),
    ip: text("ip").notNull().default(""),
  },
  (t) => [
    uniqueIndex("questionnaires_investor_offering_unique").on(
      t.investorId,
      t.offeringId,
    ),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    investorId: integer("investor_id")
      .notNull()
      .references(() => investors.id),
    offeringId: integer("offering_id")
      .notNull()
      .references(() => offerings.id),
    units: integer("units").notNull(),
    amountCents: integer("amount_cents").notNull(),
    acknowledgmentId: integer("acknowledgment_id")
      .notNull()
      .references(() => acknowledgments.id),
    wireReference: text("wire_reference").notNull(),
    status: text("status", { enum: SUBSCRIPTION_STATUSES })
      .notNull()
      .default("requested"),
    cancelledAt: text("cancelled_at"),
    acceptedAt: text("accepted_at"),
    signedAt: text("signed_at"),
    fundedAt: text("funded_at"),
    createdAt: createdAt(),
    ip: text("ip").notNull().default(""),
  },
  (t) => [
    uniqueIndex("subscriptions_investor_offering_unique").on(
      t.investorId,
      t.offeringId,
    ),
    index("subscriptions_offering_idx").on(t.offeringId),
  ],
);

export const statusLog = sqliteTable(
  "status_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    action: text("action", { enum: STATUS_ACTIONS }).notNull(),
    at: text("at").notNull().$defaultFn(now),
    ip: text("ip").notNull().default(""),
  },
  (t) => [index("status_log_subscription_idx").on(t.subscriptionId)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: text("window_start").notNull(),
});

// Inferred types

export type Offering = typeof offerings.$inferSelect;
export type NewOffering = typeof offerings.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Comp = typeof comps.$inferSelect;
export type NewComp = typeof comps.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
export type Investor = typeof investors.$inferSelect;
export type NewInvestor = typeof investors.$inferInsert;
export type InvestorOffering = typeof investorOfferings.$inferSelect;
export type NewInvestorOffering = typeof investorOfferings.$inferInsert;
export type Acknowledgment = typeof acknowledgments.$inferSelect;
export type NewAcknowledgment = typeof acknowledgments.$inferInsert;
export type Interest = typeof interests.$inferSelect;
export type NewInterest = typeof interests.$inferInsert;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type NewQuestionnaire = typeof questionnaires.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type StatusLogEntry = typeof statusLog.$inferSelect;
export type NewStatusLogEntry = typeof statusLog.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
