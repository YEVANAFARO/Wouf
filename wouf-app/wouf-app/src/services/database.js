/**
 * WOUF — Database Service
 * ═══════════════════════════
 * FEATURE #8 (MUST HAVE): Backend + Base de données
 * 
 * Toutes les opérations CRUD pour le MVP
 */

import { supabase } from '../config/supabase';

// ═══════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════

export const profileService = {
  /** Récupérer le profil du user connecté */
  async get() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Mettre à jour le profil */
  async update(fields) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Ajouter de l'XP (via fonction SQL) */
  async addXp(amount) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('add_xp', {
      p_user_id: user.id,
      p_amount: amount,
    });
    if (error) throw error;
    return data; // {xp, level, coins_earned, leveled_up}
  },

  /** Mettre à jour le streak (via fonction SQL) */
  async updateStreak() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('update_streak', {
      p_user_id: user.id,
    });
    if (error) throw error;
    return data; // nouveau streak
  },
};

// ═══════════════════════════════════════════════════════════
// DOGS
// ═══════════════════════════════════════════════════════════

export const dogService = {
  /** Récupérer tous les chiens du user */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at');
    if (error) throw error;
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
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('dogs')
      .insert({
        user_id: user.id,
        name: dogData.name,
        photo_url: dogData.photo_url || null,
        sex: dogData.sex,
        neutered: dogData.neutered,
        birth_mode: dogData.bdMode,
        birth_date: dogData.bdExact || null,
        birth_year: dogData.bdYear ? parseInt(dogData.bdYear) : null,
        birth_month: dogData.bdMonth || null,
        birth_reminder: dogData.bdReminder ?? true,
        breed_mode: dogData.breedMode,
        breed: dogData.breed || null,
        mix_breeds: dogData.mixBreeds || [],
        size: dogData.size,
        personality: dogData.personality || [],
        triggers: dogData.triggers || [],
        physical_specs: dogData.physSpec || [],
        housing: dogData.housing,
        garden: dogData.garden,
        alone_time: dogData.alone,
        other_animals: dogData.otherAnimals,
        noise_level: dogData.noise,
        health_signs: dogData.healthSigns || [],
        fav_treats: dogData.favTreats || '',
        fav_toys: dogData.favToys || '',
        fav_activities: dogData.favActivities || [],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
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
    const { data: { user } } = await supabase.auth.getUser();
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
// SCANS
// ═══════════════════════════════════════════════════════════

export const scanService = {
  /** Récupérer les scans d'un chien (paginé) */
  async getForDog(dogId, { limit = 50, offset = 0 } = {}) {
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

  /** Créer un scan complet (après interprétation IA) */
  async create(scanData) {
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date();

    const { data, error } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        dog_id: scanData.dogId,
        audio_duration_ms: scanData.audioDuration,
        audio_peak_freq: scanData.audioSignature?.peakFreq,
        audio_volume: scanData.audioSignature?.volume,
        audio_bands: scanData.audioSignature?.bands,
        is_bark: scanData.isBark,
        detection_type: scanData.detectionType,
        scan_mode: scanData.mode,
        context: scanData.context,
        body_language: scanData.bodyLanguage,
        hypotheses: scanData.hypotheses,
        cartography_note: scanData.cartographyNote,
        recurring_pattern: scanData.recurringPattern,
        ai_advice: scanData.aiAdvice,
        raw_ai_response: scanData.rawAiResponse,
        scanned_at: now.toISOString(),
        hour_of_day: now.getHours(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Valider un scan (l'utilisateur confirme l'hypothèse) */
  async validate(scanId, hypothesisIndex) {
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
    return data;
  },

  /** Corriger un scan */
  async correct(scanId, correctionText, correctionEmotion) {
    const { data, error } = await supabase
      .from('scans')
      .update({
        correction: true,
        correction_text: correctionText,
        correction_emotion: correctionEmotion,
      })
      .eq('id', scanId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Compteur de scans aujourd'hui (pour la limite free) */
  async countToday(dogId) {
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

  /** Stats pour la cartographie */
  async getStats(dogId) {
    const scans = await this.getForDog(dogId, { limit: 200 });

    // Émotions
    const emotions = {};
    const hours = Array(24).fill(0);
    const triggers = {};
    const days = Array(7).fill(0);
    let validatedCount = 0;

    scans.forEach(s => {
      // Émotion principale
      const emotion = s.correction
        ? s.correction_emotion
        : s.hypotheses?.[s.validated_hypothesis || 0]?.category || '?';
      emotions[emotion] = (emotions[emotion] || 0) + 1;

      // Horaire
      if (s.hour_of_day != null) hours[s.hour_of_day]++;

      // Déclencheurs
      if (s.context) {
        Object.entries(s.context).forEach(([k, v]) => {
          if (v) triggers[k] = (triggers[k] || 0) + 1;
        });
      }

      // Jours de la semaine
      days[new Date(s.scanned_at).getDay()]++;

      if (s.validated) validatedCount++;
    });

    return {
      total: scans.length,
      validatedCount,
      correctedCount: scans.filter(s => s.correction).length,
      emotions: Object.entries(emotions).sort((a, b) => b[1] - a[1]),
      hours,
      triggers: Object.entries(triggers).sort((a, b) => b[1] - a[1]).slice(0, 5),
      days,
      latestAdvice: scans.find(s => s.ai_advice)?.ai_advice || null,
      latestPattern: scans.find(s => s.recurring_pattern)?.recurring_pattern || null,
      latestNote: scans.find(s => s.cartography_note)?.cartography_note || null,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export const notifService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  },

  async create(title, body, type = 'info') {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
