-- LOT 2 — V2 schema incremental migration
-- Source spec: docs/specs/DATABASE_V2_SPEC.md
-- Strategy:
-- 1) non-destructive additions/normalization for existing legacy tables
-- 2) create missing V2 tables
-- 3) strict RLS per ownership (direct user_id or dog/scan relational ownership)
-- 4) useful indexes + updated_at triggers

BEGIN;

-- ---------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- profiles (extend legacy -> V2)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_month INTEGER,
  ADD COLUMN IF NOT EXISTS birth_year INTEGER,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founder_status TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS beta_priority_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_birth_month_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_birth_month_check CHECK (birth_month BETWEEN 1 AND 12 OR birth_month IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_plan_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'plus', 'pro'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- RLS hardening (explicit + non-permissive)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- dogs (extend legacy -> V2)
-- ---------------------------------------------------------------------
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS breed_primary TEXT,
  ADD COLUMN IF NOT EXISTS breed_secondary TEXT,
  ADD COLUMN IF NOT EXISTS personality_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trigger_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS health_flags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill compatibility from legacy fields where possible
UPDATE public.dogs
SET age_years = GREATEST(0, EXTRACT(YEAR FROM CURRENT_DATE)::INT - birth_year)
WHERE age_years IS NULL AND birth_year IS NOT NULL;

UPDATE public.dogs
SET breed_primary = COALESCE(breed_primary, breed)
WHERE breed IS NOT NULL;

UPDATE public.dogs
SET breed_secondary = COALESCE(breed_secondary, mix_breeds[1])
WHERE mix_breeds IS NOT NULL AND array_length(mix_breeds, 1) > 0;

UPDATE public.dogs
SET personality_tags = to_jsonb(personality)
WHERE (personality_tags = '[]'::jsonb OR personality_tags IS NULL) AND personality IS NOT NULL;

UPDATE public.dogs
SET trigger_tags = to_jsonb(triggers)
WHERE (trigger_tags = '[]'::jsonb OR trigger_tags IS NULL) AND triggers IS NOT NULL;

UPDATE public.dogs
SET health_flags = to_jsonb(health_signs)
WHERE (health_flags = '[]'::jsonb OR health_flags IS NULL) AND health_signs IS NOT NULL;

ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own dogs" ON public.dogs;

CREATE POLICY dogs_select_own ON public.dogs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY dogs_insert_own ON public.dogs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY dogs_update_own ON public.dogs
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY dogs_delete_own ON public.dogs
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dogs_user_active_created ON public.dogs(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dogs_breed_primary ON public.dogs(breed_primary);

DROP TRIGGER IF EXISTS trg_dogs_set_updated_at ON public.dogs;
CREATE TRIGGER trg_dogs_set_updated_at
BEFORE UPDATE ON public.dogs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- scans (extend legacy -> V2)
-- ---------------------------------------------------------------------
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration INTEGER,
  ADD COLUMN IF NOT EXISTS bark_detected BOOLEAN,
  ADD COLUMN IF NOT EXISTS context_json JSONB,
  ADD COLUMN IF NOT EXISTS body_json JSONB,
  ADD COLUMN IF NOT EXISTS top_hypothesis TEXT,
  ADD COLUMN IF NOT EXISTS hypotheses_json JSONB,
  ADD COLUMN IF NOT EXISTS selected_hypothesis TEXT,
  ADD COLUMN IF NOT EXISTS confidence_top NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS vet_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corrected_label TEXT;

-- Backfill from legacy columns
UPDATE public.scans
SET mode = COALESCE(mode, scan_mode)
WHERE mode IS NULL;

UPDATE public.scans
SET audio_duration = COALESCE(audio_duration, audio_duration_ms)
WHERE audio_duration IS NULL;

UPDATE public.scans
SET bark_detected = COALESCE(bark_detected, is_bark)
WHERE bark_detected IS NULL;

UPDATE public.scans
SET context_json = COALESCE(context_json, context)
WHERE context_json IS NULL;

UPDATE public.scans
SET body_json = COALESCE(body_json, body_language)
WHERE body_json IS NULL;

UPDATE public.scans
SET hypotheses_json = COALESCE(hypotheses_json, hypotheses)
WHERE hypotheses_json IS NULL;

UPDATE public.scans
SET corrected_label = COALESCE(corrected_label, correction_emotion)
WHERE corrected_label IS NULL;

UPDATE public.scans
SET confidence_top = COALESCE(
  confidence_top,
  NULLIF((hypotheses_json -> 0 ->> 'confidence'), '')::numeric
)
WHERE confidence_top IS NULL AND hypotheses_json IS NOT NULL;

UPDATE public.scans
SET top_hypothesis = COALESCE(top_hypothesis, hypotheses_json -> 0 ->> 'category')
WHERE top_hypothesis IS NULL AND hypotheses_json IS NOT NULL;

UPDATE public.scans
SET selected_hypothesis = COALESCE(
  selected_hypothesis,
  CASE
    WHEN validated_hypothesis IS NOT NULL AND hypotheses_json IS NOT NULL
      THEN hypotheses_json -> validated_hypothesis ->> 'category'
    ELSE NULL
  END
)
WHERE selected_hypothesis IS NULL;

ALTER TABLE public.scans
  ALTER COLUMN mode SET DEFAULT 'quick',
  ALTER COLUMN bark_detected SET DEFAULT TRUE,
  ALTER COLUMN validated SET DEFAULT FALSE;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own scans" ON public.scans;

CREATE POLICY scans_select_own ON public.scans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY scans_insert_own ON public.scans
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY scans_update_own ON public.scans
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY scans_delete_own ON public.scans
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scans_user_dog_created_at ON public.scans(user_id, dog_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_mode ON public.scans(mode);
CREATE INDEX IF NOT EXISTS idx_scans_vet_flag ON public.scans(vet_flag);
CREATE INDEX IF NOT EXISTS idx_scans_bark_detected ON public.scans(bark_detected);

-- ---------------------------------------------------------------------
-- scan_features (new V2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  peak_freq NUMERIC,
  spectral_centroid NUMERIC,
  spectral_rolloff NUMERIC,
  rms_energy NUMERIC,
  zcr NUMERIC,
  low_band_energy NUMERIC,
  mid_band_energy NUMERIC,
  high_band_energy NUMERIC,
  bark_rate NUMERIC,
  burst_count INTEGER,
  mfcc_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY scan_features_select_own ON public.scan_features
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = scan_features.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY scan_features_insert_own ON public.scan_features
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = scan_features.dog_id
      AND d.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.scans s
    WHERE s.id = scan_features.scan_id
      AND s.user_id = auth.uid()
      AND s.dog_id = scan_features.dog_id
  )
);

CREATE POLICY scan_features_update_own ON public.scan_features
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = scan_features.dog_id
      AND d.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = scan_features.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY scan_features_delete_own ON public.scan_features
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = scan_features.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_scan_features_scan_id ON public.scan_features(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_features_dog_id ON public.scan_features(dog_id);

-- ---------------------------------------------------------------------
-- dog_voice_profile (new V2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dog_voice_profile (
  dog_id UUID PRIMARY KEY REFERENCES public.dogs(id) ON DELETE CASCADE,
  sample_count INTEGER NOT NULL DEFAULT 0,
  avg_peak_freq NUMERIC,
  avg_centroid NUMERIC,
  avg_rolloff NUMERIC,
  avg_rms NUMERIC,
  avg_zcr NUMERIC,
  avg_low_band NUMERIC,
  avg_mid_band NUMERIC,
  avg_high_band NUMERIC,
  avg_bark_rate NUMERIC,
  avg_burst_count NUMERIC,
  variance_json JSONB,
  profile_vector JSONB,
  reliability_level TEXT NOT NULL DEFAULT 'learning',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dog_voice_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY dog_voice_profile_select_own ON public.dog_voice_profile
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_voice_profile.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY dog_voice_profile_insert_own ON public.dog_voice_profile
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_voice_profile.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY dog_voice_profile_update_own ON public.dog_voice_profile
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_voice_profile.dog_id
      AND d.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_voice_profile.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY dog_voice_profile_delete_own ON public.dog_voice_profile
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_voice_profile.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_dog_voice_profile_reliability ON public.dog_voice_profile(reliability_level);

DROP TRIGGER IF EXISTS trg_dog_voice_profile_set_updated_at ON public.dog_voice_profile;
CREATE TRIGGER trg_dog_voice_profile_set_updated_at
BEFORE UPDATE ON public.dog_voice_profile
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- scan_state_scores (new V2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_state_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rank INTEGER,
  source_breakdown JSONB
);

ALTER TABLE public.scan_state_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY scan_state_scores_select_own ON public.scan_state_scores
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.scans s
    WHERE s.id = scan_state_scores.scan_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY scan_state_scores_insert_own ON public.scan_state_scores
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.scans s
    WHERE s.id = scan_state_scores.scan_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY scan_state_scores_update_own ON public.scan_state_scores
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.scans s
    WHERE s.id = scan_state_scores.scan_id
      AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.scans s
    WHERE s.id = scan_state_scores.scan_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY scan_state_scores_delete_own ON public.scan_state_scores
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.scans s
    WHERE s.id = scan_state_scores.scan_id
      AND s.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_scan_state_scores_scan_id ON public.scan_state_scores(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_state_scores_rank ON public.scan_state_scores(scan_id, rank);

-- ---------------------------------------------------------------------
-- recurring_patterns (new V2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  label TEXT NOT NULL,
  score NUMERIC,
  source_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_patterns_select_own ON public.recurring_patterns
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = recurring_patterns.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY recurring_patterns_insert_own ON public.recurring_patterns
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = recurring_patterns.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY recurring_patterns_update_own ON public.recurring_patterns
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = recurring_patterns.dog_id
      AND d.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = recurring_patterns.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY recurring_patterns_delete_own ON public.recurring_patterns
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = recurring_patterns.dog_id
      AND d.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_dog_id ON public.recurring_patterns(dog_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_pattern_type ON public.recurring_patterns(pattern_type);

DROP TRIGGER IF EXISTS trg_recurring_patterns_set_updated_at ON public.recurring_patterns;
CREATE TRIGGER trg_recurring_patterns_set_updated_at
BEFORE UPDATE ON public.recurring_patterns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_feedback_events (new V2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  selected_label TEXT,
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_feedback_events_select_own ON public.user_feedback_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_feedback_events_insert_own ON public.user_feedback_events
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.scans s
    WHERE s.id = user_feedback_events.scan_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY user_feedback_events_update_own ON public.user_feedback_events
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_feedback_events_delete_own ON public.user_feedback_events
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_events_scan_id ON public.user_feedback_events(scan_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_events_user_id ON public.user_feedback_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_events_created_at ON public.user_feedback_events(created_at DESC);

COMMIT;
