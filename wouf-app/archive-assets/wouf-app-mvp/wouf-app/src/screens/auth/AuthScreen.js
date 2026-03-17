/**
 * WOUF — Auth Screen
 * ═══════════════════
 * FEATURE #7 (MUST HAVE): Auth (inscription / connexion)
 * 
 * - Inscription email + password
 * - Connexion
 * - Code parrainage optionnel
 * - Validation email
 */

import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ThemeContext } from '../../../App';
import { auth } from '../../config/supabase';

export default function AuthScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [phone, setPhone] = useState('');
  const [postal, setPostal] = useState('');
  const [city, setCity] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: 14, borderRadius: 10, borderWidth: 2,
    borderColor: colors.bd, backgroundColor: colors.bg2, color: colors.tx,
    fontSize: 14, marginBottom: 10,
  };
  const labelStyle = { fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 };

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@') || !email.includes('.')) { setError('Email invalide.'); return; }
    if (password.length < 6) { setError('6 caractères minimum.'); return; }
    if (mode === 'signup' && password !== password2) { setError('Mots de passe différents.'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await auth.signUp(email, password);
        Alert.alert(
          '📧 Vérifie ton email',
          `Un lien de confirmation a été envoyé à ${email}. Ouvre ta boîte mail et clique sur le lien.`,
          [{ text: 'OK' }]
        );
      } else {
        await auth.signIn(email, password);
        // La navigation se fait automatiquement via le listener auth dans App.js
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ padding: 36, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.p, letterSpacing: 4 }}>WOUF</Text>
        <Text style={{ color: colors.ts, fontSize: 13, marginTop: 4 }}>
          {mode === 'signup' ? 'Crée ton compte' : 'Content de te revoir !'}
        </Text>
      </View>

      {/* Mode toggle */}
      <View style={{
        flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 28,
        padding: 3, marginHorizontal: 24, marginBottom: 12, maxWidth: 280,
      }}>
        {[['signup', 'Inscription'], ['login', 'Connexion']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => { setMode(key); setError(''); }}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 26, alignItems: 'center',
              backgroundColor: mode === key ? colors.p : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: mode === key ? colors.bg : colors.ts,
            }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={labelStyle}>Email *</Text>
        <TextInput
          value={email} onChangeText={setEmail} placeholder="exemple@email.com"
          placeholderTextColor={colors.td} style={inputStyle}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        />

        <Text style={labelStyle}>Mot de passe * (6 car. min.)</Text>
        <TextInput
          value={password} onChangeText={setPassword} placeholder="••••••"
          placeholderTextColor={colors.td} style={inputStyle} secureTextEntry
        />

        {mode === 'signup' && (
          <>
            <Text style={labelStyle}>Confirmer *</Text>
            <TextInput
              value={password2} onChangeText={setPassword2} placeholder="••••••"
              placeholderTextColor={colors.td} style={inputStyle} secureTextEntry
            />

            <View style={{
              padding: 10, backgroundColor: colors.bg3, borderRadius: 10,
              borderWidth: 1, borderColor: colors.bd, marginTop: 4, marginBottom: 10,
            }}>
              <Text style={{ ...labelStyle, marginBottom: 8 }}>📋 Optionnel</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone"
                placeholderTextColor={colors.td} style={inputStyle} keyboardType="phone-pad" />
              <TextInput value={postal} onChangeText={setPostal} placeholder="Code postal"
                placeholderTextColor={colors.td} style={inputStyle} keyboardType="numeric" />
              <TextInput value={city} onChangeText={setCity} placeholder="Ville"
                placeholderTextColor={colors.td} style={inputStyle} />
            </View>

            <View style={{
              padding: 10, backgroundColor: colors.gG, borderRadius: 10,
              borderWidth: 1, borderColor: colors.g + '25', marginBottom: 10,
            }}>
              <Text style={{ ...labelStyle, color: colors.g }}>🎁 Code parrainage</Text>
              <TextInput value={refCode} onChangeText={setRefCode} placeholder="Ex : WOUF-ABC123"
                placeholderTextColor={colors.td} style={inputStyle} autoCapitalize="characters" />
              <Text style={{ fontSize: 9, color: colors.ts, marginTop: -6 }}>
                Si quelqu'un t'a invité, entre son code pour 7 jours Plus gratuits !
              </Text>
            </View>

            <Text style={{ fontSize: 9, color: colors.td, marginBottom: 10 }}>
              🛡️ Pas d'adresse exacte collectée. RGPD. Suppression 1 clic.
            </Text>
          </>
        )}

        {!!error && (
          <View style={{ backgroundColor: colors.aG, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: colors.a, fontSize: 12, fontWeight: '600' }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 10 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14,
            alignItems: 'center', opacity: loading ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.bg, fontSize: 14, fontWeight: '700' }}>
            {loading ? '...' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
          </Text>
        </TouchableOpacity>

        {mode === 'login' && (
          <TouchableOpacity
            onPress={async () => {
              if (!email.includes('@')) { Alert.alert('Entre ton email d\'abord'); return; }
              try {
                await auth.resetPassword(email);
                Alert.alert('Email envoyé', 'Vérifie ta boîte mail pour réinitialiser.');
              } catch (e) { Alert.alert('Erreur', e.message); }
            }}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <Text style={{ color: colors.ts, fontSize: 12 }}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
