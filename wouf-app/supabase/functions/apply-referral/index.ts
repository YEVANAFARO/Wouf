import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceRoleKey, getSupabaseUrl } from '../_shared/serverEnv.ts';

type ApplyReferralResult = {
  applied: boolean;
  reason: string | null;
  referral_count: number | null;
  founder_status: string | null;
  beta_priority_score: number | null;
  tier_label: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mapRpcError(message: string | undefined) {
  switch (message) {
    case 'new_user_profile_not_found':
      return { status: 404, error: 'new_user_profile_not_found' };
    case 'referral_code_not_found':
      return { status: 404, error: 'referral_code_not_found' };
    case 'self_referral_not_allowed':
      return { status: 400, error: 'self_referral_not_allowed' };
    default:
      return null;
  }
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

    const rpcResponse = await admin
      .rpc('apply_referral_code', {
        p_new_user_id: newUserId,
        p_referral_code: referralCode,
      })
      .single();

    const data = rpcResponse.data as ApplyReferralResult | null;
    const { error } = rpcResponse;

    if (error) {
      const mappedError = mapRpcError(error.message);
      if (mappedError) return json(mappedError.status, { ok: false, error: mappedError.error });

      console.error('[apply-referral] rpc failed', error.message);
      return json(500, { ok: false, error: 'apply_referral_failed' });
    }

    if (!data) {
      console.error('[apply-referral] rpc returned no payload');
      return json(500, { ok: false, error: 'apply_referral_failed' });
    }

    if (!data.applied) {
      return json(200, {
        ok: true,
        data: {
          applied: false,
          reason: data.reason || 'already_referred',
        },
      });
    }

    return json(200, {
      ok: true,
      data: {
        applied: true,
        referral_count: data.referral_count,
        founder_status: data.founder_status,
        beta_priority_score: data.beta_priority_score,
        tier_label: data.tier_label,
      },
    });
  } catch (error) {
    console.error('[apply-referral] failed', error instanceof Error ? error.message : 'unknown_error');
    return json(500, { ok: false, error: 'apply_referral_failed' });
  }
});
