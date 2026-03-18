# Active vs Archive Scope

## Active code (only this is product scope)
- `App.js`
- `src/`
- `supabase/`
- Product docs used as source of truth:
  - `AGENTS.md`
  - `PRODUCT_SCOPE.md`
  - `BUILD_PLAN_BETA.md`
  - `docs/specs/*`

## Archive / legacy (read-only reference)
- `archive-assets/**`
- `docs/archive/**`
- `database.sql` (legacy schema to audit/migrate, not V2 target)

## Security rule
- No AI key and no server key in frontend code.
- Server-only secrets (e.g. `WOUF_SSK`, service role, AI keys) must stay in Supabase Edge Functions env.
