-- ═══════════════════════════════════════════════════════════
-- WOUF DATABASE SCHEMA — Supabase (Postgres)
-- Feature #8: Backend + Base de données
-- 
-- EXÉCUTER CE SQL DANS: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Active Row Level Security sur toutes les tables
-- Chaque user ne voit QUE ses propres données

-- ── PROFILES (infos user étendues) ─────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  phone TEXT,
  postal_code TEXT,
  city TEXT,
  referral_code TEXT UNIQUE DEFAULT ('WOUF-' || substr(md5(random()::text), 1, 6)),
  referred_by TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  last_active DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── DOGS (profil de chaque chien) ──────────────────────────
CREATE TABLE IF NOT EXISTS dogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  sex TEXT, -- 'Mâle' | 'Femelle'
  neutered TEXT, -- 'Oui' | 'Non' | 'Je ne sais pas'
  birth_mode TEXT, -- 'exact' | 'approx' | 'unknown'
  birth_date DATE,
  birth_year INTEGER,
  birth_month INTEGER,
  birth_reminder BOOLEAN DEFAULT true,
  breed_mode TEXT, -- 'pure' | 'mixed' | 'unknown'
  breed TEXT,
  mix_breeds TEXT[], -- pour les croisés
  size TEXT, -- 'Très petit (< 5 kg)' etc.
  personality TEXT[],
  triggers TEXT[],
  physical_specs TEXT[],
  housing TEXT,
  garden TEXT,
  alone_time TEXT,
  other_animals TEXT,
  noise_level TEXT,
  health_signs TEXT[],
  fav_treats TEXT,
  fav_toys TEXT,
  fav_activities TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own dogs" ON dogs FOR ALL USING (auth.uid() = user_id);

-- Index pour récupérer les chiens d'un user rapidement
CREATE INDEX idx_dogs_user_id ON dogs(user_id);


-- ── SCANS (chaque enregistrement + résultat IA) ───────────
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE NOT NULL,
  
  -- Audio
  audio_duration_ms INTEGER,
  audio_peak_freq REAL,
  audio_volume REAL,
  audio_bands JSONB, -- {sub200, low, mid, high, vhigh}
  is_bark BOOLEAN DEFAULT true,
  detection_type TEXT, -- 'bark' | 'human_voice' | 'fake' | 'ambient'
  
  -- Contexte & Body Language
  scan_mode TEXT DEFAULT 'quick', -- 'quick' | 'precise'
  context JSONB, -- clés sélectionnées
  body_language JSONB, -- réponses body language
  
  -- Résultat IA
  hypotheses JSONB, -- [{category, emoji, confidence, explanation, actions, isRedFlag, color}]
  cartography_note TEXT,
  recurring_pattern TEXT,
  ai_advice TEXT,
  raw_ai_response JSONB,
  
  -- Validation utilisateur
  validated BOOLEAN DEFAULT false,
  validated_hypothesis INTEGER, -- index de l'hypothèse validée (0, 1, 2)
  correction BOOLEAN DEFAULT false,
  correction_text TEXT,
  correction_emotion TEXT,
  
  -- Meta
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  hour_of_day INTEGER, -- 0-23 pour les patterns horaires
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own scans" ON scans FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_scans_dog_id ON scans(dog_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_scanned_at ON scans(scanned_at DESC);


-- ── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'info', -- 'info' | 'streak' | 'tip' | 'achievement' | 'reminder'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own notifs" ON notifications FOR ALL USING (auth.uid() = user_id);


-- ── FUNCTIONS UTILITAIRES ──────────────────────────────────

-- Fonction pour incrémenter XP + vérifier level up
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_needed INTEGER;
  v_leveled_up BOOLEAN := false;
  v_coins_earned INTEGER;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  v_new_xp := v_profile.xp + p_amount;
  v_new_level := v_profile.level;
  v_xp_needed := v_new_level * 200;
  
  -- Level up loop
  WHILE v_new_xp >= v_xp_needed LOOP
    v_new_xp := v_new_xp - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := v_new_level * 200;
    v_leveled_up := true;
  END LOOP;
  
  -- Coins = XP/3
  v_coins_earned := FLOOR(p_amount / 3.0);
  
  UPDATE profiles SET
    xp = v_new_xp,
    level = v_new_level,
    coins = coins + v_coins_earned,
    total_coins_earned = total_coins_earned + v_coins_earned,
    last_active = CURRENT_DATE
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'xp', v_new_xp,
    'level', v_new_level,
    'coins_earned', v_coins_earned,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour le streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last DATE;
  v_streak INTEGER;
BEGIN
  SELECT last_active, streak INTO v_last, v_streak FROM profiles WHERE id = p_user_id;
  
  IF v_last = CURRENT_DATE THEN
    RETURN v_streak; -- Déjà actif aujourd'hui
  ELSIF v_last = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1; -- Jour consécutif
  ELSE
    v_streak := 1; -- Streak cassé
  END IF;
  
  UPDATE profiles SET streak = v_streak, last_active = CURRENT_DATE WHERE id = p_user_id;
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
