-- LOT 2 seed (minimal / safe)
-- Purpose: normalize defaults on existing records for beta readability.
-- No demo account or fake user data is created.

BEGIN;

UPDATE public.profiles
SET
  founder_status = COALESCE(founder_status, 'standard'),
  plan = COALESCE(plan, 'free'),
  referral_count = COALESCE(referral_count, 0),
  beta_priority_score = COALESCE(beta_priority_score, 0)
WHERE founder_status IS NULL
   OR plan IS NULL
   OR referral_count IS NULL
   OR beta_priority_score IS NULL;

UPDATE public.dog_voice_profile
SET reliability_level = COALESCE(reliability_level, 'learning')
WHERE reliability_level IS NULL;

COMMIT;
