/**
 * WOUF — AI Interpretation Service (server-only IA)
 * Calls Supabase Edge Functions only.
 */

import { supabase } from '../config/supabase';
import { getUserFacingError } from './userFacingErrors';

function normalizeClientError(error) {
  console.error('[AI] edge_function_error', {
    message: error?.message || 'unknown_error',
    name: error?.name || 'Error',
  });
  return new Error(getUserFacingError(error, 'Impossible de générer une interprétation pour le moment.'));
}

function buildHistorySignals(scanHistory = []) {
  const recent = Array.isArray(scanHistory) ? scanHistory.slice(0, 12) : [];
  if (!recent.length) {
    return {
      total: 0,
      validatedRatio: 0,
      correctedRatio: 0,
      topState: null,
    };
  }

  const validatedCount = recent.filter((s) => s.validated).length;
  const correctedCount = recent.filter((s) => s.correction || s.corrected_label).length;

  const states = {};
  recent.forEach((s) => {
    const label = s.corrected_label
      || s.correction_emotion
      || s.selected_hypothesis
      || s.top_hypothesis
      || s.hypotheses_json?.[0]?.category
      || s.hypotheses?.[0]?.category
      || null;
    if (!label) return;
    states[label] = (states[label] || 0) + 1;
  });

  const topState = Object.entries(states).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    total: recent.length,
    validatedRatio: Number((validatedCount / recent.length).toFixed(3)),
    correctedRatio: Number((correctedCount / recent.length).toFixed(3)),
    topState,
  };
}

async function getVoiceProfile(dogId) {
  if (!dogId) return null;
  const { data, error } = await supabase
    .from('dog_voice_profile')
    .select('*')
    .eq('dog_id', dogId)
    .maybeSingle();

  if (error) {
    console.warn('[AI] voice profile unavailable', error.message);
    return null;
  }

  return data;
}

async function invokeInterpretation(supabaseClient, dog, context, bodyLanguage, scanHistory, mode, audioMetadata = null) {
  const historySignals = buildHistorySignals(scanHistory);
  const voiceProfile = await getVoiceProfile(dog?.id);

  const { data, error } = await supabaseClient.functions.invoke('interpret-scan', {
    body: {
      dog,
      context,
      bodyLanguage,
      scanHistory,
      historySignals,
      voiceProfile,
      mode,
      audioMetadata,
    },
  });

  if (error) throw error;
  if (!data?.ok || !data?.data?.hypotheses?.length) {
    throw new Error('invalid_interpret_scan_response');
  }

  return data.data;
}

export async function interpretBark(dog, context, bodyLanguage, scanHistory, mode, audioMetadata = null) {
  try {
    return await invokeInterpretation(supabase, dog, context, bodyLanguage, scanHistory, mode, audioMetadata);
  } catch (error) {
    throw normalizeClientError(error);
  }
}

export async function interpretBarkSecure(supabaseClient, dog, context, bodyLanguage, scanHistory, mode, audioMetadata = null) {
  try {
    return await invokeInterpretation(supabaseClient, dog, context, bodyLanguage, scanHistory, mode, audioMetadata);
  } catch (error) {
    throw normalizeClientError(error);
  }
}

export const EMOTION_COLORS = {
  'Alerte / Territorial': '#FF9F43',
  'Excitation / Joie': '#00F0C0',
  'Peur': '#A78BFA',
  'Frustration': '#FF5A6E',
  'Demande d\'attention': '#58C4FF',
  'Douleur': '#FF5A6E',
  'Curiosité': '#FFD640',
  'Anxiété de séparation': '#FF7EB3',
  'Ennui': '#8494AA',
  'Territorialité': '#FF9F43',
  'Envie de jouer': '#00F0C0',
  'Protection': '#FF9F43',
};
