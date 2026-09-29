# DECISIONS

1. SQLite driver is `@libsql/client` rather than `better-sqlite3` because pnpm 10 blocks native postinstall builds by default; libsql ships prebuilt binaries and Drizzle supports it with the same query API, so Postgres later is still a driver swap.
2. Next 16 renamed middleware to `proxy.ts`; we use `proxy.ts` for the `/invest` and `/admin` guard and re-verify sessions server side in every page (defense in depth and immediate revocation).
3. Rate limits are stored in the `rateLimits` table rather than memory so they survive restarts and a later multi-instance deploy.
4. The marketing site work in `../vaulted-landing` (Cloudflare Pages version of this feature) was stopped after its admin piece; this Next.js app supersedes it. The landing repo's PROGRESS.md records where it stopped.
5. Codex plan review: all seven findings accepted (admin cookie substitution, requireInvestor on every action, 35 cap across transitions, document integrity, forwarded-header trust, investor-to-offering access, public enter page under the guarded layout). Two are scoped: document content digests are computed at seed or docs:sync time rather than on every request, and the IP trust rule is "rightmost x-forwarded-for behind one trusted proxy" plus global attempt caps rather than a full proxy topology.
6. The 35 non-accredited cap counts accepted, non-cancelled subscriptions whose questionnaire says sophisticated, and is enforced on set_accepted and uncancel inside one transaction.
7. shadcn's generated `cn` package was removed in favour of clsx + tailwind-merge in src/lib/utils.ts, as PLAN.md lists; any future `shadcn add` will import from "cn" again and needs the same one-line fix. shadcn itself stays a runtime dependency because globals.css imports its tailwind preset.
8. The site has no error color, so one brick red (#9b2c1f) was added for form errors and destructive states. It is the only color outside the marketing tokens and is never used for status, which keeps gold-on-light as the single accent.
9. shadcn's "muted" is a background token (cream-deep); muted text is text-muted-foreground. Dark mode is disabled by tying dark variants to a class that is never set.
10. Next 16's agentRules feature injected a block into AGENTS.md on first dev run; it is disabled in next.config.ts so AGENTS.md stays the two lines the brief specifies.
11. SQLite write serialization: the libsql driver blocks the event loop while waiting for the write lock, so two concurrent write transactions deadlocked in one process. All data-layer writes now pass through a small in-process write queue (src/data/executor.ts). It disappears with a move to Postgres.
12. Opening an offering requires at least one verified document rather than all of them; acknowledgment requires every document file to verify. Charles should run `pnpm docs:sync` after dropping the final PDFs.
13. Re-seeding overwrites closeDate from the source content; set the close date in admin only after the final seed, or set it in the source file.
14. Cancelled subscriptions cannot be replaced by a new one (one row per investor per offering); admin restores with uncancel.
15. Admin notices are returned action state rather than URL params; revoke uses a two-step details confirm with no extra client code.
16. Exports are GET route handlers and now share the admin rate limit (`admin:<ip>`, 120 per 15 minutes) with admin writes.
