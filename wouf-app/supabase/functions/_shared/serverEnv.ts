// Server-only env helper for Supabase Edge Functions.
// Never import this file in frontend app code.

export function getSupabaseUrl() {
  return Deno.env.get('SUPABASE_URL') || '';
}

export function getServiceRoleKey() {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('WOUF_SSK') || '';
}

export function hasAnthropicKey() {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

export function readServerEnv() {
  return {
    hasSupabaseUrl: Boolean(getSupabaseUrl()),
    hasServiceRoleKey: Boolean(getServiceRoleKey()),
    hasAnthropicKey: hasAnthropicKey(),
  };
}
