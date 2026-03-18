import { IS_SUPABASE_CONFIGURED } from '../config/supabase';

const ERROR_RULES = [
  { match: 'invalid login credentials', message: 'Email ou mot de passe incorrect.' },
  { match: 'email not confirmed', message: 'Confirme d’abord ton email via le lien reçu dans ta boîte mail.' },
  { match: 'user already registered', message: 'Un compte existe déjà avec cet email. Essaie de te connecter.' },
  { match: 'signup disabled', message: 'Les inscriptions sont temporairement indisponibles.' },
  { match: 'network request failed', message: 'Connexion réseau indisponible. Réessaie dans un instant.' },
  { match: 'fetch failed', message: 'Connexion réseau indisponible. Réessaie dans un instant.' },
  { match: 'failed to fetch', message: 'Connexion réseau indisponible. Réessaie dans un instant.' },
  { match: 'timeout', message: 'Le service met trop de temps à répondre. Réessaie dans un instant.' },
  { match: 'server_not_configured', message: 'Le service bêta n’est pas encore configuré correctement.' },
  { match: 'missing_anthropic_api_key', message: 'L’interprétation est temporairement indisponible côté serveur.' },
  { match: 'interpret_scan_failed', message: 'Impossible de générer une interprétation pour le moment.' },
  { match: 'invalid_interpret_scan_response', message: 'Le résultat reçu est incomplet. Réessaie avec un nouvel enregistrement.' },
  { match: 'verify_audio_failed', message: 'Impossible de confirmer cet audio pour le moment. Réessaie avec un enregistrement plus clair.' },
  { match: 'scan_persistence_failed', message: 'Le scan n’a pas pu être enregistré pour le moment.' },
  { match: 'scan_features_persistence_failed', message: 'Le scan principal a été gardé, mais certaines analyses secondaires devront être recalculées plus tard.' },
  { match: 'scan_state_scores_persistence_failed', message: 'Le scan principal a été gardé, mais la cartographie sera complétée plus tard.' },
  { match: 'dog_voice_profile_persistence_failed', message: 'Le scan principal a été gardé, mais le profil vocal sera recalculé plus tard.' },
  { match: 'referral_code_not_found', message: 'Ce code parrain semble introuvable.' },
  { match: 'self_referral_not_allowed', message: 'Tu ne peux pas utiliser ton propre code parrain.' },
  { match: 'already_referred', message: 'Un code parrain a déjà été appliqué à ce compte.' },
  { match: 'not authenticated', message: 'Ta session a expiré. Reconnecte-toi pour continuer.' },
  { match: 'missing_dog_id', message: 'Sélectionne d’abord un chien avant de lancer un scan.' },
  { match: 'missing_hypotheses', message: 'Le résultat est incomplet. Réessaie avec un nouvel enregistrement.' },
];

export function getUserFacingError(error, fallback = 'Une erreur temporaire est survenue.') {
  if (!IS_SUPABASE_CONFIGURED) {
    return 'La configuration bêta de l’application est incomplète. Vérifie les variables Supabase avant d’envoyer le build.';
  }

  const raw = String(error?.message || error || '').trim();
  if (!raw) return fallback;

  const normalized = raw.toLowerCase();
  const match = ERROR_RULES.find((rule) => normalized.includes(rule.match));
  return match?.message || fallback;
}

export function getErrorDebugLabel(error) {
  return String(error?.message || error || 'unknown_error');
}
