# LOT 9 — Hardening bêta fermée

## Objectif
Stabiliser les parcours critiques avant l’envoi à 5–15 premiers testeurs, sans refonte majeure ni nouvelle grosse feature.

## Parcours critiques durcis

### 1) Auth / onboarding
- Validation plus propre des champs email / mot de passe.
- Messages utilisateur non techniques en cas d’erreur Supabase/Auth.
- Persistance des champs optionnels profil (`phone`, `postal_code`, `city`) lors de l’inscription.
- Application du code parrain en mode **non bloquant** : le compte se crée même si le referral échoue.
- Message explicite si le code parrain n’a pas pu être appliqué.
- Création du profil chien sécurisée avec vérification du nom requis.
- Upload photo chien rendu non bloquant : le profil existe même si la photo échoue.

### 2) Scan complet
- Garde-fou si aucun chien actif n’est sélectionné.
- Protection quota Free / Plus / Pro maintenue avant démarrage du scan.
- Message clair si permission micro refusée.
- Protection contre scan interrompu / enregistrement absent.
- Bouton d’annulation explicite pendant enregistrement / vérification IA.
- Nettoyage du timer et de l’enregistrement au démontage écran.
- Fallback propre si l’historique récent n’est pas récupérable.

### 3) verify-audio / interpret-scan / persistence
- Messages non techniques si Edge Function ou réseau indisponible.
- Refus propre des résultats IA incomplets (`hypotheses` absentes ou vides).
- Le scan validé sauvegarde maintenant explicitement :
  - `validated = true`
  - `validated_hypothesis`
  - `selected_hypothesis`
  - `scan_state_scores` si disponibles
- La persistance secondaire devient **tolérante aux erreurs partielles** :
  - si `scan_features`, `scan_state_scores`, `dog_voice_profile` ou le refresh `recurring_patterns` échouent,
  - le scan principal reste sauvegardé,
  - un warning est renvoyé au frontend.

### 4) Validation / correction / historique
- La validation choisie dans l’écran résultat est réellement persistée comme validation utilisateur.
- L’historique résout désormais un libellé fiable même si certaines colonnes legacy/V2 sont absentes.
- Les dates invalides ou manquantes n’entraînent plus de crash visuel.
- L’écran détail scan affiche un fallback propre si la donnée est partielle ou absente.

### 5) Cartographie si peu ou pas de données
- Retour structuré vide côté service si aucun chien ou aucune donnée exploitable.
- Écran cartographie avec états explicites :
  - aucun chien sélectionné,
  - cartographie vide,
  - historique léger,
  - erreur de chargement avec action “Réessayer”.
- Les tableaux horaires / hebdo utilisent des valeurs par défaut sûres.

### 6) Erreurs réseau / erreurs DB / erreurs configuration
- Ajout d’un mapping centralisé de messages utilisateur (`userFacingErrors`).
- L’app n’explose plus au boot si les variables Supabase publiques sont absentes :
  - client initialisé avec placeholders,
  - warning console,
  - message utilisateur explicite.
- Les actions sensibles profil (suppression données / déconnexion) affichent maintenant des erreurs propres si elles échouent.

## Garde-fous ajoutés
- `getAuthenticatedUser()` pour éviter les accès user nuls dispersés.
- `createEmptyCartographyStats()` pour garantir une structure sûre côté cartographie.
- Protection `missing_dog_id` / `missing_hypotheses` lors de la sauvegarde scan.
- Fallback UI si aucune hypothèse exploitable n’est renvoyée.
- Warnings de persistance partielle remontés au frontend.
- Nettoyage de l’audio mode lors d’un cancel scan.

## Checklist de parcours critiques durcis
- [x] Création de compte avec messages non techniques
- [x] Code parrain non bloquant
- [x] Création profil chien même si photo KO
- [x] Démarrage scan bloqué si pas de chien
- [x] Permission micro gérée proprement
- [x] Scan interrompu / résultat absent gérés
- [x] Edge Functions IA avec fallback propre
- [x] Sauvegarde scan avec validation réelle
- [x] Persistance partielle non bloquante
- [x] Historique vide ou partiel sans crash
- [x] Cartographie vide / légère / erreur gérée
- [x] Actions profil sensibles avec messages propres

## Risques restants avant bêta
- Les Edge Functions dépendent toujours d’une configuration serveur correcte (`SUPABASE_*`, `ANTHROPIC_API_KEY`).
- Les validations/corrections manuelles restent fonctionnelles côté service, mais l’UX de correction avancée peut encore être enrichie après les premiers retours testeurs.
- Le lot 9 durcit surtout les parcours critiques frontend + persistance ; il ne remplace pas un vrai run QA sur devices iOS/Android réels.
- Les quotas et paywalls doivent être vérifiés sur un environnement avec profils `free`, `plus` et `pro` réels.
- La suppression complète de compte dépend toujours de l’Edge Function `delete-user`, qui doit être présente côté serveur avant ouverture large de la bêta.

## Recommandations concrètes pour les premiers tests bêta
1. Tester avec au moins 3 comptes : `free`, `plus`, `pro`.
2. Tester au moins 2 scénarios referral :
   - code valide,
   - code invalide.
3. Faire au moins 5 scans complets sur un même chien pour vérifier :
   - historique,
   - validation,
   - cartographie,
   - profil vocal.
4. Tester 3 cas audio :
   - vrai aboiement,
   - voix humaine,
   - silence / bruit ambiant.
5. Vérifier les flows hors-ligne / réseau instable.
6. Vérifier la suppression de données et la déconnexion.
7. Vérifier que l’app ne montre jamais de message technique brut au testeur final.
