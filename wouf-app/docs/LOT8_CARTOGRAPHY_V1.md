# LOT 8 — Cartographie émotionnelle avancée V1

## Sources de données utilisées
- `scan_state_scores`
  - `state_code`
  - `score`
  - `rank`
  - `source_breakdown`
- `scans`
  - `validated`
  - `validated_hypothesis`
  - `corrected_label`
  - `correction_emotion`
  - `selected_hypothesis`
  - `top_hypothesis`
  - `hour_of_day`
  - `context_json` / fallback `context`
  - `ai_advice`
  - `scanned_at` / fallback `created_at`
- `recurring_patterns`
  - `pattern_type`
  - `label`
  - `score`
  - `source_json`

## Agrégations V1 retenues
1. **États probables**
   - Somme des scores `scan_state_scores.score` par `state_code`
   - Classement décroissant

2. **États validés / corrigés**
   - Priorité à `corrected_label` / `correction_emotion`
   - Sinon `selected_hypothesis` / hypothèse validée
   - Affichage séparé des états probables

3. **Heatmap horaire simplifiée**
   - Comptage par `hour_of_day`
   - Représentation barres 0–23h

4. **Top déclencheurs**
   - Comptage des clés vraies dans `context_json` (ou fallback `context`)

5. **Top contextes**
   - Regroupement simple des combinaisons de contextes vraies par scan
   - Limité aux 3 premières clés triées pour garder une lecture lisible

6. **Évolution dans le temps**
   - Vue hebdomadaire simple par jour de semaine
   - Basée sur `scanned_at` avec fallback `created_at`

7. **Tendances récurrentes**
   - Lecture directe de `recurring_patterns`
   - Affichage type / label / intensité observée

## Safety / wording
- Lecture probabiliste et indicative uniquement
- Pas de diagnostic vétérinaire ou comportemental certain
- Si l’historique est insuffisant, l’écran le dit explicitement
