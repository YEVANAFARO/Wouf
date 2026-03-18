import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceRoleKey, getSupabaseUrl } from '../_shared/serverEnv.ts';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!supabaseUrl || !serviceKey) {
    console.error('[delete-user] missing server env');
    return json(500, { ok: false, error: 'server_not_configured' });
  }

  if (!token) {
    return json(401, { ok: false, error: 'missing_auth_token' });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: authData, error: authError } = await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      console.error('[delete-user] auth failed', authError?.message || 'missing_user');
      return json(401, { ok: false, error: 'invalid_auth_token' });
    }

    const userId = authData.user.id;

    await admin.from('scans').delete().eq('user_id', userId);
    await admin.from('notifications').delete().eq('user_id', userId);
    await admin.from('dogs').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    const { data: files, error: storageListError } = await admin.storage
      .from('dog-photos')
      .list(userId);

    if (storageListError) {
      console.warn('[delete-user] dog-photos list skipped', storageListError.message);
    } else if (files?.length) {
      const { error: storageRemoveError } = await admin.storage
        .from('dog-photos')
        .remove(files.map((file) => `${userId}/${file.name}`));

      if (storageRemoveError) {
        console.warn('[delete-user] dog-photos remove skipped', storageRemoveError.message);
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-user] auth delete failed', deleteError.message);
      return json(500, { ok: false, error: 'delete_user_failed' });
    }

    return json(200, { ok: true, data: { deleted: true, userId } });
  } catch (error) {
    console.error('[delete-user] failed', error instanceof Error ? error.message : 'unknown_error');
    return json(500, { ok: false, error: 'delete_user_failed' });
  }
});
