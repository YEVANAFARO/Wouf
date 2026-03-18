# Supabase migrations (versioned)

This directory is now the source of truth for schema evolution.

Conventions:
- One SQL file per migration with sortable prefix:
  - `0000_description.sql`
  - `0001_description.sql`
- Never edit applied migration files; add a new one instead.
- Keep `database.sql` as legacy audit reference only.

Planned next step (LOT 2):
- Add first V2 migration aligned with `docs/specs/DATABASE_V2_SPEC.md`.
