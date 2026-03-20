/**
 * WOUF — Database Service
 * ═══════════════════════════
 * FEATURE #8 (MUST HAVE): Backend + Base de données
 * 
 * Toutes les opérations CRUD pour le MVP
 */

import { supabase } from '../config/supabase';
import { FEEDBACK_EVENT_MAPPING, RECURRING_PATTERN_MAPPING, recordUserFeedbackEvent, refreshRecurringPatternsForDog } from './learning';

const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;

function logDev(message, payload) {
  if (!isDev) return;
  if (payload === undefined) console.log(message);
  else console.log(message, payload);
}

function logSupabaseError(message, error, payload = undefined) {
  console.error(message, {
    code: error?.code || null,
    message: error?.message || 'unknown_error',
    details: error?.details || null,
    hint: error?.hint || null,
    status: error?.status || null,
    ...(payload ? { payload } : {}),
  });
}

function isMissingRpcError(error, fnName) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes(`function public.${fnName}`) || msg.includes(`could not find the function public.${fnName}`);
}

function isDogSchemaMismatch(error) {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return [msg, details].some((value) => (
    value.includes('column')
    || value.includes('schema cache')
    || value.includes('photo_url')
    || value.includes('birth_mode')
    || value.includes('fav_activities')
  ));
}

function buildOwnedProfilePayload(user, fields = {}) {
  const payload = {
    id: user.id,
    email: user.email || fields.email || null,
    phone: fields.phone ?? null,
    postal_code: fields.postal_code ?? null,
    city: fields.city ?? null,
  };

  [
    'xp',
    'level',
    'streak',
    'coins',
    'total_coins_earned',
    'last_active',
  ].forEach((key) => {
    if (fields[key] !== undefined) payload[key] = fields[key];
  });

  return payload;
}

async function ensureProfileRecord(user, fields = {}) {
  if (!user) return null;

  logDev('[DB] profile.load.start', { userId: user.id, mode: 'ensure' });

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    logSupabaseError('[DB] profile.load.error', existingProfileError, { userId: user.id });
    throw existingProfileError;
  }

  if (existingProfile) {
    logDev('[DB] profile.load.success', { userId: user.id, source: 'existing' });
    if (!Object.keys(fields).length) return existingProfile;

    const { data: updatedProfile, error: updatedProfileError } = await supabase
      .from('profiles')
      .upsert(buildOwnedProfilePayload(user, { ...existingProfile, ...fields }), { onConflict: 'id' })
      .select('*')
      .single();

    if (updatedProfileError) {
      logSupabaseError('[DB] profile.update.error', updatedProfileError, { userId: user.id, fields });
      throw updatedProfileError;
    }

    logDev('[DB] profile.update.success', { userId: user.id, fields: Object.keys(fields) });
    return updatedProfile;
  }

  const profilePayload = buildOwnedProfilePayload(user, fields);
  logDev('[DB] profile.create.start', { userId: user.id, fields: profilePayload });

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (createdProfileError) {
    logSupabaseError('[DB] profile.create.error', createdProfileError, { userId: user.id, fields: profilePayload });
    throw createdProfileError;
  }

  logDev('[DB] profile.create.success', { userId: user.id });
  return createdProfile;
}

function computeXpFallback(profile, amount) {
  let xp = Number(profile?.xp || 0) + Number(amount || 0);
  let level = Number(profile?.level || 1);
  let xpNeeded = level * 200;
  let leveledUp = false;

  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level += 1;
    xpNeeded = level * 200;
    leveledUp = true;
  }

  const coinsEarned = Math.floor(Number(amount || 0) / 3);

  return {
    xp,
    level,
    coins_earned: coinsEarned,
    leveled_up: leveledUp,
    coins: Number(profile?.coins || 0) + coinsEarned,
    total_coins_earned: Number(profile?.total_coins_earned || 0) + coinsEarned,
    last_active: new Date().toISOString().slice(0, 10),
  };
}

function computeStreakFallback(profile) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const lastActive = profile?.last_active || null;
  let streak = Number(profile?.streak || 0);

  if (lastActive === todayStr) {
    return { streak, last_active: todayStr };
  }

  if (lastActive === yesterdayStr) streak += 1;
  else streak = 1;

  return { streak, last_active: todayStr };
}

function buildDogInsertPayload(userId, dogData, { minimal = false } = {}) {
  const payload = {
    user_id: userId,
    name: dogData.name,
    breed: dogData.breed || null,
    mix_breeds: dogData.mixBreeds || [],
    birth_year: dogData.bdYear ? parseInt(dogData.bdYear, 10) : null,
    personality: dogData.personality || [],
    triggers: dogData.triggers || [],
    health_signs: dogData.healthSigns || [],
    is_active: true,
  };

  if (minimal) return payload;

  return {
    ...payload,
    photo_url: dogData.photo_url || null,
    sex: dogData.sex,
    neutered: dogData.neutered,
    birth_mode: dogData.bdMode,
    birth_date: dogData.bdExact || null,
    birth_month: dogData.bdMonth || null,
    birth_reminder: dogData.bdReminder ?? true,
    breed_mode: dogData.breedMode,
    size: dogData.size,
    physical_specs: dogData.physSpec || [],
    housing: dogData.housing,
    garden: dogData.garden,
    alone_time: dogData.alone,
    other_animals: dogData.otherAnimals,
    noise_level: dogData.noise,
    fav_treats: dogData.favTreats || '',
    fav_toys: dogData.favToys || '',
    fav_activities: dogData.favActivities || [],
  };
}

export const SCAN_PERSISTENCE_MAPPING = {
  scans: {
    mode: 'scanData.mode',
    bark_detected: 'scanData.isBark',
    detection_type: 'scanData.detectionType',
    context_json: 'scanData.context',
    body_json: 'scanData.bodyLanguage',
    top_hypothesis: 'scanData.topHypothesis || scanData.hypotheses[0].category',
    hypotheses_json: 'scanData.hypotheses',
    confidence_top: 'scanData.confidenceTop || scanData.hypotheses[0].confidence',
    vet_flag: 'scanData.vetFlag',
    audio_duration: 'scanData.audioDuration',
    audio_peak_freq: 'scanData.audioSignature.peakFreq',
    audio_volume: 'scanData.audioSignature.volume',
    audio_bands: 'scanData.audioSignature.bands',
  },
  scan_features: {
    peak_freq: 'scanData.audioSignature.peakFreq',
    rms_energy: 'scanData.audioSignature.volume',
    low_band_energy: 'scanData.audioSignature.bands.low',
    mid_band_energy: 'scanData.audioSignature.bands.mid',
    high_band_energy: 'scanData.audioSignature.bands.high',
    bark_rate: 'scanData.audioDetails.modRate',
    burst_count: 'scanData.audioSignature.burstCount',
  },
};

export const LEARNING_PERSISTENCE_MAPPING = {
  user_feedback_events: FEEDBACK_EVENT_MAPPING,
  recurring_patterns: RECURRING_PATTERN_MAPPING,
};

async function getAuthenticatedUser({ allowNull = false } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !allowNull) throw new Error('Not authenticated');
  return user || null;
}

function createEmptyCartographyStats() {
  return {
    total: 0,
    validatedCount: 0,
    correctedCount: 0,
    hasEnoughHistory: false,
    probableStates: [],
    validatedStates: [],
    hours: Array(24).fill(0),
    triggers: [],
    topContexts: [],
    days: Array(7).fill(0),
    recurring: [],
    latestAdvice: null,
    latestPattern: null,
    latestNote: 'Pas encore assez de scans pour afficher une cartographie utile.',
  };
}

function buildScansInsertPayload(userId, scanData, now) {
  const topHypothesis = scanData.topHypothesis || scanData.hypotheses?.[0]?.category || null;
  const confidenceTop = scanData.confidenceTop ?? scanData.hypotheses?.[0]?.confidence ?? null;

  return {
    user_id: userId,
    dog_id: scanData.dogId,

    // Legacy-compatible fields
    audio_duration_ms: scanData.audioDuration ?? null,
    audio_peak_freq: scanData.audioSignature?.peakFreq ?? null,
    audio_volume: scanData.audioSignature?.volume ?? null,
    audio_bands: scanData.audioSignature?.bands ?? null,
    is_bark: Boolean(scanData.isBark),
    detection_type: scanData.detectionType || (scanData.isBark ? 'bark' : 'non_bark'),
    scan_mode: scanData.mode || 'quick',
    context: scanData.context || {},
    body_language: scanData.bodyLanguage || {},
    hypotheses: scanData.hypotheses || [],
    ai_advice: scanData.aiAdvice || null,
    cartography_note: scanData.cartographyNote || null,
    recurring_pattern: scanData.recurringPattern || null,
    raw_ai_response: scanData.rawAiResponse || null,
    scanned_at: now.toISOString(),
    hour_of_day: now.getHours(),

    // V2 fields
    mode: scanData.mode || 'quick',
    audio_url: scanData.audioUrl || null,
    audio_duration: scanData.audioDuration ?? null,
    bark_detected: Boolean(scanData.isBark),
    context_json: scanData.context || {},
    body_json: scanData.bodyLanguage || {},
    top_hypothesis: topHypothesis,
    hypotheses_json: scanData.hypotheses || [],
    selected_hypothesis: scanData.selectedHypothesis || null,
    validated_hypothesis: Number.isInteger(scanData.validatedHypothesis) ? scanData.validatedHypothesis : null,
    confidence_top: confidenceTop,
    vet_flag: Boolean(scanData.vetFlag),
    corrected_label: scanData.correctedLabel || null,
    correction_text: scanData.correctionText || null,
    correction_emotion: scanData.correctionEmotion || null,
    validated: Boolean(scanData.validated || false),
  };
}

function buildScanFeaturesInsertPayload(scanId, scanData) {
  if (!scanData?.audioSignature) return null;

  return {
    scan_id: scanId,
    dog_id: scanData.dogId,
    peak_freq: scanData.audioSignature?.peakFreq ?? null,
    spectral_centroid: scanData.audioDetails?.spectralCentroid ?? null,
    spectral_rolloff: scanData.audioDetails?.spectralRolloff ?? null,
    rms_energy: scanData.audioSignature?.volume ?? null,
    zcr: scanData.audioDetails?.zcr ?? null,
    low_band_energy: scanData.audioSignature?.bands?.low ?? null,
    mid_band_energy: scanData.audioSignature?.bands?.mid ?? null,
    high_band_energy: scanData.audioSignature?.bands?.high ?? null,
    bark_rate: scanData.audioDetails?.modRate ?? null,
    burst_count: scanData.audioSignature?.burstCount ?? null,
    mfcc_summary: scanData.audioDetails?.mfccSummary ?? null,
  };
}

export const CARTOGRAPHY_DATA_MAPPING = {
  probable_states: 'scan_state_scores.state_code + score + rank',
  validated_states: 'scans.validated_hypothesis / corrected_label / correction_emotion',
  hourly_heatmap: 'scans.hour_of_day',
  triggers: 'scans.context_json with fallback scans.context',
  top_contexts: 'scans.context_json/context grouped as recurring combinations',
  time_evolution: 'scans.scanned_at / scans.created_at aggregated by weekday',
  recurring_trends: 'recurring_patterns.pattern_type + label + score + source_json',
};

function buildScanStateScoresPayload(scanId, scanData) {
  const source = Array.isArray(scanData.scanStateScores)
    ? scanData.scanStateScores
    : Array.isArray(scanData.hypotheses)
      ? scanData.hypotheses.map((h, index) => ({
          state_code: h.category,
          score: Number(h.confidence || 0),
          rank: index + 1,
          source_breakdown: h.source_breakdown || null,
        }))
      : [];

  return source
    .filter((item) => item?.state_code)
    .slice(0, 3)
    .map((item, index) => ({
      scan_id: scanId,
      state_code: item.state_code,
      score: Number(item.score || 0),
      rank: Number(item.rank || index + 1),
      source_breakdown: item.source_breakdown || null,
    }));
}

const VOICE_PROFILE_FIELDS = [
  'peak_freq',
  'spectral_centroid',
  'spectral_rolloff',
  'rms_energy',
  'zcr',
  'low_band_energy',
  'mid_band_energy',
  'high_band_energy',
  'bark_rate',
  'burst_count',
];

export const DOG_VOICE_PROFILE_MAPPING = {
  sample_count: 'number of exploitable bark scans used in profile',
  avg_peak_freq: 'rolling average of scan_features.peak_freq',
  avg_centroid: 'rolling average of scan_features.spectral_centroid',
  avg_rolloff: 'rolling average of scan_features.spectral_rolloff',
  avg_rms: 'rolling average of scan_features.rms_energy',
  avg_zcr: 'rolling average of scan_features.zcr',
  avg_low_band: 'rolling average of scan_features.low_band_energy',
  avg_mid_band: 'rolling average of scan_features.mid_band_energy',
  avg_high_band: 'rolling average of scan_features.high_band_energy',
  avg_bark_rate: 'rolling average of scan_features.bark_rate',
  avg_burst_count: 'rolling average of scan_features.burst_count',
  variance_json: 'simple per-feature running variance (V1)',
  profile_vector: 'snapshot of aggregated means',
  reliability_level: 'learning|low|medium|good from sample_count',
};

function toProfileMetricMap(feature) {
  return {
    peak_freq: feature?.peak_freq ?? null,
    spectral_centroid: feature?.spectral_centroid ?? null,
    spectral_rolloff: feature?.spectral_rolloff ?? null,
    rms_energy: feature?.rms_energy ?? null,
    zcr: feature?.zcr ?? null,
    low_band_energy: feature?.low_band_energy ?? null,
    mid_band_energy: feature?.mid_band_energy ?? null,
    high_band_energy: feature?.high_band_energy ?? null,
    bark_rate: feature?.bark_rate ?? null,
    burst_count: feature?.burst_count ?? null,
  };
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getReliabilityLevel(sampleCount) {
  if (sampleCount < 3) return 'learning';
  if (sampleCount < 6) return 'low';
  if (sampleCount < 12) return 'medium';
  return 'good';
}

function isExploitableVoiceFeature(scanData, featurePayload) {
  if (!scanData?.isBark) return false;
  if (!featurePayload) return false;

  const peak = toNumberOrNull(featurePayload.peak_freq);
  const rms = toNumberOrNull(featurePayload.rms_energy);
  const bursts = toNumberOrNull(featurePayload.burst_count);

  if (peak == null || peak <= 0) return false;
  if (rms == null || rms < 8) return false;
  if (bursts == null || bursts < 1) return false;

  return true;
}

function computeSimilarityFromProfile(profile, featurePayload) {
  if (!profile || !featurePayload || !profile.sample_count || profile.sample_count < 2) {
    return { similarity: null, confidence: profile?.reliability_level || 'learning', comparedMetrics: 0 };
  }

  const metrics = [
    ['peak_freq', 'avg_peak_freq', 1200],
    ['rms_energy', 'avg_rms', 100],
    ['low_band_energy', 'avg_low_band', 100],
    ['mid_band_energy', 'avg_mid_band', 100],
    ['high_band_energy', 'avg_high_band', 100],
    ['bark_rate', 'avg_bark_rate', 12],
    ['burst_count', 'avg_burst_count', 12],
  ];

  let sum = 0;
  let compared = 0;

  for (const [scanKey, profileKey, scale] of metrics) {
    const a = toNumberOrNull(featurePayload[scanKey]);
    const b = toNumberOrNull(profile[profileKey]);
    if (a == null || b == null) continue;
    const distance = Math.abs(a - b) / scale;
    const score = Math.max(0, 1 - distance);
    sum += score;
    compared += 1;
  }

  if (!compared) return { similarity: null, confidence: profile.reliability_level || 'learning', comparedMetrics: 0 };

  return {
    similarity: Math.round((sum / compared) * 100),
    confidence: profile.reliability_level || 'learning',
    comparedMetrics: compared,
  };
}

function buildUpdatedVoiceProfile(profile, featurePayload) {
  const previousCount = profile?.sample_count || 0;
  const nextCount = previousCount + 1;

  const previousVariance = profile?.variance_json || {};
  const currentMetrics = toProfileMetricMap(featurePayload);

  const avgMap = {
    peak_freq: 'avg_peak_freq',
    spectral_centroid: 'avg_centroid',
    spectral_rolloff: 'avg_rolloff',
    rms_energy: 'avg_rms',
    zcr: 'avg_zcr',
    low_band_energy: 'avg_low_band',
    mid_band_energy: 'avg_mid_band',
    high_band_energy: 'avg_high_band',
    bark_rate: 'avg_bark_rate',
    burst_count: 'avg_burst_count',
  };

  const patch = {
    sample_count: nextCount,
    reliability_level: getReliabilityLevel(nextCount),
  };

  const nextVariance = { ...previousVariance };

  for (const metric of VOICE_PROFILE_FIELDS) {
    const value = toNumberOrNull(currentMetrics[metric]);
    const avgField = avgMap[metric];
    const prevAvg = toNumberOrNull(profile?.[avgField]);

    if (value == null) {
      patch[avgField] = prevAvg;
      continue;
    }

    const updatedAvg = prevAvg == null
      ? value
      : ((prevAvg * previousCount) + value) / nextCount;

    patch[avgField] = Number(updatedAvg.toFixed(4));

    const prevVar = toNumberOrNull(previousVariance[metric]) ?? 0;
    const delta = prevAvg == null ? 0 : (value - prevAvg);
    const updatedVar = prevAvg == null
      ? 0
      : ((prevVar * previousCount) + (delta * delta)) / nextCount;

    nextVariance[metric] = Number(updatedVar.toFixed(6));
  }

  patch.variance_json = nextVariance;
  patch.profile_vector = {
    avg_peak_freq: patch.avg_peak_freq,
    avg_centroid: patch.avg_centroid,
    avg_rolloff: patch.avg_rolloff,
    avg_rms: patch.avg_rms,
    avg_zcr: patch.avg_zcr,
    avg_low_band: patch.avg_low_band,
    avg_mid_band: patch.avg_mid_band,
    avg_high_band: patch.avg_high_band,
    avg_bark_rate: patch.avg_bark_rate,
    avg_burst_count: patch.avg_burst_count,
  };

  return patch;
}


// ═══════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════

export const profileService = {
  /** Récupérer le profil du user connecté */
  async get() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return null;
    return ensureProfileRecord(user);
  },

  async ensure(fields = {}, explicitUser = null) {
    const user = explicitUser || await getAuthenticatedUser({ allowNull: true });
    if (!user) return null;
    return ensureProfileRecord(user, fields);
  },

  /** Mettre à jour le profil */
  async update(fields) {
    const user = await getAuthenticatedUser();
    return ensureProfileRecord(user, fields);
  },

  /** Ajouter de l'XP (via fonction SQL) */
  async addXp(amount) {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return null;

    logDev('[DB] add_xp.start', { userId: user.id, amount });

    const { data, error } = await supabase.rpc('add_xp', {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (!error) {
      logDev('[DB] add_xp.success', { userId: user.id, amount, data });
      return data;
    }

    if (!isMissingRpcError(error, 'add_xp')) {
      logSupabaseError('[DB] add_xp.error', error, { userId: user.id, amount });
      throw error;
    }

    console.warn('[DB] add_xp.rpc_missing_fallback', { userId: user.id, amount });
    const profile = await ensureProfileRecord(user);
    const fallback = computeXpFallback(profile, amount);
    const updatedProfile = await ensureProfileRecord(user, {
      xp: fallback.xp,
      level: fallback.level,
      coins: fallback.coins,
      total_coins_earned: fallback.total_coins_earned,
      last_active: fallback.last_active,
    });

    logDev('[DB] add_xp.fallback_success', { userId: user.id, updatedProfileId: updatedProfile?.id });

    return {
      xp: fallback.xp,
      level: fallback.level,
      coins_earned: fallback.coins_earned,
      leveled_up: fallback.leveled_up,
    };
  },

  /** Mettre à jour le streak (via fonction SQL) */
  async updateStreak() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return null;

    logDev('[DB] update_streak.start', { userId: user.id });

    const { data, error } = await supabase.rpc('update_streak', {
      p_user_id: user.id,
    });

    if (!error) {
      logDev('[DB] update_streak.success', { userId: user.id, streak: data });
      return data;
    }

    if (!isMissingRpcError(error, 'update_streak')) {
      logSupabaseError('[DB] update_streak.error', error, { userId: user.id });
      throw error;
    }

    console.warn('[DB] update_streak.rpc_missing_fallback', { userId: user.id });
    const profile = await ensureProfileRecord(user);
    const fallback = computeStreakFallback(profile);
    await ensureProfileRecord(user, fallback);
    logDev('[DB] update_streak.fallback_success', { userId: user.id, streak: fallback.streak });
    return fallback.streak;
  },
};

// ═══════════════════════════════════════════════════════════
// DOGS
// ═══════════════════════════════════════════════════════════

export const dogService = {
  /** Récupérer tous les chiens du user */
  async getAll() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return [];

    await ensureProfileRecord(user);
    logDev('[DB] dogs.load.start', { userId: user.id });

    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      logSupabaseError('[DB] dogs.load.error', error, { userId: user.id });
      throw error;
    }

    logDev('[DB] dogs.load.success', { userId: user.id, count: data?.length || 0 });
    return data || [];
  },

  /** Récupérer un chien par ID */
  async getById(dogId) {
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('id', dogId)
      .single();
    if (error) throw error;
    return data;
  },

  /** Créer un nouveau chien */
  async create(dogData) {
    const user = await getAuthenticatedUser();
    await ensureProfileRecord(user);

    const fullPayload = buildDogInsertPayload(user.id, dogData);
    logDev('[DB] dog.create.start', { userId: user.id, payloadKeys: Object.keys(fullPayload) });

    const fullInsert = await supabase
      .from('dogs')
      .insert(fullPayload)
      .select()
      .single();

    if (!fullInsert.error) {
      logDev('[DB] dog.create.success', { userId: user.id, dogId: fullInsert.data?.id, mode: 'full' });
      return fullInsert.data;
    }

    logSupabaseError('[DB] dog.create.error', fullInsert.error, { userId: user.id, payloadKeys: Object.keys(fullPayload) });

    if (!isDogSchemaMismatch(fullInsert.error)) throw fullInsert.error;

    const minimalPayload = buildDogInsertPayload(user.id, dogData, { minimal: true });
    console.warn('[DB] dog.create.schema_fallback', { userId: user.id, payloadKeys: Object.keys(minimalPayload) });

    const fallbackInsert = await supabase
      .from('dogs')
      .insert(minimalPayload)
      .select()
      .single();

    if (fallbackInsert.error) {
      logSupabaseError('[DB] dog.create.fallback_error', fallbackInsert.error, { userId: user.id, payloadKeys: Object.keys(minimalPayload) });
      throw fallbackInsert.error;
    }

    logDev('[DB] dog.create.success', { userId: user.id, dogId: fallbackInsert.data?.id, mode: 'minimal' });
    return fallbackInsert.data;
  },

  /** Mettre à jour un chien */
  async update(dogId, fields) {
    const { data, error } = await supabase
      .from('dogs')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', dogId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Upload photo chien vers Supabase Storage */
  async uploadPhoto(dogId, photoUri) {
    const user = await getAuthenticatedUser();
    const ext = photoUri.split('.').pop() || 'jpg';
    const path = `${user.id}/${dogId}.${ext}`;

    // Lire le fichier en base64
    const response = await fetch(photoUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('dog-photos')
      .upload(path, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('dog-photos')
      .getPublicUrl(path);

    // Mettre à jour le chien avec l'URL
    await this.update(dogId, { photo_url: publicUrl });
    return publicUrl;
  },

  /** Soft delete */
  async deactivate(dogId) {
    return this.update(dogId, { is_active: false });
  },
};

// ═══════════════════════════════════════════════════════════
// DOG VOICE PROFILE (LOT 5)
// ═══════════════════════════════════════════════════════════

export const dogVoiceProfileService = {
  async getByDogId(dogId) {
    const { data, error } = await supabase
      .from('dog_voice_profile')
      .select('*')
      .eq('dog_id', dogId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertFromScanFeature(dogId, featurePayload, { isBark = false } = {}) {
    if (!isExploitableVoiceFeature({ isBark }, featurePayload)) {
      return {
        updated: false,
        reason: 'non_exploitable_scan',
        reliability_level: 'learning',
        similarity: null,
      };
    }

    const existing = await this.getByDogId(dogId);
    const similarity = computeSimilarityFromProfile(existing, featurePayload);

    const updatedPatch = buildUpdatedVoiceProfile(existing || { sample_count: 0 }, featurePayload);

    const { data, error } = await supabase
      .from('dog_voice_profile')
      .upsert({
        dog_id: dogId,
        ...updatedPatch,
      }, { onConflict: 'dog_id' })
      .select()
      .single();

    if (error) {
      console.error('[DB] dog_voice_profile upsert failed', { message: error.message, dogId });
      throw new Error('dog_voice_profile_persistence_failed');
    }

    return {
      updated: true,
      reliability_level: data.reliability_level,
      sample_count: data.sample_count,
      similarity,
      profile: data,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// SCANS
// ═══════════════════════════════════════════════════════════

export const scanService = {
  /** Récupérer les scans d'un chien (paginé) */
  async getForDog(dogId, { limit = 50, offset = 0 } = {}) {
    if (!dogId) return [];

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('dog_id', dogId)
      .order('scanned_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  },

  /** Récupérer un scan par ID */
  async getById(scanId) {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();
    if (error) throw error;
    return data;
  },

  /** Créer un scan complet + scan_features (pipeline LOT 4) */
  async create(scanData) {
    const user = await getAuthenticatedUser();
    const now = new Date();

    if (!scanData?.dogId) throw new Error('missing_dog_id');
    if (!Array.isArray(scanData?.hypotheses) || !scanData.hypotheses.length) throw new Error('missing_hypotheses');

    const scanPayload = buildScansInsertPayload(user.id, scanData, now);

    const { data, error } = await supabase
      .from('scans')
      .insert(scanPayload)
      .select()
      .single();

    if (error) {
      console.error('[DB] scans insert failed', { message: error.message });
      throw new Error('scan_persistence_failed');
    }

    const featurePayload = buildScanFeaturesInsertPayload(data.id, scanData);
    let voiceProfile = {
      updated: false,
      reason: 'no_feature_payload',
      reliability_level: 'learning',
      similarity: null,
    };
    const warnings = [];

    if (featurePayload) {
      const { error: featureError } = await supabase
        .from('scan_features')
        .insert(featurePayload);

      if (featureError) {
        console.error('[DB] scan_features insert failed', { message: featureError.message, scanId: data.id });
        warnings.push('scan_features_persistence_failed');
      } else {
        try {
          voiceProfile = await dogVoiceProfileService.upsertFromScanFeature(scanData.dogId, featurePayload, {
            isBark: scanData.isBark,
          });
        } catch (voiceProfileError) {
          console.error('[DB] dog_voice_profile update skipped', { message: voiceProfileError.message, scanId: data.id });
          warnings.push('dog_voice_profile_persistence_failed');
        }
      }
    }

    const stateScoresPayload = buildScanStateScoresPayload(data.id, scanData);
    if (stateScoresPayload.length) {
      const { error: scoreError } = await supabase
        .from('scan_state_scores')
        .insert(stateScoresPayload);

      if (scoreError) {
        console.error('[DB] scan_state_scores insert failed', { message: scoreError.message, scanId: data.id });
        warnings.push('scan_state_scores_persistence_failed');
      }
    }

    try {
      await refreshRecurringPatternsForDog(scanData.dogId);
    } catch (patternError) {
      console.warn('[Learning] recurring pattern refresh skipped', patternError?.message || 'unknown_error');
      warnings.push('recurring_patterns_refresh_skipped');
    }

    return {
      ...data,
      warnings,
      voice_profile: {
        reliability_level: voiceProfile.reliability_level,
        sample_count: voiceProfile.sample_count || null,
        similarity: voiceProfile.similarity || null,
        updated: Boolean(voiceProfile.updated),
        reason: voiceProfile.reason || null,
      },
    };
  },

  /** Valider un scan (l'utilisateur confirme l'hypothèse) + feedback event */
  async validate(scanId, hypothesisIndex) {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('scans')
      .update({
        validated: true,
        validated_hypothesis: hypothesisIndex,
      })
      .eq('id', scanId)
      .select()
      .single();
    if (error) throw error;

    const selectedLabel = data?.hypotheses_json?.[hypothesisIndex]?.category
      || data?.hypotheses?.[hypothesisIndex]?.category
      || data?.selected_hypothesis
      || data?.top_hypothesis
      || null;

    try {
      await recordUserFeedbackEvent({
        scanId,
        userId: user.id,
        feedbackType: 'validate',
        selectedLabel,
      });
      await refreshRecurringPatternsForDog(data.dog_id);
    } catch (learnError) {
      console.warn('[Learning] validate feedback persistence skipped', learnError?.message || 'unknown_error');
    }

    return data;
  },

  /** Corriger un scan + feedback event */
  async correct(scanId, correctionText, correctionEmotion) {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('scans')
      .update({
        correction: true,
        correction_text: correctionText,
        correction_emotion: correctionEmotion,
        corrected_label: correctionEmotion,
      })
      .eq('id', scanId)
      .select()
      .single();
    if (error) throw error;

    try {
      await recordUserFeedbackEvent({
        scanId,
        userId: user.id,
        feedbackType: 'correct',
        selectedLabel: correctionEmotion || null,
        freeText: correctionText || null,
      });
      await refreshRecurringPatternsForDog(data.dog_id);
    } catch (learnError) {
      console.warn('[Learning] correction feedback persistence skipped', learnError?.message || 'unknown_error');
    }

    return data;
  },

  /** Compteur de scans aujourd'hui pour un chien */
  async countToday(dogId) {
    if (!dogId) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('dog_id', dogId)
      .gte('scanned_at', today.toISOString());
    if (error) throw error;
    return count || 0;
  },

  /** Compteur de scans aujourd'hui pour l'utilisateur connecté */
  async countTodayForUser() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scanned_at', today.toISOString());

    if (error) throw error;
    return count || 0;
  },

  /** Stats pour la cartographie V1 */
  async getStats(dogId) {
    if (!dogId) return createEmptyCartographyStats();

    const scans = await this.getForDog(dogId, { limit: 200 });

    const { data: stateScores, error: stateScoresError } = await supabase
      .from('scan_state_scores')
      .select('scan_id, state_code, score, rank, source_breakdown')
      .in('scan_id', scans.map(s => s.id).length ? scans.map(s => s.id) : ['00000000-0000-0000-0000-000000000000']);
    if (stateScoresError) throw stateScoresError;

    const { data: recurringPatterns, error: recurringPatternsError } = await supabase
      .from('recurring_patterns')
      .select('pattern_type, label, score, source_json, updated_at')
      .eq('dog_id', dogId)
      .order('updated_at', { ascending: false });
    if (recurringPatternsError) throw recurringPatternsError;

    const probableStates = {};
    const validatedStates = {};
    const hours = Array(24).fill(0);
    const triggers = {};
    const contexts = {};
    const days = Array(7).fill(0);
    let validatedCount = 0;
    let correctedCount = 0;

    (stateScores || []).forEach((row) => {
      if (!row?.state_code) return;
      probableStates[row.state_code] = (probableStates[row.state_code] || 0) + Number(row.score || 0);
    });

    scans.forEach((s) => {
      const resolvedState = s.corrected_label
        || s.correction_emotion
        || s.selected_hypothesis
        || (Array.isArray(s.hypotheses_json) ? s.hypotheses_json[s.validated_hypothesis || 0]?.category : null)
        || (Array.isArray(s.hypotheses) ? s.hypotheses[s.validated_hypothesis || 0]?.category : null)
        || s.top_hypothesis
        || '?';

      if (s.validated || s.correction || s.corrected_label) {
        validatedStates[resolvedState] = (validatedStates[resolvedState] || 0) + 1;
      }

      if (s.hour_of_day != null && s.hour_of_day >= 0 && s.hour_of_day < 24) hours[s.hour_of_day]++;

      const ctx = s.context_json || s.context || {};
      const activeContextKeys = Object.entries(ctx)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k);

      activeContextKeys.forEach((key) => {
        triggers[key] = (triggers[key] || 0) + 1;
      });

      if (activeContextKeys.length) {
        const contextLabel = activeContextKeys
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 3)
          .join(' + ');
        contexts[contextLabel] = (contexts[contextLabel] || 0) + 1;
      }

      const refDate = s.scanned_at || s.created_at;
      if (refDate) days[new Date(refDate).getDay()]++;
      if (s.validated) validatedCount++;
      if (s.correction || s.corrected_label) correctedCount++;
    });

    const recurring = (recurringPatterns || []).map((p) => ({
      type: p.pattern_type,
      label: p.label,
      score: Number(p.score || 0),
      source: p.source_json || {},
    }));

    return {
      total: scans.length,
      validatedCount,
      correctedCount,
      hasEnoughHistory: scans.length >= 5,
      probableStates: Object.entries(probableStates)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      validatedStates: Object.entries(validatedStates)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      hours,
      triggers: Object.entries(triggers).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topContexts: Object.entries(contexts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      days,
      recurring,
      latestAdvice: scans.find(s => s.ai_advice)?.ai_advice || null,
      latestPattern: recurring[0]?.label || null,
      latestNote: scans.length >= 5
        ? 'Lecture probabiliste basée sur les scans enregistrés, validations et répétitions observées.'
        : 'Historique encore léger : la cartographie reste indicative et va gagner en fiabilité avec plus de scans.',
    };
  },
};

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export const notifService = {
  async getAll() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },

  async markRead(notifId) {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
  },

  async markAllRead() {
    const user = await getAuthenticatedUser({ allowNull: true });
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  },

  async create(title, body, type = 'info') {
    const user = await getAuthenticatedUser();
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title,
      body,
      type,
    });
    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════
// DATA DELETION (RGPD)
// ═══════════════════════════════════════════════════════════

export const dataService = {
  /** Supprimer TOUTES les données d'un user (RGPD) */
  async deleteAllUserData() {
    const user = await getAuthenticatedUser();

    // Ordre: scans → notifications → dogs → profile
    // Le CASCADE dans le schema fait le gros du travail
    // Mais on le fait explicitement pour être sûr
    await supabase.from('scans').delete().eq('user_id', user.id);
    await supabase.from('notifications').delete().eq('user_id', user.id);
    await supabase.from('dogs').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);

    // Supprimer les photos du storage
    const { data: files } = await supabase.storage
      .from('dog-photos')
      .list(user.id);
    if (files?.length) {
      await supabase.storage
        .from('dog-photos')
        .remove(files.map(f => `${user.id}/${f.name}`));
    }

    // Supprimer le compte auth
    // Note: nécessite une Edge Function côté serveur avec service_role key
    await supabase.functions.invoke('delete-user');
  },
};
