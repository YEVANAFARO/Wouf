# LOT 6 — Feedback & Learning V1

## Écritures `user_feedback_events` (mapping explicite)
Source: actions utilisateur de validation/correction (`scanService.validate` / `scanService.correct`).

- `scan_id` <- id du scan validé/corrigé
- `user_id` <- utilisateur connecté
- `feedback_type` <- `validate` ou `correct`
- `selected_label` <- label validé ou corrigé
- `free_text` <- texte libre de correction (si fourni)

## Écritures/updates `recurring_patterns` (mapping explicite)
Source: recalcul simple sur scans récents du chien (`refreshRecurringPatternsForDog`).

- `dog_id` <- chien actif
- `pattern_type` <- `frequent_state` | `recurrent_hour` | `recurrent_trigger` | `repeated_validation`
- `label` <- valeur dominante (état, heure, trigger, stabilité)
- `score` <- fréquence relative sur fenêtre récente
- `source_json` <- `{count, window}` ou métriques associées

## Logique V1 patterns récurrents (simple et explicable)
Fenêtre: derniers scans récents (jusqu’à 80 sur les 200 derniers).

1) `frequent_state`
- état émotionnel résolu le plus fréquent (correction > sélection > top)

2) `recurrent_hour`
- heure `hour_of_day` la plus fréquente

3) `recurrent_trigger`
- trigger contextuel vrai le plus fréquent (`context_json` / fallback `context`)

4) `repeated_validation`
- ratio de scans validés sur la fenêtre
- label `stable_feedback` si ratio >= 0.6, sinon `unstable_feedback`

## Pondération historique + profil vocal dans le scoring
Dans `interpret-scan` (Edge Function):
- prise en compte de `historySignals` (topState, validatedRatio)
- prise en compte de `voiceProfile.reliability_level`
- micro-ajustement des confidences des hypothèses puis renormalisation
- fallback prudent si historique/profil insuffisant

## Safety
- Si feedback/pattern update échoue: warning + pas de crash du flow principal
- Si historique insuffisant: sortie conservatrice (pas d’inférence forte)
