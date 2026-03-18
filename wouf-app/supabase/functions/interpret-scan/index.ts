import { callAnthropicJson } from '../_shared/anthropic.ts';

type Hypothesis = {
  category: string;
  confidence: number;
  explanation: string;
  actions: string[];
  isRedFlag?: boolean;
  source_breakdown?: Record<string, number>;
  color?: string;
  emoji?: string;
};

function safeJsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function normalizeHypothesis(h: any): Hypothesis {
  return {
    category: String(h?.category || 'État indéterminé'),
    confidence: Math.max(0, Math.min(100, Number(h?.confidence || 0))),
    explanation: String(h?.explanation || 'Aucune explication disponible.'),
    actions: Array.isArray(h?.actions) ? h.actions.slice(0, 3).map((x: any) => String(x)) : [],
    isRedFlag: Boolean(h?.isRedFlag),
    source_breakdown: typeof h?.source_breakdown === 'object' && h?.source_breakdown ? h.source_breakdown : undefined,
    color: h?.color ? String(h.color) : undefined,
    emoji: h?.emoji ? String(h.emoji) : undefined,
  };
}

function applyLearningWeighting({
  hypotheses,
  historySignals,
  voiceProfile,
}: {
  hypotheses: Hypothesis[];
  historySignals?: any;
  voiceProfile?: any;
}) {
  const weighted = hypotheses.map((h) => ({ ...h }));

  if (!weighted.length) return weighted;

  const topHistoryState = historySignals?.topState ? String(historySignals.topState).toLowerCase() : null;
  const historyTrust = Number(historySignals?.validatedRatio || 0);
  const voiceTrustMap: Record<string, number> = { learning: 0.02, low: 0.04, medium: 0.07, good: 0.1 };
  const voiceTrust = voiceTrustMap[String(voiceProfile?.reliability_level || 'learning')] || 0.02;

  weighted.forEach((h) => {
    const label = h.category.toLowerCase();
    if (topHistoryState && label.includes(topHistoryState)) {
      h.confidence += Math.round(8 * historyTrust);
    }

    if (voiceProfile?.sample_count >= 3 && h.source_breakdown?.voiceprint != null) {
      const vpBoost = Math.round(10 * voiceTrust * Number(h.source_breakdown.voiceprint));
      h.confidence += vpBoost;
    }
  });

  // normalize to ~100 while preserving ordering intent
  const sum = weighted.reduce((acc, h) => acc + h.confidence, 0) || 1;
  weighted.forEach((h) => {
    h.confidence = Math.max(1, Math.round((h.confidence / sum) * 100));
  });

  weighted.sort((a, b) => b.confidence - a.confidence);
  return weighted;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return safeJsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const payload = await req.json();
    const {
      dog,
      context,
      bodyLanguage,
      scanHistory = [],
      historySignals = null,
      voiceProfile = null,
      mode = 'quick',
      audioMetadata = null,
    } = payload ?? {};

    if (!dog || !context || !bodyLanguage) {
      return safeJsonResponse(400, { ok: false, error: 'invalid_payload' });
    }

    const prompt = `Tu es WOUF, assistant d'interprétation comportementale canine probabiliste.

ENTRÉE:
- dog: ${JSON.stringify(dog)}
- context: ${JSON.stringify(context)}
- bodyLanguage: ${JSON.stringify(bodyLanguage)}
- scanHistory (max 10): ${JSON.stringify(Array.isArray(scanHistory) ? scanHistory.slice(0, 10) : [])}
- historySignals: ${JSON.stringify(historySignals)}
- voiceProfile: ${JSON.stringify(voiceProfile)}
- mode: ${JSON.stringify(mode)}
- audioMetadata: ${JSON.stringify(audioMetadata)}

RÈGLES:
- Pas de traduction littérale, pas de diagnostic définitif.
- Proposer exactement 3 hypothèses classées par probabilité.
- Confidence globale + confidence par hypothèse.
- Ajouter source_breakdown simple (audio/context/body/history/voiceprint entre 0 et 1).
- Si risque santé possible: vet_flag true.
- Conseils concrets, prudents, non coercitifs.
- Si history/voiceProfile est faible, rester prudent et l'indiquer implicitement.

RÉPONDS EN JSON STRICT:
{
  "hypotheses": [
    {
      "category": "...",
      "confidence": 0,
      "explanation": "...",
      "actions": ["...", "...", "..."],
      "isRedFlag": false,
      "source_breakdown": {"audio":0.2,"context":0.2,"body":0.2,"history":0.2,"voiceprint":0.2},
      "emoji": "...",
      "color": "#..."
    }
  ],
  "confidence_top": 0,
  "ai_advice": "...",
  "vet_flag": false,
  "top_hypothesis": "...",
  "scan_state_scores": [
    {"state_code":"...","score":0,"rank":1,"source_breakdown":{}}
  ]
}`;

    const ai = await callAnthropicJson({ userText: prompt, maxTokens: 1200 });

    const hypothesesRaw = Array.isArray(ai?.hypotheses)
      ? ai.hypotheses.slice(0, 3).map(normalizeHypothesis)
      : [];

    if (hypothesesRaw.length === 0) {
      return safeJsonResponse(502, { ok: false, error: 'empty_hypotheses' });
    }

    const hypotheses = applyLearningWeighting({
      hypotheses: hypothesesRaw,
      historySignals,
      voiceProfile,
    });

    const topHypothesis = hypotheses[0]?.category || String(ai?.top_hypothesis || '');
    const confidenceTop = hypotheses[0]?.confidence || Number(ai?.confidence_top || 0);

    const response = {
      ok: true,
      data: {
        hypotheses,
        confidence_top: Math.max(0, Math.min(100, Number(confidenceTop || 0))),
        ai_advice: String(ai?.ai_advice || ''),
        vet_flag: Boolean(ai?.vet_flag || hypotheses.some((h) => h.isRedFlag)),
        top_hypothesis: topHypothesis,
        scan_state_scores: Array.isArray(ai?.scan_state_scores) ? ai.scan_state_scores : [],

        recurring_pattern: null,
        cartography_note: null,
        advice: String(ai?.ai_advice || ''),
      },
    };

    return safeJsonResponse(200, response);
  } catch (error) {
    console.error('[interpret-scan] failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });

    return safeJsonResponse(500, {
      ok: false,
      error: 'interpret_scan_failed',
    });
  }
});
