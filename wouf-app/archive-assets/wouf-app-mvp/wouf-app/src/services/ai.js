/**
 * WOUF — AI Interpretation Service
 * ═══════════════════════════════════
 * FEATURE #2 (MUST HAVE): Analyse IA fonctionnelle (API Anthropic)
 * 
 * Ce service gère:
 * 1. Construction du prompt enrichi (profil chien + contexte + body + historique)
 * 2. Appel API Anthropic Claude Sonnet
 * 3. Parsing sécurisé de la réponse JSON
 * 4. Fallback en cas d'erreur
 */

// ⚠️ REMPLACER PAR TA PROPRE CLÉ API
// En production: stocker côté serveur (Supabase Edge Function)
const ANTHROPIC_API_KEY = 'YOUR_API_KEY';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Construire le prompt d'interprétation
 */
function buildPrompt(dog, context, bodyLanguage, scanHistory, mode) {
  // Résumé de l'historique (8 derniers scans)
  const historyStr = scanHistory
    .slice(0, 8)
    .map(s => {
      const status = s.correction
        ? `CORRIGÉ→${s.correction_emotion}`
        : s.validated
        ? '✓'
        : '?';
      return `${s.hypotheses?.[0]?.category || '?'}(${s.hypotheses?.[0]?.confidence || '?'}%) ${status}`;
    })
    .join('; ');

  // Contexte sélectionné
  const contextStr = Object.entries(context || {})
    .filter(([_, v]) => v)
    .map(([k]) => k)
    .join(', ') || 'Non précisé';

  // Body language
  const bodyStr = Object.entries(bodyLanguage || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ') || 'Non observé';

  return `Tu es WOUF, un interprète canin IA expert en comportement animal. Tu analyses les aboiements de chiens en croisant le profil unique du chien, le contexte situationnel, le body language observé et l'historique comportemental.

PROFIL DU CHIEN:
- Nom: ${dog.name}
- Sexe: ${dog.sex || '?'}
- Race: ${dog.breed || dog.breed_mode || '?'}${dog.mix_breeds?.length ? ' (croisé: ' + dog.mix_breeds.join(', ') + ')' : ''}
- Gabarit: ${dog.size || '?'}
- Stérilisé: ${dog.neutered || '?'}
- Personnalité: ${dog.personality?.join(', ') || '?'}
- Déclencheurs connus: ${dog.triggers?.join(', ') || '?'}
- Environnement: ${dog.housing || '?'}, seul ${dog.alone_time || '?'}/jour
- Autres animaux: ${dog.other_animals || '?'}
- Santé: ${dog.health_signs?.join(', ') || 'RAS'}
- Activités favorites: ${dog.fav_activities?.join(', ') || '?'}

MODE D'ANALYSE: ${mode === 'precise' ? 'Précis (7 questions body language)' : 'Rapide (3 questions)'}

CONTEXTE OBSERVÉ: ${contextStr}

BODY LANGUAGE: ${bodyStr}

HISTORIQUE (${scanHistory.length} scans): ${historyStr || 'Aucun historique'}

INSTRUCTIONS:
- Propose EXACTEMENT 3 hypothèses émotionnelles, classées par probabilité décroissante
- La somme des confidences doit avoisiner 100%
- Chaque hypothèse doit avoir 3 conseils pratiques et actionnables
- Si tu détectes un signe de douleur ou d'urgence médicale, marque isRedFlag: true
- Adapte tes explications au profil UNIQUE de ce chien (personnalité, déclencheurs, historique)
- Si l'historique montre un pattern récurrent, signale-le dans recurring_pattern
- Si l'historique a 10+ scans validés, donne un conseil personnalisé dans advice

RÉPONDS UNIQUEMENT EN JSON STRICT (pas de markdown, pas de texte autour):
{
  "hypotheses": [
    {
      "category": "Nom de l'émotion",
      "emoji": "emoji",
      "confidence": 55,
      "color": "#hexcolor",
      "explanation": "2 phrases explicatives en français",
      "actions": ["conseil 1", "conseil 2", "conseil 3"],
      "isRedFlag": false
    }
  ],
  "cartography_note": "Note pour la cartographie émotionnelle ou null",
  "recurring_pattern": "Pattern récurrent détecté ou null",
  "advice": "Conseil personnalisé si 10+ scans validés ou null"
}`;
}

/**
 * Appeler l'API Anthropic pour interpréter un aboiement
 * 
 * @param {Object} dog - Profil du chien
 * @param {Object} context - Contexte sélectionné par l'utilisateur
 * @param {Object} bodyLanguage - Réponses body language
 * @param {Array} scanHistory - Historique des scans précédents
 * @param {string} mode - 'quick' ou 'precise'
 * @returns {Object|null} Résultat IA ou null en cas d'erreur
 */
export async function interpretBark(dog, context, bodyLanguage, scanHistory, mode) {
  const prompt = buildPrompt(dog, context, bodyLanguage, scanHistory, mode);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('[AI] API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.content
      ?.map(block => (block.type === 'text' ? block.text : ''))
      .join('') || '';

    // Parser le JSON (en nettoyant les éventuels backticks markdown)
    const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
    const result = JSON.parse(cleaned);

    // Validation basique
    if (!result.hypotheses || !Array.isArray(result.hypotheses) || result.hypotheses.length === 0) {
      console.error('[AI] Invalid response structure');
      return null;
    }

    return result;
  } catch (error) {
    console.error('[AI] Interpretation error:', error);
    return null;
  }
}

/**
 * Version SÉCURISÉE via Supabase Edge Function
 * (recommandé en production pour ne pas exposer la clé API)
 * 
 * Créer une Edge Function Supabase qui reçoit les params et appelle l'API
 */
export async function interpretBarkSecure(supabase, dog, context, bodyLanguage, scanHistory, mode) {
  try {
    const { data, error } = await supabase.functions.invoke('interpret-bark', {
      body: { dog, context, bodyLanguage, scanHistory, mode },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[AI] Secure interpretation error:', error);
    // Fallback: appel direct (dev seulement)
    return interpretBark(dog, context, bodyLanguage, scanHistory, mode);
  }
}

/**
 * Couleurs par défaut pour les catégories émotionnelles
 */
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
