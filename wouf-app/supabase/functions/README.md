# Supabase Edge Functions

This directory hosts server-side functions only.

Rules:
- Keep secrets server-side (`SUPABASE_URL`, `WOUF_SSK`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`).
- Do not expose server secrets to frontend.
- Return safe errors (no sensitive internals).

Current functions:
- `healthcheck/` : readiness + env presence checks (without exposing values)
- `interpret-scan/` : secure interpretation pipeline (dog/context/body/history/mode/audio metadata)
- `verify-audio/` : ambiguous bark/non-bark server-side verification
- `apply-referral/` : referral code application + founder tier update

Shared helpers:
- `_shared/serverEnv.ts` : server env availability flags
- `_shared/anthropic.ts` : centralized Anthropic request + JSON parsing helper
- `_shared/monetization.ts` : referral tiers and founder status resolver
