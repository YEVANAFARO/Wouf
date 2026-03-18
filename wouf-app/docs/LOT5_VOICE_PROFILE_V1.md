# LOT 5 — Empreinte sonore V1 (pragmatique)

## Objectif
Mettre à jour `dog_voice_profile` à partir de `scan_features`, avec une logique simple, stable et explicable.

## Scans exploitables
Un scan est utilisé pour le profil vocal seulement si:
- `isBark = true`
- `peak_freq > 0`
- `rms_energy >= 8` (proxy V1)
- `burst_count >= 1`

Sinon, le scan est ignoré pour l’agrégation du profil vocal.

## Agrégation retenue (V1)
Pour chaque scan exploitable:
- `sample_count` += 1
- moyennes incrémentales pour:
  - `avg_peak_freq`, `avg_centroid`, `avg_rolloff`, `avg_rms`, `avg_zcr`
  - `avg_low_band`, `avg_mid_band`, `avg_high_band`
  - `avg_bark_rate`, `avg_burst_count`
- `variance_json` mis à jour avec une variance simple incrémentale
- `profile_vector` snapshot des moyennes

## Reliability level
Basé sur `sample_count`:
- `< 3` => `learning`
- `3-5` => `low`
- `6-11` => `medium`
- `>= 12` => `good`

## Similarité scan vs profil
Si le profil a au moins 2 échantillons:
- score par métrique = `max(0, 1 - |scan - moyenne| / scale)`
- similarité finale = moyenne des scores * 100
- sortie: `{ similarity, confidence: reliability_level, comparedMetrics }`

Si le profil est trop jeune ou données manquantes:
- `similarity = null`

## Mapping explicite `dog_voice_profile`
- `sample_count`
- `avg_peak_freq`
- `avg_centroid`
- `avg_rolloff`
- `avg_rms`
- `avg_zcr`
- `avg_low_band`
- `avg_mid_band`
- `avg_high_band`
- `avg_bark_rate`
- `avg_burst_count`
- `variance_json`
- `profile_vector`
- `reliability_level`

## Note produit
Cette V1 améliore la personnalisation progressivement sans prétendre à une preuve absolue.
