# INTERPRETATION_ENGINE_SPEC.md

## Entrées
- Profil chien
- Contexte
- Langage corporel
- Features audio
- Historique récent
- Validations / corrections passées
- Similarité avec l'empreinte sonore du chien

## Sorties
- Top 3 hypothèses
- Score / confiance
- Détail source_breakdown
- Conseil concret
- Drapeau rouge vétérinaire si nécessaire

## États principaux
- calme
- alerte / territorialité probable
- excitation / jeu
- frustration
- peur / anxiété
- détresse de séparation probable
- demande d'attention
- inconfort / conflit
- douleur / problème physique possible
- besoin de routine / sortie / repas

## Règles
- Pas de traduction littérale du chien
- Pas de diagnostic définitif
- La race ne sert qu'en faible pondération
- Les validations utilisateur peuvent influencer les résultats futurs

## Pipeline
1. Bark / non-bark
2. Extraction features audio
3. Mapping questionnaire -> signaux
4. Scoring métier de base
5. Ajustement par profil vocal si fiabilité suffisante
6. Ajustement par historique validé
7. Appel IA pour reformuler et conseiller
