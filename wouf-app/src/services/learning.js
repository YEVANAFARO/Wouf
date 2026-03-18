import { supabase } from '../config/supabase';

export const FEEDBACK_EVENT_MAPPING = {
  feedback_type: 'validate | correct',
  selected_label: 'validated hypothesis label or corrected label',
  free_text: 'optional user free-text correction',
};

export const RECURRING_PATTERN_MAPPING = {
  frequent_state: 'most repeated resolved emotional state across recent scans',
  recurrent_hour: 'most frequent hour_of_day bucket',
  recurrent_trigger: 'most frequent trigger key in context_json',
  repeated_validation: 'high validation ratio on recent scans',
};

function normalizeResolvedLabel(scan) {
  if (scan?.corrected_label) return scan.corrected_label;
  if (scan?.correction && scan?.correction_emotion) return scan.correction_emotion;
  if (scan?.selected_hypothesis) return scan.selected_hypothesis;
  if (scan?.top_hypothesis) return scan.top_hypothesis;
  if (Array.isArray(scan?.hypotheses_json) && scan.hypotheses_json[0]?.category) return scan.hypotheses_json[0].category;
  if (Array.isArray(scan?.hypotheses) && scan.hypotheses[0]?.category) return scan.hypotheses[0].category;
  return null;
}

async function upsertRecurringPattern(dogId, patternType, label, score, sourceJson) {
  const { data: existing, error: lookupError } = await supabase
    .from('recurring_patterns')
    .select('id')
    .eq('dog_id', dogId)
    .eq('pattern_type', patternType)
    .eq('label', label)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from('recurring_patterns')
      .update({ score, source_json: sourceJson })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('recurring_patterns')
    .insert({
      dog_id: dogId,
      pattern_type: patternType,
      label,
      score,
      source_json: sourceJson,
    });
  if (error) throw error;
}

export async function recordUserFeedbackEvent({ scanId, userId, feedbackType, selectedLabel = null, freeText = null }) {
  const { error } = await supabase
    .from('user_feedback_events')
    .insert({
      scan_id: scanId,
      user_id: userId,
      feedback_type: feedbackType,
      selected_label: selectedLabel,
      free_text: freeText,
    });

  if (error) throw error;
}

export async function refreshRecurringPatternsForDog(dogId) {
  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, dog_id, hour_of_day, validated, context_json, context, corrected_label, correction, correction_emotion, selected_hypothesis, top_hypothesis, hypotheses_json, hypotheses')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  if (!scans?.length) return { updated: false, reason: 'no_scans' };

  const recent = scans.slice(0, 80);

  // 1) frequent_state
  const stateCounts = {};
  recent.forEach((s) => {
    const label = normalizeResolvedLabel(s);
    if (!label) return;
    stateCounts[label] = (stateCounts[label] || 0) + 1;
  });

  const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];
  if (topState) {
    const [label, count] = topState;
    await upsertRecurringPattern(dogId, 'frequent_state', label, count / recent.length, { count, window: recent.length });
  }

  // 2) recurrent_hour
  const hourCounts = {};
  recent.forEach((s) => {
    if (typeof s.hour_of_day !== 'number') return;
    hourCounts[s.hour_of_day] = (hourCounts[s.hour_of_day] || 0) + 1;
  });

  const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (topHour) {
    const [hour, count] = topHour;
    await upsertRecurringPattern(dogId, 'recurrent_hour', `hour_${hour}`, count / recent.length, { hour: Number(hour), count, window: recent.length });
  }

  // 3) recurrent_trigger
  const triggerCounts = {};
  recent.forEach((s) => {
    const ctx = s.context_json || s.context || {};
    Object.entries(ctx).forEach(([k, v]) => {
      if (v) triggerCounts[k] = (triggerCounts[k] || 0) + 1;
    });
  });

  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
  if (topTrigger) {
    const [label, count] = topTrigger;
    await upsertRecurringPattern(dogId, 'recurrent_trigger', label, count / recent.length, { count, window: recent.length });
  }

  // 4) repeated_validation
  const validatedCount = recent.filter((s) => s.validated).length;
  const validationRatio = recent.length ? validatedCount / recent.length : 0;
  if (recent.length >= 5) {
    const label = validationRatio >= 0.6 ? 'stable_feedback' : 'unstable_feedback';
    await upsertRecurringPattern(dogId, 'repeated_validation', label, validationRatio, {
      validated_count: validatedCount,
      window: recent.length,
    });
  }

  return { updated: true, window: recent.length };
}
