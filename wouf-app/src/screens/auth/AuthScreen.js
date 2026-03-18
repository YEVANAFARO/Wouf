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
import { auth, supabase } from '../../config/supabase';
import { getUserFacingError } from '../../services/userFacingErrors';

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) { setError('Entre un email valide.'); return; }
    if (cleanPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (mode === 'signup' && cleanPassword !== password2) { setError('Les mots de passe sont différents.'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const signUpData = await auth.signUp(cleanEmail, cleanPassword);
        let referralNotice = null;

        // Persist user-owned optional fields + referral request (safe fallback)
        const userId = signUpData?.user?.id;
        if (userId) {
          try {
            const cleanPatch = {
              phone: phone.trim() || null,
              postal_code: postal.trim() || null,
              city: city.trim() || null,
            };

            await supabase.from('profiles').update(cleanPatch).eq('id', userId);

            const normalizedCode = (refCode || '').trim().toUpperCase();
            if (normalizedCode) {
              const { data: referralData, error: referralError } = await supabase.functions.invoke('apply-referral', {
                body: {
                  newUserId: userId,
                  referralCode: normalizedCode,
                },
              });

              if (referralError) {
                console.warn('[Auth] apply-referral failed:', referralError.message);
                referralNotice = getUserFacingError(referralError, 'Le code parrain n’a pas pu être appliqué maintenant.');
              } else if (!referralData?.ok) {
                referralNotice = getUserFacingError(referralData?.error, 'Le code parrain n’a pas pu être appliqué maintenant.');
              } else if (referralData?.data?.applied === false) {
                referralNotice = getUserFacingError(referralData?.data?.reason, 'Le code parrain n’a pas pu être appliqué maintenant.');
              }
            }
          } catch (enrichmentError) {
            console.warn('[Auth] profile enrichment skipped:', enrichmentError?.message || 'unknown_error');
          }
        }

        Alert.alert(
          '📧 Vérifie ton email',
          `Un lien de confirmation a été envoyé à ${cleanEmail}. Ouvre ta boîte mail et clique sur le lien.${referralNotice ? `

🎁 Code parrainage: ${referralNotice}` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        await auth.signIn(cleanEmail, cleanPassword);
        // La navigation se fait automatiquement via le listener auth dans App.js
      }
    } catch (err) {
      setError(getUserFacingError(err, 'Impossible de continuer pour le moment.'));
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
                await auth.resetPassword(email.trim().toLowerCase());
                Alert.alert('Email envoyé', 'Vérifie ta boîte mail pour réinitialiser ton mot de passe.');
              } catch (e) { Alert.alert('Erreur', getUserFacingError(e, 'Impossible d’envoyer l’email de réinitialisation pour le moment.')); }
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
