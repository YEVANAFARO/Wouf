import { callAnthropicJson } from '../_shared/anthropic.ts';

function safeJsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return safeJsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const payload = await req.json();
    const { audioBase64, audioMimeType = 'audio/mp4', baseline = {} } = payload ?? {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return safeJsonResponse(400, { ok: false, error: 'invalid_payload' });
    }

    const prompt = `Tu classes cet audio canin en 3 états:
- bark (aboiement probable)
- non_bark (voix humaine, bruit, imitation)
- uncertain (ambigu)

Contexte baseline local: ${JSON.stringify(baseline)}

Réponds JSON STRICT:
{
  "classification": "bark|non_bark|uncertain",
  "confidence": 0,
  "reason": "phrase courte en français"
}`;

    const ai = await callAnthropicJson({
      userText: prompt,
      maxTokens: 400,
      extraContent: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: audioMimeType,
            data: audioBase64,
          },
        },
      ],
    });

    const raw = String(ai?.classification || 'uncertain');
    const classification = raw === 'bark' || raw === 'non_bark' || raw === 'uncertain' ? raw : 'uncertain';
    const confidence = Math.max(0, Math.min(100, Number(ai?.confidence || 0)));
    const reason = String(ai?.reason || 'Analyse audio ambiguë.');

    return safeJsonResponse(200, {
      ok: true,
      data: {
        classification,
        confidence,
        reason,
      },
    });
  } catch (error) {
    console.error('[verify-audio] failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });

    return safeJsonResponse(500, {
      ok: false,
      error: 'verify_audio_failed',
    });
  }
});
