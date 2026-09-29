# PLAN: Vaulted app investor area

Build spec for the private, invite-only investor area. Read CONTEXT.md first. Anything not listed here is out of scope.

## 0. Facts

| Topic | Fact |
|---|---|
| Framework | Next.js 16.3, App Router, React 19, TypeScript strict, pnpm 10. |
| Middleware | Next 16 names the request middleware file `src/proxy.ts`, exporting `proxy`. `middleware.ts` is deprecated, so we use `proxy.ts` and call it "middleware" in prose. |
| Styling | Tailwind v4 via `@tailwindcss/postcss`. Tokens live in `src/app/globals.css` under `@theme`. There is no `tailwind.config`. |
| Components | shadcn is not installed yet. |
| Native modules | pnpm 10 blocks postinstall build scripts by default, so native modules need `pnpm approve-builds`. We avoid that by using `@libsql/client` (prebuilt binaries) as the SQLite driver. |

## 1. Dependencies (pnpm only)

| Kind | Packages |
|---|---|
| Runtime | `drizzle-orm`, `@libsql/client`, `zod`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, Radix primitives pulled in by shadcn |
| Dev | `drizzle-kit`, `tsx`, `@playwright/test`, `prettier` (optional; skip if it adds noise) |

shadcn setup:

1. `pnpm dlx shadcn@latest init` (Tailwind v4, neutral base, CSS variables).
2. Add: `button`, `card`, `badge`, `input`, `label`, `textarea`, `checkbox`, `radio-group`, `select`, `table`, `dialog`, `progress`, `alert`, `separator`.
3. Do not add `form`: we use server actions with `useActionState`.

## 2. Folder structure

### Routes (`src/app`)

| Path | Purpose |
|---|---|
| `src/app/(public)/page.tsx` | Plain "Vaulted" holding page. No offering language, no links to `/invest` or `/admin`. |
| `src/app/robots.ts` | Disallow `/invest` and `/admin`. |
| `src/app/invest/layout.tsx` | Metadata robots `noindex, nofollow` only. No session check and no offering content here. |
| `src/app/invest/(public)/layout.tsx` | Public layout: same header without nav (logo only), same footer, `noindex`. Renders no offering text. |
| `src/app/invest/(public)/enter/page.tsx` | "Enter your invite link". No cookie required. GET form to `/invest/i/<token>` via a tiny client parser, or a server action that extracts the token and redirects. |
| `src/app/invest/(public)/i/[token]/route.ts` | GET. Rate limited, validates token, sets cookie, redirects to `/invest`. |
| `src/app/invest/(public)/logout/route.ts` | Clears the investor cookie. |
| `src/app/invest/(protected)/layout.tsx` | Calls `requireInvestor(currentOfferingId)`; on failure redirects to `/invest/enter`. Header: logo, Offering, My holdings, Log out. Footer: legend and legal line. |
| `src/app/invest/(protected)/page.tsx` | Offering page. |
| `src/app/invest/(protected)/interested/page.tsx` | Register interest. |
| `src/app/invest/(protected)/questionnaire/page.tsx` | Investor questionnaire. |
| `src/app/invest/(protected)/subscribe/page.tsx` | Subscribe. |
| `src/app/invest/(protected)/holdings/page.tsx` | My holdings. |
| `src/app/invest/(protected)/documents/[id]/route.ts` | Document download. Calls `requireInvestor(offeringId)`, resolves the document by `id` AND `offeringId` from the DB, streams the file at its stored `filePath` under `./private/documents`. No client-supplied filenames. |
| `src/app/admin/layout.tsx` | Admin shell. |
| `src/app/admin/page.tsx` | Login or dashboard (dashboard branch calls `requireAdmin()`). |
| `src/app/admin/logout/route.ts` | Clears the admin cookie. |
| `src/app/admin/export/investors/route.ts` | Investors export. Calls `requireAdmin()`. |
| `src/app/admin/export/acknowledgments/route.ts` | Acknowledgments export. Calls `requireAdmin()`. |

Route groups do not change URLs: `/invest/enter`, `/invest/i/<token>` and `/invest/logout` are the public URLs; every other `/invest` URL is under `(protected)`. Page layouts do not run for route handlers, so the documents route handler calls `requireInvestor` itself.

### Server actions (`src/actions/*.ts`)

acknowledge, interested, questionnaire, subscribe, and admin (login, phase, investors, status).

### Database

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | All tables. |
| `src/db/client.ts` | libsql plus drizzle; reads `DATABASE_PATH` env. |
| `drizzle.config.ts` | drizzle-kit config. |
| `drizzle/` | Generated migrations, committed. |
| `src/db/migrate.ts` | Runs migrations at startup and seed. |

### Data layer (`src/data/*.ts`)

`offerings.ts`, `investors.ts`, `investorOfferings.ts`, `documents.ts`, `acknowledgments.ts`, `interests.ts`, `questionnaires.ts`, `subscriptions.ts`, `updates.ts`, `admin.ts`, `rateLimit.ts`.

Pages and actions import only from `src/data` and `src/lib`. Every data-layer function that reads or writes investor records takes `investorId` as an argument supplied by a caller that obtained it from `requireInvestor`; none reads it from form input.

### Library (`src/lib`)

| Path | Purpose |
|---|---|
| `src/lib/session.ts` | `SessionProvider` interface plus HMAC cookie implementation with per-purpose keys; `requireInvestor(offeringId)`. |
| `src/lib/admin-session.ts` | Admin session; `requireAdmin()`. |
| `src/lib/ip.ts` | Client IP extraction (trust rule in section 4). |
| `src/lib/format.ts` | Money, units, dates. |
| `src/lib/validation/*.ts` | Zod schemas. |
| `src/lib/documents.ts` | Manifest hash, on-disk file verification (existence plus `contentHash`), safe path resolution under `./private/documents`. |

### Components

| Path | Contents |
|---|---|
| `src/components/ui/*` | shadcn components. |
| `src/components/invest/*` | `PhaseBadge`, `StatusBadge`, `StatBlock`, `FundingProgress`, `Gallery` plus `Lightbox` (client), `TermsList`, `DocumentsList` plus `AcknowledgeForm` (client), `FunnelDots`, `DataTable` with `EmptyState`, `FormField` helpers, `SubmitButton` (client, `useFormStatus`). |

### Other

| Path | Purpose |
|---|---|
| `scripts/seed.ts` | Re-runnable seed. |
| `scripts/docs-sync.ts` | `pnpm docs:sync`: recompute `contentHash` and `sizeBytes` for documents from `./private/documents`. |
| `private/documents/.gitkeep` | Placeholder for gated PDFs. |
| `public/offerings/mm01/*.svg` | Copied from `../vaulted-landing/invest/images`. |
| `tests/*.spec.ts` | Playwright specs. |
| `playwright.config.ts` | Playwright config. |

## 3. Schema

Drizzle `sqlite-core`. Ids are integer autoincrement. Timestamps are ISO text. Every offering-scoped table has an `offeringId` FK.

### offerings

| Column | Notes |
|---|---|
| id | pk |
| code | unique |
| name | |
| overview | json `string[]` |
| phase | enum text `preview` / `open` / `closed`, default `preview` |
| pricePerUnitCents | |
| totalUnits | nullable |
| investorUnitsOffered | nullable |
| partnerUnits | nullable |
| vaultedUnits | nullable |
| closeDate | nullable |
| keyTerms | json |
| howItWorks | json |
| howYouGetPaid | json |
| provenance | |
| custody | |
| risks | json |
| faq | json |
| contactEmail | |
| wireInstructions | json |
| esignUrl | |
| legalLine | |
| legend | |
| createdAt | |
| updatedAt | |

### Content tables (each with offeringId FK)

| Table | Columns |
|---|---|
| items | id, offeringId, number, title, photographer, year, description, estimate, image, caption |
| comps | id, offeringId, description, price, source, date |
| documents | id, offeringId, title, filePath, version, date, contentHash (sha256 hex of the file bytes, nullable until computed), sizeBytes (nullable until computed) |
| updates | id, offeringId, date, title, body |

### investors

| Column | Notes |
|---|---|
| id | pk |
| name | |
| email | |
| relationshipNote | |
| inviteToken | unique, 26 chars |
| code | 6 chars, for wire reference |
| revokedAt | |
| lastViewedAt | |
| createdAt | |

### investorOfferings

| Column | Notes |
|---|---|
| investorId | FK investors |
| offeringId | FK offerings |
| createdAt | |

Unique(investorId, offeringId). A row is created when the admin adds an investor for the current offering. An investor may only see offerings for which a row exists.

### Investor records

| Table | Columns | Constraints |
|---|---|---|
| acknowledgments | id, investorId, offeringId, documentsHash, documentsJson, createdAt, ip | |
| interests | id, investorId, offeringId, units, note, createdAt, updatedAt, ip | unique(investorId, offeringId) |
| questionnaires | id, investorId, offeringId, name, email, phone, address1, address2, city, state, postalCode, investorStatus (enum `accredited` / `sophisticated`), statusBasis, relationshipConfirmed, badActorConfirmed, signatureName, signatureDate, createdAt, ip | unique(investorId, offeringId) |
| subscriptions | id, investorId, offeringId, units, amountCents, acknowledgmentId, wireReference, status (enum `requested` / `accepted` / `signed` / `funded`), cancelledAt (nullable), acceptedAt, signedAt, fundedAt, createdAt, ip | unique(investorId, offeringId) |
| statusLog | id, subscriptionId, action, at, ip | Append-only. Form D clock = min(at) of `set_accepted`. |
| rateLimits | key (pk), count, windowStart | |

### Migrations

- `pnpm drizzle-kit generate` output is committed in `drizzle/`.
- `src/db/migrate.ts` applies migrations with drizzle's migrator.
- Seed runs migrate first.

## 4. Auth and middleware

### SessionProvider interface

| Method | Returns |
|---|---|
| `createInvestorSession(investorId)` | Set-Cookie value (purpose `investor`) |
| `readInvestorSession(cookies)` | `{ investorId }` or `null`; returns `null` unless the payload verifies under the investor key and `purpose === "investor"` |
| `clear` | Clears the session cookie |

### Cookies

| Cookie | Value | Signing | Lifetime | Attributes |
|---|---|---|---|---|
| `vinv` (investor) | base64url(json `{ sub, purpose: "investor", iat, exp }`) + "." + signature | HMAC-SHA256 with the investor purpose key via WebCrypto (works in proxy and Node) | Max-Age 7 days | HttpOnly, Secure in production, SameSite=Lax, Path=/ |
| `vadm` (admin) | base64url(json `{ sub: "admin", purpose: "admin", iat, exp }`) + "." + signature | HMAC-SHA256 with the admin purpose key | 12 hours | Same |

Purpose separation:

- Purpose key = HMAC-SHA256(key = `SESSION_SECRET`, message = purpose string, `"investor"` or `"admin"`). The resulting bytes are the HMAC key used to sign and verify cookies of that purpose.
- Verification uses the key for the expected purpose AND checks the payload `purpose` field. An investor cookie can never verify as admin, and the reverse.
- `requireAdmin()` in `src/lib/admin-session.ts` verifies the `vadm` cookie with the admin key, requires `purpose === "admin"` and `sub === "admin"`, and checks expiry. It is called by every admin page, every export route and every admin action except login. Failure: pages render the login, routes return 401, actions return an error without side effects.

Admin login compares the submitted code with `ADMIN_CODE` timing-safe.

### proxy.ts

- Matcher: `/invest/:path*`, `/admin/:path*`.
- Verifies signature (with the purpose key), purpose and expiry only (no DB).
- Missing or invalid cookie: redirect to `/invest/enter`, or render the admin login for `/admin`.
- Excludes `/invest/enter`, `/invest/i/*`, `/invest/logout`.
- The proxy is a first filter only. Authorization is decided by `requireInvestor` and `requireAdmin`.

### Server-side verification: `requireInvestor(offeringId)`

`requireInvestor(offeringId)` in `src/lib/session.ts` is the single entry point for investor authorization. It:

1. Verifies the `vinv` cookie (investor key, `purpose === "investor"`, expiry).
2. Loads the investor from the DB by `sub`.
3. Rejects revoked investors (`revokedAt` set).
4. Checks that an `investorOfferings` row exists for (investorId, offeringId).
5. Returns the investor.

It is called at the top of:

- the `(protected)` layout and every `/invest` page under it (pages call it too, since layouts and pages render independently),
- every investor server action (acknowledge, interested, questionnaire, subscribe), before input parsing side effects,
- the documents route handler.

`investorId` always comes from `requireInvestor`, never from form input, hidden fields or query strings. Action schemas do not contain an investor id field. Every data-layer write receives `investorId` from the caller that obtained it from `requireInvestor`, and every record lookup is scoped by that `investorId` and `offeringId`, so an action cannot target another investor's records. Revocation takes effect on the next request, including direct action submissions.

### Rate limits (`src/data/rateLimit.ts`, DB-backed fixed window)

| Limit | Key scope | Allowance |
|---|---|---|
| Token attempts | per IP (`token:<ip>`) | 10 per 15 min |
| Token attempts, global | `token:global` | 300 per 15 min |
| Admin login | per IP (`admin-login:<ip>`) | 10 per 15 min |
| Admin login, global | `admin-login:global` | 100 per 15 min |
| Investor writes | per investor | 30 per 15 min |
| Admin writes | admin | 120 per 15 min |

- Each limit update is a single atomic upsert: `insert ... on conflict(key) do update` that resets `count` and `windowStart` when the window has expired and otherwise increments `count`, returning the new count. No read-then-write.
- Token and admin login attempts check both the per-IP key and the global key; either being over the limit rejects. The global caps mean rotating forwarded headers cannot fully defeat the limits.

### Client IP and trust boundary

- The app runs behind exactly one trusted reverse proxy, which appends the connecting client address to `x-forwarded-for`.
- Client IP = the RIGHTMOST entry of `x-forwarded-for` (the one appended by the trusted proxy), else `x-real-ip`, else "" (local dev). Entries to the left are client-controlled and ignored.
- Direct access to the origin must be blocked so requests cannot bypass the proxy. HANDOFF.md documents this requirement.

### CSRF and input

- Server actions get CSRF protection from Next (origin check).
- Route handlers that mutate are POST-only and check `Origin`.
- Zod on every action input. Max lengths as in the landing PLAN: name 120, email 254, phone 40, address lines 120, city 80, state 2, postal code 12, interest note 1000, signature name 120, relationship note 500.
- IP: see "Client IP and trust boundary" above.

## 5. Phase and business rules

Enforced server side, in actions and the data layer. Same table as `../vaulted-landing/PLAN.md` section 5.

| Phase | Offering page | Interested | Questionnaire | Subscribe |
|---|---|---|---|---|
| preview | Preview state | Enabled (interested only) | Not available | Not available |
| open | Live | Not available | Enabled | Enabled after questionnaire and current acknowledgment |
| closed | "Offering closed" | Not available | Not available | Not available |

### Acknowledgment

- `documentsHash` = sha256 of canonical `[{ filePath, version, date, contentHash }]` (sorted by `filePath`, stable key order).
- Before recording, every document of the offering is verified on disk: the file exists under `./private/documents` and its sha256 equals the stored `contentHash`. Any missing file, null `contentHash`, or mismatch refuses the acknowledgment with `documents_missing`.
- The client submits the hash rendered in the page. Mismatch returns `documents_updated`.
- Idempotent when the latest acknowledgment has the same hash.
- "Updated" badge when an older acknowledgment exists with a different hash.

### Subscribe

Inside a single DB transaction:

1. Re-read phase, questionnaire, latest acknowledgment hash, and units taken (sum of non-cancelled subscriptions). Recompute the current manifest `documentsHash` from the documents table and require it to equal the latest acknowledgment hash; otherwise return `documents_updated`.
2. Insert only if units <= remaining.
3. `amountCents = units * pricePerUnitCents`.
4. `wireReference = ${code}-${investor.code}`.

### Phase change (admin)

- The admin cannot set phase to `open` unless the offering has at least one document, and at least one document's file exists under `./private/documents` and matches its stored `contentHash`. Otherwise the action returns `documents_missing` and the phase is unchanged.

### Status actions (admin)

Allowed transitions (anything else is refused with `invalid_transition`):

| Action | From | To |
|---|---|---|
| `set_accepted` | requested | accepted (sets `acceptedAt`) |
| `set_signed` | accepted | signed (sets `signedAt`) |
| `set_funded` | signed | funded (sets `fundedAt`) |
| `clear_funded` | funded | signed (clears `fundedAt`) |
| `clear_signed` | signed | accepted (clears `signedAt`); refused while `fundedAt` is set |
| `clear_accepted` | accepted | requested (clears `acceptedAt`); refused while `signedAt` is set |
| `cancel` | any non-cancelled state | sets `cancelledAt`; status timestamps are kept |
| `uncancel` | cancelled | clears `cancelledAt`; the previous timestamps (and so the previous status) are restored as they were |

Rules:

- Set never overwrites an existing timestamp. Clear reverses exactly one step, in order.
- Status transitions other than `cancel` and `uncancel` are refused on a cancelled subscription.
- The 35 cap on sophisticated (non-accredited) investors counts subscriptions that are accepted (`acceptedAt` set), not cancelled, and whose questionnaire `investorStatus` is `sophisticated`. It is enforced on every transition that enters or restores a counted state: `set_accepted`, and `uncancel` when the subscription has `acceptedAt`. If the subscription belongs to a sophisticated investor and the count (excluding itself) is already 35, the action is refused with `sophisticated_cap`.
- Each status action runs inside one DB transaction: read the subscription, validate the transition, count for the cap, update, append to `statusLog`. The count and the update are in the same transaction so two concurrent actions cannot both pass the cap.
- `statusLog` is append-only. Every applied action appends a row. The Form D clock is the `at` of the earliest `set_accepted` row for the offering.

### Holdings status precedence

funded > signed > accepted > requested > interested > none.

## 6. Components and design

### Tokens (from `../vaulted-landing/styles.css` into `@theme` in `globals.css`)

| Token | Value |
|---|---|
| cream | #f8f4eb |
| cream-deep | #eee8db |
| paper | #fffdf8 |
| ink | #171a16 |
| green | #0e392c |
| green-deep | #08271f |
| gold | #b99127 |
| gold-on-light | #806311 |
| muted | #686a62 |
| line | #d8d0c0 |

| Aspect | Rule |
|---|---|
| Fonts | Cormorant Garamond (headings, weights 400 and 500) and Inter (body) via `next/font/google`. |
| Spacing | 8 / 16 / 24 / 40 / 64 / 96 scale. |
| Radius | 0 (square corners like the site). |
| Borders | Hairline. |
| shadcn theme | Themed once by mapping its CSS variables (background, foreground, primary, muted, border, accent) to the tokens above. |
| Accent | Single accent for progress and status: gold-on-light. |
| Numbers | `tabular-nums` on every number. |

### Rules

- Components as listed in section 2.
- Every form: labels, inline zod errors, pending state (`useFormStatus`), success state.
- Every table: empty state.
- Mobile first. Verify at 390, 768, and 1280 px.

## 7. Seed

`scripts/seed.ts`, run with `pnpm seed`. Re-runnable.

1. Runs migrations.
2. Upserts the offering by `code` from `../vaulted-landing/functions/invest/_content/offering.json`, mapping fields; TBD and null values are preserved.
3. Replaces items, comps, documents, and updates for that offering.
4. Computes `contentHash` (sha256) and `sizeBytes` for each document from `./private/documents/<filePath>` using the same code as `pnpm docs:sync`. Missing files leave both null (the offering then cannot open).
5. Copies `../vaulted-landing/invest/images/*.svg` into `public/offerings/<code>/`. If the source is missing, keeps what exists.
6. Creates nothing else.

### docs:sync

`pnpm docs:sync` (`scripts/docs-sync.ts`) reads `./private/documents`, matches files to documents rows by `filePath`, and updates `contentHash` and `sizeBytes`. It does not change `version` or `date` (those stay content-managed). Rows whose file is missing get null `contentHash` and `sizeBytes`, and the script reports them. Run it whenever a PDF is replaced; changing bytes changes the manifest hash and invalidates existing acknowledgments.

Optional `--with-demo-investor` flag prints a dev invite link.

## 8. Tests

Playwright, against `pnpm dev` on a test `DATABASE_PATH` of `./data/test.db`, seeded in `globalSetup`. Helpers use the data layer directly for fixtures (phase, investors).

| # | Scenario | Expectation |
|---|---|---|
| 1 | Unauthenticated | `/invest` redirects to `/invest/enter`; `/invest/documents/1` returns 401 or redirects; `/admin` shows login; offering text absent. |
| 2 | Enter page | `/invest/enter` renders without a cookie and contains no offering text. |
| 3 | Invite link | Valid link logs in and shows the offering; revoked token shows nothing. |
| 4 | Open phase | Invest locked until acknowledgment; after acknowledging, link enabled. |
| 5 | Subscribe | Units input max = remaining; server rejects remaining + 1; success shows wire reference. |
| 6 | Admin | Login, set accepted; My holdings shows Accepted. |
| 7 | Cookie substitution | The `vinv` cookie value copied into `vadm` is rejected: `/admin` shows login, exports return 401, admin actions fail. |
| 8 | Revoked action | After revocation, a direct server action submission (acknowledge, interested, questionnaire, subscribe) with the old cookie is rejected and writes nothing. |
| 9 | Cross-investor | An action cannot target another investor's records (no investor id in input is honored; records written belong to the session investor only). |
| 10 | Offering access | An investor with access to offering A cannot read offering B's document (`/invest/documents/<B doc id>`) or page. |
| 11 | Empty manifest | Setting phase to `open` on an offering with no documents (or no verifiable file) is refused. |
| 12 | Changed PDF | After changing a document's bytes: before `docs:sync`, acknowledging returns `documents_missing`; after `docs:sync`, the manifest hash changes, the prior acknowledgment no longer counts, and subscribe returns `documents_updated`. |
| 13 | Status transitions | Out-of-order transitions are refused (e.g. `set_signed` from requested, `clear_accepted` while signed); cancel then uncancel restores the previous status. |
| 14 | 35 cap | With 35 accepted sophisticated subscriptions, `set_accepted` for another sophisticated investor is refused, and `uncancel` of a cancelled accepted sophisticated subscription is refused. |

## 9. Build order

| Step | Piece |
|---|---|
| 1 | Deps, shadcn, theme tokens, fonts, layout shell |
| 2 | Schema, migrations, client, migrate |
| 3 | Data layer |
| 4 | Session (purpose keys, `requireInvestor`, `requireAdmin`), IP trust rule, proxy, route groups, invite route, enter, logout |
| 5 | Seed, `docs:sync` script (shared hashing code), and images |
| 6 | Offering page and acknowledge action |
| 7 | Interested |
| 8 | Questionnaire |
| 9 | Subscribe |
| 10 | Holdings |
| 11 | Admin (login, dashboard, investors plus `investorOfferings`, phase and close date with document check, status transitions and cap, exports) |
| 12 | Playwright tests |
| 13 | HANDOFF.md (includes: block direct origin access; run `pnpm docs:sync` after replacing PDFs) |

After each piece run `pnpm lint`, `pnpm tsc --noEmit`, and (once they exist) `pnpm test`.

## 10. Placeholders (never invented)

- Ownership split
- Setup fee
- Raise size and units
- Hold period
- Close date
- Items
- Comps
- Documents and versions
- E-sign URL
- Wire details

## 11. Future-proofing notes (kept minimal)

| Later change | How |
|---|---|
| Postgres | Swap the `src/db/client.ts` driver and the drizzle dialect. The schema uses portable column types. |
| Hosted auth | Replace the `SessionProvider` implementation. `requireInvestor(offeringId)` stays the only entry point. |
| Multiple offerings | All tables are already keyed by `offeringId`, and access is granted per offering through `investorOfferings`. The "current offering" is resolved by a single function in `src/data/offerings.ts` (today: the one offering). |
