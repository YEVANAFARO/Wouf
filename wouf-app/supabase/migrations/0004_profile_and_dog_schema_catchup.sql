-- Runtime catch-up for frontend profile + onboarding dog payloads.
-- Purpose: align older Supabase projects with the columns/RPCs used by the
-- current frontend without requiring destructive changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coins_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles
  ALTER COLUMN xp SET DEFAULT 0,
  ALTER COLUMN level SET DEFAULT 1,
  ALTER COLUMN streak SET DEFAULT 0,
  ALTER COLUMN coins SET DEFAULT 0,
  ALTER COLUMN total_coins_earned SET DEFAULT 0,
  ALTER COLUMN last_active SET DEFAULT CURRENT_DATE,
  ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE public.profiles
SET email = COALESCE(email, NULL),
    phone = COALESCE(phone, NULL),
    postal_code = COALESCE(postal_code, NULL),
    city = COALESCE(city, NULL),
    xp = COALESCE(xp, 0),
    level = COALESCE(level, 1),
    streak = COALESCE(streak, 0),
    coins = COALESCE(coins, 0),
    total_coins_earned = COALESCE(total_coins_earned, 0),
    last_active = COALESCE(last_active, CURRENT_DATE),
    updated_at = COALESCE(updated_at, NOW());

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS neutered TEXT,
  ADD COLUMN IF NOT EXISTS birth_mode TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS birth_month INTEGER,
  ADD COLUMN IF NOT EXISTS birth_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS breed_mode TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS physical_specs TEXT[],
  ADD COLUMN IF NOT EXISTS housing TEXT,
  ADD COLUMN IF NOT EXISTS garden TEXT,
  ADD COLUMN IF NOT EXISTS alone_time TEXT,
  ADD COLUMN IF NOT EXISTS other_animals TEXT,
  ADD COLUMN IF NOT EXISTS noise_level TEXT,
  ADD COLUMN IF NOT EXISTS fav_treats TEXT,
  ADD COLUMN IF NOT EXISTS fav_toys TEXT,
  ADD COLUMN IF NOT EXISTS fav_activities TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.dogs
  ALTER COLUMN birth_reminder SET DEFAULT TRUE,
  ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE public.dogs
SET updated_at = COALESCE(updated_at, NOW());

DROP TRIGGER IF EXISTS trg_dogs_set_updated_at ON public.dogs;
CREATE TRIGGER trg_dogs_set_updated_at
BEFORE UPDATE ON public.dogs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.add_xp(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_needed INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_coins_earned INTEGER;
BEGIN
  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  v_new_xp := COALESCE(v_profile.xp, 0) + COALESCE(p_amount, 0);
  v_new_level := COALESCE(v_profile.level, 1);
  v_xp_needed := v_new_level * 200;

  WHILE v_new_xp >= v_xp_needed LOOP
    v_new_xp := v_new_xp - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := v_new_level * 200;
    v_leveled_up := TRUE;
  END LOOP;

  v_coins_earned := FLOOR(COALESCE(p_amount, 0) / 3.0);

  UPDATE public.profiles
  SET xp = v_new_xp,
      level = v_new_level,
      coins = COALESCE(coins, 0) + v_coins_earned,
      total_coins_earned = COALESCE(total_coins_earned, 0) + v_coins_earned,
      last_active = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'xp', v_new_xp,
    'level', v_new_level,
    'coins_earned', v_coins_earned,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last DATE;
  v_streak INTEGER;
BEGIN
  SELECT last_active, COALESCE(streak, 0)
  INTO v_last, v_streak
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_last = CURRENT_DATE THEN
    RETURN v_streak;
  ELSIF v_last = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE public.profiles
  SET streak = v_streak,
      last_active = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
