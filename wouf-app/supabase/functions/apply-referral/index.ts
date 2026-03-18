import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveReferralTier } from '../_shared/monetization.ts';
import { getServiceRoleKey, getSupabaseUrl } from '../_shared/serverEnv.ts';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();

    if (!supabaseUrl || !serviceKey) {
      console.error('[apply-referral] missing server env');
      return json(500, { ok: false, error: 'server_not_configured' });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const payload = await req.json();
    const newUserId = String(payload?.newUserId || '');
    const referralCode = String(payload?.referralCode || '').trim().toUpperCase();

    if (!newUserId || !referralCode) return json(400, { ok: false, error: 'invalid_payload' });

    const { data: newUserProfile, error: newUserError } = await admin
      .from('profiles')
      .select('id, referred_by')
      .eq('id', newUserId)
      .maybeSingle();

    if (newUserError || !newUserProfile) return json(404, { ok: false, error: 'new_user_profile_not_found' });

    if (newUserProfile.referred_by) {
      return json(200, { ok: true, data: { applied: false, reason: 'already_referred' } });
    }

    const { data: referrer, error: refError } = await admin
      .from('profiles')
      .select('id, referral_code, referral_count')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (refError || !referrer) return json(404, { ok: false, error: 'referral_code_not_found' });
    if (referrer.id === newUserId) return json(400, { ok: false, error: 'self_referral_not_allowed' });

    const nextCount = Number(referrer.referral_count || 0) + 1;
    const tier = resolveReferralTier(nextCount);

    const { error: referrerUpdateError } = await admin
      .from('profiles')
      .update({
        referral_count: nextCount,
        founder_status: tier.founder_status,
        beta_priority_score: tier.beta_priority_score,
      })
      .eq('id', referrer.id);

    if (referrerUpdateError) {
      console.error('[apply-referral] referrer update failed', referrerUpdateError.message);
      return json(500, { ok: false, error: 'referrer_update_failed' });
    }

    const { error: newUserUpdateError } = await admin
      .from('profiles')
      .update({
        referred_by: referralCode,
      })
      .eq('id', newUserId)
      .is('referred_by', null);

    if (newUserUpdateError) {
      console.error('[apply-referral] new user update failed', newUserUpdateError.message);
      return json(500, { ok: false, error: 'new_user_update_failed' });
    }

    return json(200, {
      ok: true,
      data: {
        applied: true,
        referral_count: nextCount,
        founder_status: tier.founder_status,
        beta_priority_score: tier.beta_priority_score,
        tier_label: tier.label,
      },
    });
  } catch (error) {
    console.error('[apply-referral] failed', error instanceof Error ? error.message : 'unknown_error');
    return json(500, { ok: false, error: 'apply_referral_failed' });
  }
});
