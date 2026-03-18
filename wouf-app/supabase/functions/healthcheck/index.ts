import { readServerEnv } from '../_shared/serverEnv.ts';

Deno.serve((_req) => {
  const env = readServerEnv();

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'wouf-supabase-edge',
      function: 'healthcheck',
      timestamp: new Date().toISOString(),
      env,
      note: 'No secret value is returned, only boolean presence flags.',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    }
  );
});
