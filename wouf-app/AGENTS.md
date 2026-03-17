# AGENTS.md

## Projet
WOUF est une application mobile React Native Expo de compréhension comportementale canine assistée par IA.

## Positionnement
WOUF n'est pas un traducteur magique. L'application interprète des vocalisations et comportements de manière probabiliste à partir de :
- l'audio,
- le contexte,
- le langage corporel,
- le profil du chien,
- l'historique et les validations précédentes.

## Objectif produit
Aider un propriétaire à mieux comprendre ce que vit son chien dans une situation donnée et à agir de façon adaptée.

## Scope prioritaire actuel
- Authentification / inscription / connexion
- Code parrainage dès l'inscription
- Profil utilisateur léger
- Profil chien
- Consentement audio
- Enregistrement audio
- Détection bark / non-bark
- Extraction de features audio
- Empreinte sonore avancée V1 par chien
- Questionnaire rapide + précis
- Interprétation IA côté serveur
- Validation / correction des résultats
- Historique
- Cartographie émotionnelle avancée V1
- Paywall Free / Plus / Pro
- Shop teaser "À venir"
- Bêta fermée testable

## Contraintes fortes
- Ne jamais mettre la clé API IA dans le frontend.
- Utiliser Supabase pour Auth / Postgres / Storage.
- Garder une UX simple et rapide.
- Réutiliser le code existant autant que possible.
- Ne pas faire de refonte totale inutile.
- Pas de promesse pseudo-scientifique excessive.
- Pas de conseils coercitifs ou dangereux.
- Pas de diagnostic vétérinaire définitif.

## Architecture souhaitée
- Frontend : React Native Expo
- Backend : Supabase Edge Functions
- Base de données : Postgres
- Storage : Supabase Storage
- IA : appel serveur uniquement
- Audio : capture micro + extraction FFT / features simples

## Done means
Une tâche est terminée si :
- le code compile,
- les écrans concernés s'ouvrent,
- les données se sauvegardent correctement,
- la feature est testable,
- les erreurs principales sont gérées,
- le résultat est cohérent avec le positionnement produit.

## Ce qu'il ne faut pas faire maintenant
- Pas de vraie boutique e-commerce complexe
- Pas de loterie réelle
- Pas d'intégration partenaires réelle
- Pas de modèle scientifique universel
- Pas de refonte complète du design system
- Pas d'App Store public comme prérequis du premier jalon

## Comportement attendu de l'agent
- Proposer un plan avant les gros changements
- Expliquer brièvement les choix
- Implémenter par lots
- Lancer les commandes nécessaires
- Corriger si le build échoue
- Faire simple, propre, testable
