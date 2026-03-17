# WOUF

WOUF est une application mobile de compréhension comportementale canine assistée par IA.

## Ce que fait WOUF
- Enregistre un son du chien
- Recueille le contexte et les signaux corporels
- Croise ces données avec le profil du chien et son historique
- Propose 2 à 3 hypothèses probabilistes
- Donne des conseils concrets et prudents
- S'améliore pour chaque chien grâce aux validations/corrections

## Ce que WOUF n'est pas
- Pas un traducteur exact de la "langue des chiens"
- Pas un outil de diagnostic vétérinaire
- Pas un substitut à un éducateur canin ou à un vétérinaire

## Fonctionnalités visées pour la bêta fermée
- Auth / inscription / connexion
- Code de parrainage à l'inscription
- Profil utilisateur léger
- Profil chien
- Enregistrement audio
- Détection bark / non-bark
- Interprétation audio + contexte + body language
- Empreinte sonore en apprentissage
- Historique
- Validation / correction
- Cartographie émotionnelle V1
- Paywall Free / Plus / Pro
- Shop teaser "À venir"

## Stack technique
- Expo / React Native
- Supabase Auth + Postgres + Storage
- Edge Functions pour les appels IA
- RevenueCat plus tard si nécessaire

## Objectif immédiat
Sortir une bêta fermée testable par 5 à 15 utilisateurs cette semaine.

## Règles produit
- Résultats probabilistes, pas absolus
- Conseils non coercitifs
- Message de prudence en cas de drapeau rouge physique ou comportemental
- La race est un indice faible, pas une vérité absolue
