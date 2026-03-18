# LOT 2 Compatibility Notes (legacy -> V2)

This migration is intentionally incremental and non-destructive.

## What stays for compatibility
- Legacy tables remain (`profiles`, `dogs`, `scans`) and are **extended** (not replaced).
- Legacy columns used by existing mobile code are kept (e.g. `scan_mode`, `context`, `body_language`, `hypotheses`, `is_bark`).

## What is added for V2
- New V2 columns on existing tables (`mode`, `context_json`, `hypotheses_json`, etc.).
- New V2 tables:
  - `scan_features`
  - `dog_voice_profile`
  - `scan_state_scores`
  - `recurring_patterns`
  - `user_feedback_events`

## Data backfill choices
- V2 columns are backfilled from legacy columns when possible.
- Existing rows are preserved.

## RLS model
- Direct ownership tables: policy by `auth.uid() = user_id` (or `id` for profile).
- Relational ownership tables: policy via `EXISTS` checks against owned `dogs`/`scans`.
- No permissive “allow all authenticated users” policy is added.

## Deferred to LOT 3+
- Real IA server workflow and endpoint wiring.
- Client migration to consume V2-only fields everywhere.
