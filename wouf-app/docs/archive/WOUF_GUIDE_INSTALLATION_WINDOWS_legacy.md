# 🐕 WOUF — Guide d'installation COMPLET (Windows)
# ════════════════════════════════════════════════
# Suis chaque étape dans l'ordre. Copie-colle les commandes.
# Temps estimé : 20 minutes


## ═══════════════════════════════════════════════
## ÉTAPE 1 : Installer les outils (5 min)
## ═══════════════════════════════════════════════

### 1A. Installer VS Code (éditeur de code gratuit)
→ Va sur : https://code.visualstudio.com/
→ Clique "Download for Windows"
→ Installe-le (Next > Next > Finish)
→ Ouvre VS Code

### 1B. Installer Node.js (le moteur qui fait tourner l'app)
→ Va sur : https://nodejs.org/
→ Télécharge la version LTS (le gros bouton vert)
→ Installe-le (Next > Next > Finish)
→ IMPORTANT : Redémarre ton terminal après l'installation

### 1C. Vérifier que tout est installé
Ouvre un terminal (PowerShell ou cmd) et tape :

```
node --version
```
→ Tu dois voir quelque chose comme : v20.x.x ou v22.x.x

```
npm --version
```
→ Tu dois voir quelque chose comme : 10.x.x

Si ça marche → passe à l'étape 2 !


## ═══════════════════════════════════════════════
## ÉTAPE 2 : Installer Expo (le framework mobile) (2 min)
## ═══════════════════════════════════════════════

Dans ton terminal, tape :

```
npm install -g expo-cli eas-cli
```

Puis installe Expo Go sur ton téléphone :
→ iPhone : App Store → cherche "Expo Go"
→ Android : Play Store → cherche "Expo Go"

C'est cette app qui te permettra de tester WOUF sur ton vrai téléphone !


## ═══════════════════════════════════════════════
## ÉTAPE 3 : Créer le projet WOUF (3 min)
## ═══════════════════════════════════════════════

Dans ton terminal :

```
cd Desktop
npx create-expo-app wouf-app --template blank
cd wouf-app
```

Puis installe toutes les dépendances :

```
npx expo install expo-av expo-image-picker expo-notifications expo-device expo-file-system expo-constants expo-haptics expo-status-bar @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-reanimated react-native-gesture-handler @react-native-async-storage/async-storage react-native-url-polyfill
```

Puis :

```
npm install @supabase/supabase-js
```


## ═══════════════════════════════════════════════
## ÉTAPE 4 : Configurer Supabase (5 min)
## ═══════════════════════════════════════════════

### 4A. Créer un nouveau projet Supabase
→ Va sur https://supabase.com/dashboard
→ Clique "New Project"
→ Nom : WOUF
→ Mot de passe base de données : choisis-en un fort (note-le !)
→ Région : West EU (Paris)
→ Clique "Create new project"
→ Attends 2 minutes que le projet se crée

### 4B. Récupérer tes clés
→ Dans ton projet Supabase, va dans : Settings (⚙️) > API
→ Copie ces 2 valeurs (tu en auras besoin) :

   Project URL : https://xxxxxxxxxx.supabase.co
   anon public key : eyJhbG..........(très long)

### 4C. Créer les tables
→ Dans Supabase, va dans : SQL Editor (icône terminal à gauche)
→ Clique "New query"
→ Copie-colle TOUT le contenu du fichier database.sql que je t'ai fourni
→ Clique "Run" (bouton vert en haut à droite)
→ Tu dois voir "Success. No rows returned" → c'est normal, ça a marché !

### 4D. Créer le bucket de stockage photos
→ Dans Supabase, va dans : Storage (icône dossier)
→ Clique "New bucket"
→ Nom : dog-photos
→ Coche "Public bucket"
→ Clique "Create bucket"


## ═══════════════════════════════════════════════
## ÉTAPE 5 : Clé API Anthropic (2 min)
## ═══════════════════════════════════════════════

→ Va sur : https://console.anthropic.com/
→ Crée un compte si pas déjà fait
→ Va dans : API Keys
→ Clique "Create Key"
→ Nom : WOUF
→ Copie la clé (elle commence par sk-ant-...)

⚠️ GARDE CETTE CLÉ SECRÈTE — ne la partage jamais publiquement
💰 Coût : ~0.003€ par scan (très économique)


## ═══════════════════════════════════════════════
## ÉTAPE 6 : Copier le code WOUF (3 min)
## ═══════════════════════════════════════════════

→ Ouvre VS Code
→ Fichier > Ouvrir un dossier > Desktop > wouf-app
→ Tu vois l'arborescence du projet à gauche

Maintenant il faut copier les fichiers du codebase MVP que je t'ai fourni.
Décompresse le fichier wouf-app-mvp.tar.gz que tu as téléchargé.

Copie ces fichiers dans ton projet :
- src/config/supabase.js  → remplace SUPABASE_URL et SUPABASE_ANON_KEY par tes clés
- src/config/theme.js
- src/config/constants.js
- src/services/audio.js
- src/services/ai.js      → remplace ANTHROPIC_API_KEY par ta clé
- src/services/database.js
- src/screens/ (tous les fichiers)
- App.js (remplace celui existant)
- app.json (remplace celui existant)


## ═══════════════════════════════════════════════
## ÉTAPE 7 : Lancer WOUF ! (1 min)
## ═══════════════════════════════════════════════

Dans ton terminal (dans le dossier wouf-app) :

```
npx expo start
```

→ Un QR code s'affiche dans le terminal
→ Ouvre Expo Go sur ton téléphone
→ Scanne le QR code
→ WOUF se lance sur ton téléphone ! 🎉

⚠️ Ton téléphone et ton PC doivent être sur le même réseau Wi-Fi


## ═══════════════════════════════════════════════
## PROBLÈMES FRÉQUENTS
## ═══════════════════════════════════════════════

### "node is not recognized"
→ Redémarre ton terminal après avoir installé Node.js
→ Si ça persiste : désinstalle Node.js, réinstalle, et coche
  "Add to PATH" pendant l'installation

### "expo is not recognized"
→ Ferme et réouvre ton terminal
→ Tape : npx expo start (au lieu de expo start)

### Le QR code ne se scanne pas
→ Vérifie que téléphone + PC sont sur le même Wi-Fi
→ Essaie : npx expo start --tunnel

### Erreur "Module not found"
→ Dans le dossier wouf-app, tape :
```
npm install
npx expo install
```

### L'app crash au démarrage
→ Vérifie que tu as bien remplacé les clés Supabase et Anthropic
→ Regarde le terminal pour le message d'erreur exact
→ Screenshot + envoie-moi l'erreur


## ═══════════════════════════════════════════════
## RÉCAPITULATIF DES CLÉS À CONFIGURER
## ═══════════════════════════════════════════════

Fichier : src/config/supabase.js
  → SUPABASE_URL = 'https://TON_PROJET.supabase.co'
  → SUPABASE_ANON_KEY = 'ta_clé_anon_ici'

Fichier : src/services/ai.js
  → ANTHROPIC_API_KEY = 'sk-ant-ta_clé_ici'


## ═══════════════════════════════════════════════
## ET APRÈS ?
## ═══════════════════════════════════════════════

Une fois que l'app tourne sur ton téléphone :
1. Tu crées un compte → profil chien
2. Tu appuies sur Scanner 🎙️
3. Ton vrai micro s'active → fais aboyer ton chien (ou joue un son)
4. L'IA analyse et te donne 3 hypothèses
5. Tu valides ou corriges

→ Reviens me voir avec un screenshot de l'app qui tourne
   et on passe aux ajustements !
