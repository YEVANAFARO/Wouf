# 🐕 WOUF — MVP Codebase

## Architecture

```
wouf-app/
├── App.js                          # Entry point + Navigation + Contexts
├── app.json                        # Expo config (permissions, plugins)
├── package.json                    # Dépendances
├── database.sql                    # Schema Supabase (à exécuter)
│
├── src/
│   ├── config/
│   │   ├── supabase.js             # Client Supabase + Auth helpers
│   │   ├── theme.js                # Dark/Light mode tokens
│   │   └── constants.js            # Races, personnalités, questions...
│   │
│   ├── services/
│   │   ├── audio.js                # ⭐ FEATURE #1: Enregistrement + détection
│   │   ├── ai.js                   # ⭐ FEATURE #2: API Anthropic
│   │   └── database.js             # ⭐ FEATURE #8: CRUD Supabase
│   │
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── OnboardingScreen.js # 5 écrans explicatifs
│   │   │   └── DogProfileScreen.js # ⭐ FEATURE #3: Création profil chien
│   │   │
│   │   ├── auth/
│   │   │   └── AuthScreen.js       # ⭐ FEATURE #7: Inscription/Connexion
│   │   │
│   │   ├── scan/
│   │   │   └── ScanFlowScreen.js   # ⭐ FEATURE #4: Flow scan complet
│   │   │
│   │   ├── library/
│   │   │   ├── LibraryScreen.js    # ⭐ FEATURE #5: Historique + filtres
│   │   │   └── ScanDetailScreen.js # Détail d'un scan
│   │   │
│   │   ├── cartography/
│   │   │   └── CartographyScreen.js
│   │   │
│   │   ├── profile/
│   │   │   └── ProfileScreen.js
│   │   │
│   │   └── HomeScreen.js           # Dashboard principal
│   │
│   ├── components/                  # Composants réutilisables
│   │   ├── ChipSelector.js
│   │   ├── PrimaryButton.js
│   │   └── Card.js
│   │
│   └── hooks/
│       ├── useProfile.js
│       └── useDogs.js
```

## 🚀 Setup en 10 minutes

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- Un compte [Supabase](https://supabase.com) (gratuit)
- Une clé API [Anthropic](https://console.anthropic.com) (payant, ~0.003€/scan)
- Xcode (iOS) ou Android Studio (Android) pour les émulateurs

### Étape 1: Installer le projet
```bash
cd wouf-app
npm install
```

### Étape 2: Configurer Supabase
1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **Settings > API** et copie:
   - `Project URL`
   - `anon public key`
3. Colle-les dans `src/config/supabase.js`
4. Va dans **SQL Editor** et colle le contenu de `database.sql`
5. Clique **Run** pour créer les tables
6. Va dans **Storage** et crée un bucket `dog-photos` (public)

### Étape 3: Configurer l'API Anthropic
1. Va sur [console.anthropic.com](https://console.anthropic.com)
2. Crée une clé API
3. Colle-la dans `src/services/ai.js` (ligne ANTHROPIC_API_KEY)

⚠️ **En production**: ne JAMAIS mettre la clé API dans le code frontend.
Créer une Supabase Edge Function qui fait l'appel API côté serveur.

### Étape 4: Lancer
```bash
npx expo start
```
- Scanner le QR code avec Expo Go (téléphone)
- Ou appuyer `i` pour iOS simulator / `a` pour Android emulator

## 📋 Features par fichier

| # | Feature | Fichier(s) | Status |
|---|---------|-----------|--------|
| 1 | Enregistrement audio + détection | `services/audio.js` | ✅ Codé |
| 2 | API IA (Anthropic) | `services/ai.js` | ✅ Codé |
| 3 | Onboarding + Profil chien | `screens/onboarding/*` | 📝 À créer |
| 4 | Flow scan Mode Rapide | `screens/scan/*` | 📝 À créer |
| 5 | Bibliothèque + Détail | `screens/library/*` | 📝 À créer |
| 6 | Validation / Correction | Intégré dans scan flow | 📝 À créer |
| 7 | Auth (Supabase) | `config/supabase.js` + `screens/auth/*` | ✅ Codé |
| 8 | Backend + BDD | `database.sql` + `services/database.js` | ✅ Codé |

## 🔑 Variables d'environnement (production)

Créer un fichier `.env`:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

Puis utiliser `expo-constants` pour les charger.

## 📱 Build pour TestFlight / Play Store

```bash
# Installer EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurer
eas build:configure

# Build iOS (TestFlight)
eas build --platform ios --profile preview

# Build Android (APK interne)
eas build --platform android --profile preview
```

## 🛡️ Sécurité (avant le lancement)

- [ ] Déplacer la clé API Anthropic vers une Edge Function Supabase
- [ ] Activer les RLS policies sur toutes les tables
- [ ] Configurer les rate limits Supabase
- [ ] Ajouter la validation des inputs côté serveur
- [ ] Configurer les CORS
- [ ] Mentions légales + politique de confidentialité
