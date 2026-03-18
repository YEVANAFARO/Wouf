# LOT 7 — Monétisation / Referral / Shop teaser (V1)

## Mapping explicite Free / Plus / Pro
Source: `src/services/monetization.js`.

- `free`
  - `scansPerDay: 3`
  - `maxDogs: 1`
  - `historyDays: 7`
- `plus`
  - `scansPerDay: Infinity`
  - `maxDogs: 3`
  - `historyDays: 90`
- `pro`
  - `scansPerDay: Infinity`
  - `maxDogs: Infinity`
  - `historyDays: Infinity`

Fallback sécurisé: plan absent/invalide => `free`.

## Gating scans réellement appliqué
Dans `ScanFlowScreen.startRecording`:
1. lecture du nombre de scans du jour (`scanService.countTodayForUser`)
2. calcul `canScanWithPlan({ plan, todayCount })`
3. blocage si limite atteinte + message d’upgrade Plus/Pro

## Referral & founder tiers (V1)
Paliers gérés:
- 1 referral
- 3 referrals
- 5 referrals
- 10 referrals

Effets:
- `founder_status`
- `beta_priority_score`
- label de palier

## Persistance referral
- Edge Function `apply-referral` (server-side) applique le code de parrainage:
  - vérifie le profil du nouvel utilisateur
  - vérifie le code referral
  - empêche auto-parrainage
  - incrémente `referral_count` du parrain
  - met à jour `founder_status` + `beta_priority_score` du parrain
  - renseigne `referred_by` du nouvel utilisateur

Côté app (`AuthScreen`):
- après signup, tentative non bloquante d’appliquer le referral
- fallback sûr en cas d’échec (pas de crash signup)

## Shop teaser
- Shop rendu visible en mode teaser “À venir” dans Home et Profile
- aucune logique e-commerce réelle ajoutée
