const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

function extractTextBlocks(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((block: any) => (block?.type === 'text' ? block.text : ''))
    .join('');
}

export function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function callAnthropicJson({
  system,
  userText,
  maxTokens = 1200,
  model = DEFAULT_MODEL,
  extraContent = [],
}: {
  system?: string;
  userText: string;
  maxTokens?: number;
  model?: string;
  extraContent?: Array<Record<string, unknown>>;
}) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('missing_anthropic_api_key');
  }

  const payload: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userText }, ...extraContent],
      },
    ],
  };

  if (system) payload.system = system;

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[anthropic] request_failed', { status: response.status, body: errText.slice(0, 400) });
    throw new Error(`anthropic_http_${response.status}`);
  }

  const json = await response.json();
  const text = extractTextBlocks((json as any).content);
  if (!text) {
    throw new Error('anthropic_empty_response');
  }

  return parseJsonSafe(text);
}
