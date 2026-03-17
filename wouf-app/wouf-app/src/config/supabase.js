/**
 * WOUF — Supabase Configuration
 * ═══════════════════════════════
 * Feature #7/#8: Auth + Backend + Base de données
 * 
 * SETUP:
 * 1. Crée un projet sur https://supabase.com
 * 2. Copie l'URL et la clé anon depuis Settings > API
 * 3. Remplace les valeurs ci-dessous
 * 4. Exécute le SQL dans database.sql pour créer les tables
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️ REMPLACER PAR TES PROPRES CLÉS
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Auth helpers
 */
export const auth = {
  // Inscription par email + mot de passe
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  // Connexion
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Déconnexion
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Session courante
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // User courant
  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Listener de changement d'état auth
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Reset password
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Supprimer le compte (via Edge Function côté serveur)
  deleteAccount: async () => {
    const { error } = await supabase.functions.invoke('delete-user');
    if (error) throw error;
  },
};
