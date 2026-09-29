# Vaulted investor area: context for every agent working on this repo

## What Vaulted is
Vaulted is an alternative investment platform for collectibles. It lets people invest in and own a piece of high-value collectibles they could not afford whole. Owned by Shushu Holdings, Ltd. Public site: onvaulted.com (this repo). Vaulted serves the investor; sister platform POP Vault serves the collector.

## What this build is
A private, invite-only area under /invest for Vaulted's first offering, one collection sold under Reg D Rule 506(b) to friends, family, and sophisticated investors we already know. It is the MVP that proves the model before larger offerings. Everything here must be reusable for the next offering with content changes only.

## Precedents we follow
Rally (rallyrd.com) for the offering page: stats block, story, comps, FAQ, one buy flow, and a preview state before an offering opens. Yieldstreet for private placements: the offering page is a summary, documents are gated behind login, and every page states the offering is made only by the offering memorandum. Masterworks for economics: one LLC per collection, fee plus 20% of profit, the manager decides sale timing. Design: Masterworks for warmth, Robinhood for clarity.

## The deal structure
- One single-purpose Delaware LLC holds the collection and liquidates it. Items may be sold individually during the hold. No reinvestment of proceeds. The manager decides sale timing.
- The asset partner contributes the collection to the LLC and receives units. The LLC sells Class A units to investors at $100 each and uses the proceeds to redeem the partner's units at the same price. Unsold units stay with the partner. No minimum raise.
- Vaulted buys 2% of the units in cash at the same price as investors.
- The LLC acquires the collection at the same value investors buy in at. No markup.
- Fees: setup fee is a percentage of appraised value (rate open). Management fee paid in cash at sale, not yearly. Vaulted takes 20% of realized profit after costs, no hurdle. No Vaulted Direct fee on this deal. Vaulted absorbs cost overruns on deal one.
- Open items decided by Charles, never by agents: ownership split, setup fee rate, raise size, hold period, close date. Placeholders only.

## The legal constraints that shape the product
- 506(b) means no general solicitation. The public site never links to, mentions, or hints at the offering. Search engines never index /invest. No share or referral features; an investor forwarding a link is solicitation.
- Every investor must have a pre-existing relationship with us. Personal invite links plus a relationship note on each invite are our record.
- Up to 35 non-accredited investors are allowed and they must be sophisticated. They must receive the offering documents before they buy. The documents acknowledgment before Subscribe exists for this reason, and it records which document versions they saw.
- Investors self-certify accredited or sophisticated status. No third-party verification for 506(b).
- Bad-actor confirmation is required from each investor.
- Investors must have the chance to ask questions and get answers. The FAQ and contact line cover this.
- State of residence is needed for post-Form D state notice filings. Form D is due 15 days after the first sale.
- Timestamps and IPs on acknowledgments and submissions are our evidence file.
- Investors are told in writing not to forward or share. The footer legend is that instruction.
- Units are restricted securities with no resale market. Say so in the risks.

## Product principles
- KISS. If it is not needed for one offering to close, it is out.
- Plain language for investors. Our audience is not fintech savvy.
- Same design as the public site: cream, green, serif. Mobile first.
- The photographs are the product. The gallery is the centerpiece. Numbers are the product everywhere else: tabular figures, consistent formatting, one accent color for status.
- Every form has validation, disabled, loading, and success states. Every table has an empty state. Status is always visible.
- No accounts, no passwords, no online payments, no e-sign integration. Wire transfer plus a link out to a hosted e-sign service.
- Content in offering.json and an images folder. Code never contains deal-specific text or numbers.

## What reviewers should attack
- Any way to reach offering content without a valid invite.
- Any leak from /invest to the public site, sitemap, robots, or search engines.
- Any path where an investor could subscribe without acknowledging the current documents, or during the wrong phase.
- Data exposure in admin or endpoints, injection, missing rate limits.
- Anything that breaks at phone width, looks unlike the public site, or would not be trusted with money.
- Over-building. Flag features that do not serve one offering closing.

## What reviewers should not suggest
- Accounts, passwords, OAuth, magic-link email login.
- Payment processing, escrow, KYC or accreditation verification services.
- Frameworks, build steps, npm dependencies.
- Changes to existing files in functions/, _headers, or schema.sql.
- Marketing, sharing, or anything visible on the public site.

## Stack
- Next.js App Router, TypeScript strict, Tailwind, shadcn/ui components. Server components by default; client components only where interaction requires it.
- Database: SQLite file at ./data/vaulted.db (gitignored) through Drizzle ORM, schema in one place, migrations generated with drizzle-kit and committed. All database access in a small data layer so switching to Postgres later is a driver change, not a rewrite. No raw SQL in pages.
- Auth: personal invite links (/invest/i/<token>). A valid token sets a signed, httpOnly session cookie (7-day expiry, signed with a secret from .env.local) tied to that investor. Middleware protects /invest and /admin. Admin is a separate admin code and cookie. Rate-limit token attempts. The session layer is designed so it can be replaced by a hosted auth provider later.
- All writes go through server actions or route handlers with Zod validation. No client-side trust.
- Documents (PDFs) live in ./private/documents (gitignored except a placeholder) and are served only by a route handler that checks the session. Images in /public.
- Design tokens in the Tailwind theme taken from ../vaulted-landing's stylesheet (cream, green, serif headings, same fonts via next/font). shadcn components themed to those tokens once, reused everywhere. No one-off styling.
- Playwright smoke tests: unauthenticated user cannot see offering content, subscribe locked until documents acknowledged, units capped at remaining, admin toggle updates My holdings.
- Every /invest page gets noindex, nofollow. No share, refer, or copy-link buttons anywhere. Confidentiality footer legend and log out link on every page.
- Timestamp and IP recorded on every acknowledgment, questionnaire, interest, and subscription.
- Commit after each working piece with clear messages; push to origin main after each commit.
- KISS. Never invent deal numbers; placeholders where CONTEXT.md marks something open.
