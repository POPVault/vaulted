# DECISIONS

1. SQLite driver is `@libsql/client` rather than `better-sqlite3` because pnpm 10 blocks native postinstall builds by default; libsql ships prebuilt binaries and Drizzle supports it with the same query API, so Postgres later is still a driver swap.
2. Next 16 renamed middleware to `proxy.ts`; we use `proxy.ts` for the `/invest` and `/admin` guard and re-verify sessions server side in every page (defense in depth and immediate revocation).
3. Rate limits are stored in the `rateLimits` table rather than memory so they survive restarts and a later multi-instance deploy.
4. The marketing site work in `../vaulted-landing` (Cloudflare Pages version of this feature) was stopped after its admin piece; this Next.js app supersedes it. The landing repo's PROGRESS.md records where it stopped.
5. Codex plan review: all seven findings accepted (admin cookie substitution, requireInvestor on every action, 35 cap across transitions, document integrity, forwarded-header trust, investor-to-offering access, public enter page under the guarded layout). Two are scoped: document content digests are computed at seed or docs:sync time rather than on every request, and the IP trust rule is "rightmost x-forwarded-for behind one trusted proxy" plus global attempt caps rather than a full proxy topology.
6. The 35 non-accredited cap counts accepted, non-cancelled subscriptions whose questionnaire says sophisticated, and is enforced on set_accepted and uncancel inside one transaction.
