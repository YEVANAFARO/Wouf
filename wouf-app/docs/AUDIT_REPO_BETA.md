# AUDIT_REPO_BETA.md

## Périmètre audité
Audit réalisé exclusivement sur le dossier produit actif `wouf-app/`.

Sources de vérité utilisées :
- `AGENTS.md`
- `PRODUCT_SCOPE.md`
- `BUILD_PLAN_BETA.md`
- `docs/specs/*`

## Inventaire synthétique

### Code produit actif
- App Expo React Native centrée sur `App.js` + `src/`.
- Services cœur présents : `audio`, `ai`, `database`, config Supabase.
- Écrans MVP déjà en place : onboarding, auth, scan, historique, cartographie, profil.

### Backend / data
- Schéma SQL principal version legacy dans `database.sql`.
- Dossier `supabase/migrations/` présent mais vide (placeholder).
- Dossier `supabase/functions/` présent mais vide (placeholder).

### Documentation produit
- Cadrage produit cohérent et orienté bêta fermée dans:
  - `PRODUCT_SCOPE.md`
  - `BUILD_PLAN_BETA.md`
  - `docs/specs/*.md`

### Archives / duplications
- `archive-assets/wouf-app-mvp/wouf-app/` contient une copie du MVP.
- Des documents legacy existent aussi dans `docs/archive/`.

## Constats détaillés (problèmes / risques)

### 1) Incohérence majeure DB: legacy vs V2 cible
- `database.sql` décrit un modèle orienté gamification/XP/coins, différent de la V2 attendue.
- `docs/specs/DATABASE_V2_SPEC.md` attend des tables non implémentées (`scan_features`, `dog_voice_profile`, `scan_state_scores`, etc.).
- Risque: blocage des features clés V1 (empreinte sonore avancée, cartographie avancée, moteur probabiliste enrichi).

### 2) Secrets IA exposables côté frontend
- Appels Anthropic directs dans le frontend (`src/services/ai.js`, `src/services/audio.js`, `src/screens/scan/ScanFlowScreen.js`).
- Contradiction directe avec la contrainte: « aucun secret IA dans le frontend ».
- Risque sécurité + risque coût (clé récupérable).

### 3) Architecture Supabase incomplète pour production bêta
- `supabase/migrations/README.md` et `supabase/functions/README.md` sont des placeholders.
- Aucune migration SQL versionnée, aucune Edge Function implémentée.
- Risque: impossible de reproduire/provisionner proprement l’environnement.

### 4) Couverture produit partielle vs spec business
- Le paywall/plans existent côté constantes (`PLANS`), mais pas de couche d’enforcement robuste visible côté backend.
- Le shop teaser est à valider côté UI/route dédiée (présence partielle).
- Le parrainage est mentionné UI/signup mais pas finalisé de bout en bout côté persistance/règles de paliers V2.

### 5) Dette technique / maintenance
- Code très concentré dans quelques gros fichiers (notamment `ScanFlowScreen.js` et `audio.js`).
- Mélange logique métier + UI + orchestration réseau.
- Risque: vélocité ralentie sur les itérations bêta.

### 6) Legacy et doublons dans le repo
- `archive-assets/wouf-app-mvp/wouf-app/` contient des fichiers strictement identiques à la racine active pour plusieurs entrées critiques (`App.js`, `database.sql`, `package.json`).
- Présence de `docs/archive/*` legacy : utile en historique, mais source potentielle de confusion.

### 7) Hygiène repo
- Dépendances locales non ignorées par défaut (absence initiale de `.gitignore`).
- Risque de commits accidentels lourds (`node_modules`).

## Ce qu’on garde / archive / refactor

### À garder (base active)
- `App.js`
- `src/` (structure écrans + services existants)
- `PRODUCT_SCOPE.md`, `BUILD_PLAN_BETA.md`, `docs/specs/*` comme référence fonctionnelle.

### À archiver (lecture seule)
- `archive-assets/**`
- `docs/archive/**`
- `database.sql` (comme schéma legacy de référence à migrer, pas comme cible finale).

### À refactorer prioritairement
1. Data layer: migration `database.sql` legacy → V2 alignée specs.
2. IA: suppression des appels IA directs frontend, passage Edge Functions.
3. Scan pipeline: séparation UI / orchestration / scoring.
4. Monétisation/parrainage: robustesse backend (règles et quotas).

## Priorités (ordre strict)
1. **Sécurité**: retirer les secrets IA du client et basculer les appels en server-side.
2. **Data model V2**: aligner le schéma DB sur `DATABASE_V2_SPEC.md`.
3. **Pipeline scan fiable**: bark detection + features + persistance normalisée.
4. **Interprétation probabiliste**: top hypothèses + conseils + vet flag via backend.
5. **Feedback loop**: validation/correction + apprentissage progressif.
6. **Monétisation/parrainage**: paywall Free/Plus/Pro + referral onboarding.
7. **Cartographie émotionnelle V1 avancée** + shop teaser visible.

## Plan incrémental par lots (ordre exact)

### Lot 1 — Stabilisation repo + fondations infra
- Geler les archives (documenter clairement l’exclusion d’`archive-assets`).
- Ajouter règles d’hygiène repo (gitignore, conventions env).
- Créer squelette migrations Supabase versionnées.
- Créer squelette Edge Functions (healthcheck + secure env read).

### Lot 2 — Migration Base de Données V2
- Écrire migration SQL V2 à partir de `docs/specs/DATABASE_V2_SPEC.md`.
- Créer/adapter RLS table par table.
- Préparer scripts de seed minimal bêta.
- Maintenir compatibilité transitoire avec schéma legacy si nécessaire.

### Lot 3 — Backend IA sécurisé
- Implémenter Edge Function `interpret-scan`.
- Implémenter Edge Function `verify-audio` (ambigu bark/non-bark).
- Déplacer toute clé IA côté serveur et retirer les appels directs client.
- Standardiser payload entrée/sortie selon spec d’interprétation.

### Lot 4 — Pipeline scan audio V1 exploitable
- Normaliser capture + extraction features.
- Persister `scans` + `scan_features`.
- Ajouter gestion d’erreurs robuste et fallback utilisateur clair.

### Lot 5 — Empreinte sonore avancée V1
- Implémenter `dog_voice_profile` + calcul similarité.
- Mettre à jour fiabilité selon scans validés.
- Exposer états: apprentissage / faible / moyen / bon.

### Lot 6 — Boucle feedback & apprentissage
- Brancher validation/correction utilisateur.
- Alimenter `user_feedback_events` et patterns récurrents.
- Ajuster pondération historique + profil vocal dans le scoring.

### Lot 7 — Monétisation + parrainage + UX bêta
- Finaliser logique Free/Plus/Pro (quotas réels).
- Finaliser onboarding referral et paliers fondateur.
- Garantir visibilité du shop en mode “À venir”.

### Lot 8 — Cartographie émotionnelle avancée V1
- Alimenter `scan_state_scores` + `recurring_patterns`.
- Construire vues/agrégations utiles (heatmap horaire, tendances).
- Vérifier wording prudent (non-clinique, non-définitif).

### Lot 9 — Hardening bêta fermée
- QA parcours critique complet (`docs/specs/TEST_PLAN_BETA.md`).
- Correctifs bloquants.
- Préparation release build bêta + checklist instrumentation.

## Prompt exact recommandé pour le lot suivant

```text
Exécute uniquement le LOT 1 du plan AUDIT_REPO_BETA.md, sans déborder sur les autres lots.

Objectif du lot 1:
1) Stabilisation repo + fondations infra
- Geler les archives (documenter clairement que archive-assets est hors code actif)
- Vérifier/compléter l’hygiène repo (gitignore/env)
- Créer le squelette de migrations Supabase versionnées
- Créer le squelette Edge Functions (au minimum healthcheck)

Contraintes:
- Travailler uniquement dans wouf-app/
- Ne pas faire de refonte UI
- Ne pas implémenter encore la migration DB V2 complète
- Ne pas brancher encore l’IA réelle
- Réutiliser au maximum le code existant

Livrables attendus:
- fichiers créés/modifiés
- justification rapide de chaque choix
- commandes de vérification exécutées
- risques restants
```
