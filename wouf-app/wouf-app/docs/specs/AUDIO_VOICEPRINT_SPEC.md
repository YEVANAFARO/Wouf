# AUDIO_VOICEPRINT_SPEC.md

## Objectif
Construire une empreinte sonore V1 personnalisée par chien, fonctionnelle rapidement.

## Features minimales à extraire
- durée
- rms_energy
- peak_freq
- spectral_centroid
- spectral_rolloff
- zero_crossing_rate
- low_band_energy
- mid_band_energy
- high_band_energy
- bark_rate
- burst_count

## Principe
- Chaque scan produit un vecteur de features
- Chaque chien possède un profil vocal agrégé
- Le profil se met à jour avec les scans validés
- Un score de similarité compare un scan au profil du chien
- La fiabilité du profil dépend du nombre de scans validés

## États d'affichage
- en apprentissage
- faible fiabilité
- fiabilité moyenne
- bonne fiabilité

## Règles produit
- Le profil vocal n'est pas une preuve absolue
- Il sert à personnaliser et améliorer l'interprétation
- Le wording utilisateur doit rester prudent
