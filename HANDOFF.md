# HANDOFF: Vaulted investor area

This is the guide for running, updating and deploying the private investor area. It is written for Charles. Commands are typed in a terminal inside the `vaulted-app` folder.

## 1. What was built

A private, invite-only website for Vaulted's first offering. Each investor gets a personal link. The link logs them in, and they can read the offering, open the documents, register interest, fill in the investor questionnaire, subscribe for units and see their holdings. Charles runs everything from one admin page: adding investors, sending links, moving the offering between phases, tracking each subscription from requested to funded, and downloading the records. All of the work is on the `main` branch, from commit `1dbe563` (the empty starting project) to `ed578f6` (fixes from the final review). The feature work itself is `bb2c2a3` through `ed578f6`.

- **Invite gate and sessions.** Every investor has a personal link (`/invest/i/<token>`). Opening it sets a signed login cookie that lasts 7 days; after that, the same link logs them in again. Nothing under `/invest` or `/admin` can be seen without a valid cookie. Revoking an investor stops their link and their current session on the very next page load. Link attempts are rate limited. There is also a plain "enter your invite link" page at `/invest/enter` that shows no offering content.
- **Offering page.** Stats, overview, how it works, the photo gallery (with a full-screen viewer), key terms, how you get paid, provenance, custody, comparable sales, risks, FAQ and updates. The documents section lists each PDF with its version and date. Before an investor can subscribe they must tick a box confirming they have received and read the current documents. That confirmation is stored with the time, their IP address and the exact versions of the files they saw.
- **Interested.** While the offering is in Preview, investors can say how many units they might want. This is tentative and not a commitment.
- **Questionnaire.** While the offering is Open: contact details, state of residence, accredited or sophisticated status and the reason, confirmation of the existing relationship, the bad-actor confirmation and a typed signature. Stored with time and IP.
- **Subscribe.** Only possible when the offering is Open, the questionnaire is done and the current documents are acknowledged. The investor picks a number of units (never more than are left), and the page shows the total, the e-sign link, the wire instructions and a personal wire reference (offering code plus the investor's 6-character code, for example `MM01-AB12CD`). An investor who already has a request (one that is not cancelled) always sees their wire details and e-sign link on this page, even after the offering is Closed, so they can still finish signing and wiring.
- **My holdings.** Shows the investor's subscription, its status (requested, accepted, signed, funded) and their wire reference.
- **Admin dashboard** (`/admin`, protected by the admin code):
  - **Phase:** Preview, Open or Closed, plus the close date. Open is refused until every document is verified on the server (and, in production, none is a placeholder).
  - **Investors:** add a person with name, email and a note on how we know them; see each person's personal link, progress and status.
  - **Status actions:** Accept, Mark signed, Mark funded, the matching Undo buttons, Cancel and Restore. Steps must go in order. The 35 non-accredited investor limit is enforced when accepting.
  - **Totals:** units sold and remaining, units that would go to the partner if closed now, non-accredited count against the limit of 35, dollars committed and received, interest, and investors by state (for state notice filings).
  - **Form D clock:** the date of the first accepted subscription and the due date 15 days later.
  - **Exports:** investors CSV and acknowledgments CSV. These contain personal details and IP addresses, so store them securely.
- **Playwright tests.** 17 automated browser tests covering access control, the full investor flow, the admin dashboard and the business rules (phase rules, the units cap, status order, the 35 limit, changed documents, revoked links, cookie tampering, one investor not being able to touch another's records).
- **Data layer on SQLite.** All data lives in one file, `data/vaulted.db`. Every page and action goes through a small set of data functions in `src/data`, so the database can be swapped later without rewriting the pages.

## 2. Environment variables

These settings live in a file called `.env.local` in the `vaulted-app` folder. That file is ignored by git (it is never committed), so it must be created again by hand on the server.

| Name | What it does |
|---|---|
| `SESSION_SECRET` | The secret used to sign login cookies. Must be at least 32 characters. If it is missing or too short, nobody can log in. Changing it logs everyone out (investor links keep working, they just log in again). |
| `ADMIN_CODE` | The code typed on `/admin` to get into the dashboard. If it is missing, admin login always fails. |
| `DATABASE_PATH` | Where the database file lives. Defaults to `./data/vaulted.db` if not set. |
| `DOCUMENTS_DIR` | Optional. The folder where the offering PDFs live. Defaults to `./private/documents` if not set. The tests use `./data/test-documents` automatically, so you never set this for them. |
| `NODE_ENV` | Set automatically: `development` under `pnpm dev`, `production` under `pnpm start`. Cookies are marked Secure (sent only over HTTPS) only in production. You do not put this in `.env.local`. |

To make fresh values (do this for the server; never reuse the local ones):

```
openssl rand -base64 48    # use as SESSION_SECRET
openssl rand -base64 24    # use as ADMIN_CODE
```

Then write them into `.env.local` like this:

```
SESSION_SECRET=<paste the first value>
ADMIN_CODE=<paste the second value>
DATABASE_PATH=./data/vaulted.db
```

## 3. Run locally

```
pnpm install
pnpm seed --with-demo-investor --placeholder-docs
pnpm dev
```

- `pnpm install` downloads the libraries the app needs. Run it once, and again whenever `package.json` changes.
- `pnpm seed --with-demo-investor --placeholder-docs` builds the database and loads the offering content (see section 4). `--placeholder-docs` writes simple stand-in PDFs into `private/documents` for any document that has no file yet, so the offering can be opened while testing. Real PDFs are never overwritten. `--with-demo-investor` creates a test investor (`demo@example.com`) and prints their invite link at the end, for example `Demo invite (demo@example.com): http://localhost:3000/invest/i/...`.
- `pnpm dev` starts the site at `http://localhost:3000`. Leave it running.
- Open the printed invite link in a browser. You are now logged in as the demo investor and see the offering. (The printed link assumes port 3000. If `pnpm dev` says it is on another port, change the number in the link.)
- Open `http://localhost:3000/admin` and type the `ADMIN_CODE` from `.env.local`. The admin login lasts 12 hours.

Note: an invite link can be opened at most 10 times per 15 minutes from the same address. If you click it a lot while testing and it stops working, wait 15 minutes.

There are also site-wide caps: 300 invite link attempts and 100 admin login attempts per 15 minutes, across all visitors together. The per-address limit is checked first, and only attempts that pass it count toward the site-wide cap. So one address hammering the site gets blocked on its own and cannot use up the cap for everyone else.

## 4. Migrations and seed

- `pnpm db:generate`: only needed after someone changes the database layout in `src/db/schema.ts`. It writes a new migration file into `drizzle/`, which should be committed.
- `pnpm db:migrate`: applies any migrations the database does not have yet. Safe to run any time. `pnpm seed` and `pnpm docs:sync` also do this first. The website itself does not run migrations when it starts, so after an update on the server run `pnpm db:migrate` (or `pnpm seed`) before restarting.
- `pnpm seed`: can be run as often as you like. Each run:
  - Updates the offering's text and numbers from the content file (name, overview, price, unit counts, key terms, how it works, how you get paid, provenance, custody, risks, FAQ, contact email, wire details, e-sign link, legal line, legend) and **the close date**. If you set the close date in admin and then re-seed, the seed puts back whatever the content file says. So either put the close date in the content file, or set it in admin only after the last seed.
  - Deletes and reloads the items (gallery), comparable sales, documents list and updates.
  - Keeps the **phase** as it is.
  - Never touches investors, questionnaires, acknowledgments, interest or subscriptions.
  - Copies every image the items in `offering.json` point to (svg, jpg, jpeg, png, webp or avif) from `../vaulted-landing/invest/images/` into `public/offerings/<code>/`. To copy from a different folder, add `--images <folder>`, for example `pnpm seed --images ~/Desktop/final-photos`. An image that is not in that folder but is already in `public/offerings/<code>/` is kept. If an image is in neither place, the seed stops before changing anything and lists the missing file names.
  - Checks each document file and prints a summary.

Where the content comes from today: `../vaulted-landing/functions/invest/_content/offering.json` (and `updates.json` next to it for the updates list). To change anything investors read, edit that file, then run `pnpm seed`. No code change is needed.

## 5. Invite the first investor and open admin

1. Go to `/admin` and enter the admin code.
2. Scroll to **Add investor**. Enter their name, email and **How we know them** (for example "college roommate of Charles, known since 2012"). This note is our legal record of the existing relationship, so fill it in properly. Click **Add investor**.
3. They now appear in the **Investors** table with their personal link. Click **Copy** next to the link. This Copy button is the only sharing control in the whole app; investors have no share, refer or copy buttons.
4. Send the link to that person yourself, directly (email or text to them only). Each link is personal. Do not send one link to two people.
5. The table shows their progress (viewed, interested, questionnaire, acknowledged, subscribed) and their status. When they subscribe, use **Accept**, then **Mark signed** once the subscription agreement is signed, then **Mark funded** once the wire arrives. Each has an **Undo** that steps back one stage. **Cancel** sets a subscription aside and **Restore** brings it back exactly as it was.
6. To cut someone off: in their row, click **Revoke link**, read the warning, then **Confirm revoke**. Their link and any open session stop working immediately. This cannot be undone; if needed, add them again as a new investor.
7. Set the phase at the top of the page: **Preview** (they can look and register interest), **Open** (questionnaire and subscribe) or **Closed** (nothing can be submitted). Click **Save phase**.

## 6. Documents

1. Look in `offering.json` under `documents`. Each has a `path` such as `/invest/documents/offering-memorandum.pdf`. The file name at the end (`offering-memorandum.pdf`) is the name the file must have.
2. Put each PDF into `private/documents/` (or the folder set in `DOCUMENTS_DIR`, section 2) with exactly that name.
3. Run `pnpm docs:sync`. It fingerprints each file and prints which ones are verified and which are missing.
4. In `/admin`, the **Documents on the server** box shows each document as **Verified**, **File missing**, **File missing or not synced** or **File changed since last sync**.
5. The offering cannot be set to Open until every document is verified. Investors cannot confirm the documents or subscribe unless every document is verified either.

**Placeholder PDFs.** The stand-in PDFs made by `pnpm seed --placeholder-docs` contain the text "PLACEHOLDER, NOT AN OFFERING DOCUMENT". In admin they show as **Placeholder, not a real document**. **All documents must be real in production.** On the live server (production), if even one document is a placeholder, the offering cannot be set to Open, investors cannot confirm the documents, and nobody can subscribe, even if the offering was already set to Open earlier. Investors see a plain message that the final documents are not ready yet. Placeholders are only for testing on your own computer.

Action needed on this computer: the three placeholder PDFs now in `private/documents/` (`offering-memorandum.pdf`, `operating-agreement.pdf`, `subscription-agreement.pdf`) were made before this marker text existed, so the app cannot tell they are placeholders. Either delete those three files and run `pnpm seed --placeholder-docs` again, which makes new, marked ones and fingerprints them, or replace them with the real PDFs and run `pnpm docs:sync`.

Changing a PDF: if you replace a file, run `pnpm docs:sync` again. Until you do, the admin shows "File changed since last sync" and investors cannot acknowledge. After you do, every earlier acknowledgment no longer counts: investors see the documents marked as updated and must confirm again before they can subscribe. This is deliberate, so our records show which versions each investor saw. Also update the `version` and `date` in `offering.json` and re-seed, so investors can see what changed. (`docs:sync` never changes version or date.)

The `private/documents` folder is ignored by git; the PDFs must be copied to the server separately.

## 7. Tests, lint, typecheck

- `pnpm test` runs the browser tests. There are 18 tests. It starts its own copy of the site on port 3100 using its own database, `data/test.db`, its own documents folder, `data/test-documents`, and its own fixed secrets, so it never touches your real data or your real PDFs. The test documents folder is created at the start of the run and deleted at the end. Do not run `pnpm dev` in the same folder at the same time: both use Next.js's build folder and will interfere. Stop `pnpm dev` first. The tests take a few minutes and run one at a time.
- `pnpm lint` checks the code for common mistakes.
- `pnpm typecheck` checks the code's types.

All three should pass before any change is deployed.

## 8. Deployment notes

- **Server type.** This is a normal Node.js website, not a static site. On the server: `pnpm install`, create `.env.local` (section 2), `pnpm db:migrate`, `pnpm seed`, `pnpm docs:sync`, `pnpm build`, then `pnpm start` (keep it running with a process manager).
- **Persistent disk.** `data/` (the database) and `private/documents/` (the PDFs) must be on storage that survives restarts and redeploys. If they are wiped, every investor record is lost.
- **Exactly one reverse proxy.** The app must sit behind exactly one reverse proxy (for example Caddy, nginx or a load balancer) that adds the visitor's address to the `x-forwarded-for` header. The app trusts only the last (rightmost) entry in that header as the visitor's IP. Direct access to the app's own port must be blocked (firewall), so no one can reach it without going through the proxy. Otherwise the IP addresses in our records and the rate limits can be faked.
- **HTTPS is required.** In production the login cookies are marked Secure, so browsers only send them over HTTPS. Without HTTPS, nobody can stay logged in.
- **Domain:** `app.onvaulted.com`.
- **Search engines.** `robots.txt` tells search engines to stay out of `/invest` and `/admin`, and every page under them also carries a `noindex, nofollow` instruction. The public home page of this app has no link to either.
- **Backups.** Back up `data/vaulted.db` regularly (daily at least, and before every deploy). It is the evidence file: acknowledgments, questionnaires, timestamps and IPs. Keep the backup private. Also keep a copy of the final PDFs.

## 9. Later changes

**Moving to Postgres later.** Change the database driver in `src/db/client.ts` and the dialect in `drizzle.config.ts` and `src/db/schema.ts`, then generate fresh migrations with `pnpm db:generate`. Remove the write queue in `src/data/executor.ts` (and the `serializeWrite` helper it uses in `src/db/client.ts`); it only exists because SQLite allows one writer at a time. The functions in `src/data` keep the same names and inputs, so pages and actions do not change. Existing data would need a one-time copy from the SQLite file.

**Moving to hosted auth later.** Replace the `SessionProvider` implementation in `src/lib/session.ts` (today it is `hmacSessionProvider`, a signed cookie). `requireInvestor()` stays the only way pages and actions check who is logged in, so nothing else needs to change. The `investorOfferings` table remains the record of which investor may see which offering.

## 10. Placeholders still to fill

None of these were invented. Each is still "TBD" or example content and must be filled in by Charles before any real invite is sent.

| Placeholder | Where it lives |
|---|---|
| Ownership split | `offering.json`: `key_terms` ("Partner units retained", "Vaulted units") and the overview text |
| Setup fee | `offering.json`: add or edit a `key_terms` entry; also the offering documents |
| Raise size and unit counts | `offering.json`: `key_terms` entries labelled exactly **Total units** (`totalUnits`), **Investor units offered** (`investorUnitsOffered`), **Partner units retained** (`partnerUnits`), **Vaulted units** (`vaultedUnits`). The seed reads a number from these only when the value is a plain whole number such as `10000` or `10,000`. Anything else (like "TBD" or a sentence) stays empty. The "Vaulted units" value is currently a sentence, so it must become a number. Investors can only subscribe up to **Investor units offered**, so this must be set before opening. Also `stats.offering_value_usd` and `stats.units_offered` for the page stats. |
| Hold period | `offering.json`: `key_terms` "Expected hold" |
| Management fee amount | `offering.json`: `key_terms` "Management fee" |
| Close date | `offering.json`: `stats.close_date` as `YYYY-MM-DD`, or in admin (see the re-seed warning in section 4) |
| Real items and images | `offering.json`: `items` (title, photographer, year, description, estimate, image, caption). Image files (svg, jpg, jpeg, png, webp or avif) go in `../vaulted-landing/invest/images/`, or any folder passed with `pnpm seed --images <folder>`, and are copied on seed. The seed stops and lists any image it cannot find (section 4). Also replace `name`, `overview`, `provenance`, `custody`. |
| Comparable sales | `offering.json`: `comps` |
| Documents and versions | `offering.json`: `documents` (title, path, version, date), plus the real PDFs in `private/documents/` (section 6). Every document must be the real PDF: on the live server a single placeholder blocks opening, confirming documents and subscribing. |
| E-sign URL | `offering.json`: `esign_url` (currently an example.com placeholder) |
| Wire details | `offering.json`: `wire` (bank name, account name, account number, routing number, instructions) |
| Contact email | `offering.json`: `contact_email`, and the FAQ answer that mentions it (both currently `hello@onvaulted.com`) |
| Updates | `updates.json` next to `offering.json` |

After any edit: `pnpm seed`. Phase and close date are the only offering settings changed in admin.

## 11. Known limits and open points

- **One offering at a time.** The site always shows the offering returned by `getCurrentOffering()` in `src/data/offerings.ts` (today, the first one in the database). The tables already support several offerings; supporting a second one means changing that one function and adding a way to pick.
- **One subscription per investor per offering.** If a subscription is cancelled, the investor cannot submit a new one. To bring it back, use **Restore** in admin. To change the number of units, cancel and restore is not enough; that would need a manual database change or a small feature.
- **The documents acknowledgment needs JavaScript** in the investor's browser. Without it, the confirm button does not work. Almost every browser has it on.
- **Single process.** SQLite writes go through a queue inside one running app. Run exactly one copy of the app. Running two copies against the same database file is not supported.
- **Tests share one database.** All tests use `data/test.db` (and `data/test-documents` for PDFs) and run one after another. They cannot run in parallel, and `pnpm dev` must not be running in the same folder.
- **Notes from DECISIONS.md (11 to 18):**
  - (11) The write queue exists because the SQLite driver froze when two writes happened at once. It goes away with Postgres.
  - (12, superseded by 18) Opening, acknowledging and subscribing all need every document verified, and in production none may be a placeholder. Run `pnpm docs:sync` after dropping in the final PDFs.
  - (13) Re-seeding overwrites the close date from the content file. Set the close date in admin only after the final seed, or set it in the content file.
  - (14) A cancelled subscription cannot be replaced by a new one; admin uses Restore.
  - (15) Admin success and error messages appear next to the button you pressed, not in the page address. Revoke asks for a second click to confirm.
  - (16) The CSV exports count toward the same admin limit as admin actions: 120 per 15 minutes per address.
  - (17) The documents folder can be changed with `DOCUMENTS_DIR`; tests use their own folder. Placeholder PDFs are marked, flagged in admin and cannot open the offering in production.
  - (18) In production every document must be real: one placeholder blocks opening, confirming documents and subscribing. `pnpm seed --images <folder>` copies item images from another folder, and the seed stops with a list of any image it cannot find.
