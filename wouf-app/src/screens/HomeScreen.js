// src/screens/HomeScreen.js — PLACEHOLDER (à développer)
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ThemeContext, AuthContext, DogsContext } from '../context/appContexts';
import { DAILY_TIPS } from '../config/constants';
import { getDogAccentColor } from '../utils/dogIdentity';

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function HomeScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { profile } = useContext(AuthContext);
  const { activeDog, dogs, activeDogIndex, setActiveDog } = useContext(DogsContext);
  const day = new Date().getDate();
  const tip = DAILY_TIPS[day % DAILY_TIPS.length];
  const level = Math.max(1, Math.floor(toFiniteNumber(profile?.level, 1)));
  const xp = Math.max(0, toFiniteNumber(profile?.xp, 0));
  const xpTarget = level * 200;
  const xpPct = clamp(Math.round((xp / xpTarget) * 100), 0, 100);
  const dogAccent = getDogAccentColor(activeDog);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.p, letterSpacing: 4 }}>WOUF</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: colors.gG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 10 }}>🪙</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.g }}>{profile?.coins || 0}</Text>
          </View>
          <View style={{ backgroundColor: colors.aG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 10 }}>🔥</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.a }}>{profile?.streak || 0}j</Text>
          </View>
        </View>
      </View>

      {/* Dog selector */}
      {dogs.length > 1 && (
        <ScrollView horizontal style={{ marginBottom: 10 }}>
          {dogs.map((d, i) => (
            <TouchableOpacity key={d.id} onPress={() => setActiveDog(i)}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 6,
                backgroundColor: i === activeDogIndex ? colors.pG : colors.bg2,
                borderWidth: i === activeDogIndex ? 2 : 1,
                borderColor: i === activeDogIndex ? colors.p + '50' : colors.bd }}>
              <Text style={{ fontSize: 12, color: i === activeDogIndex ? colors.p : colors.ts,
                fontWeight: i === activeDogIndex ? '700' : '400' }}>🐕 {d.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Stats card */}
      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: colors.bd }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, color: colors.ts }}>👋 {activeDog?.name || 'Mon chien'}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: dogAccent }}>
              Niv.{level} · {xp}/{xpTarget} XP
            </Text>
          </View>
        </View>
        <View style={{ height: 4, backgroundColor: colors.bd, borderRadius: 2, marginTop: 6 }}>
          <View style={{ width: `${xpPct}%`,
            height: '100%', backgroundColor: dogAccent, borderRadius: 2 }} />
        </View>
      </View>

      {/* Primary actions */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddDog')}
          style={{ flex: 1, backgroundColor: colors.bg2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: dogAccent + '40' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: dogAccent }}>GESTION CHIENS</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.tx, marginTop: 4 }}>➕ Ajouter un chien</Text>
          <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>Créer un nouveau profil canin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => activeDog ? navigation.navigate('Scan') : navigation.navigate('AddDog')}
          style={{ flex: 1, backgroundColor: colors.pG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: dogAccent + '30' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: dogAccent }}>ACTION PRINCIPALE</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.tx, marginTop: 4 }}>
            {activeDog ? '🎙️ Scanner un aboiement' : 'Créer un chien pour scanner'}
          </Text>
          <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>
            {activeDog ? 'Ouvrir le scanner' : 'Le scan nécessite un chien actif'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Plan + referral quick status */}
      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.bd }}>
        <Text style={{ fontSize: 10, color: colors.ts }}>Plan actif</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.tx, marginTop: 2 }}>
          {(profile?.plan || 'free').toUpperCase()}
        </Text>
        <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>
          Parrainages: {profile?.referral_count || 0} · Code: {profile?.referral_code || 'génération...'}
        </Text>
      </View>

      {/* Navigation shortcuts */}
      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.bd }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ts }}>RACCOURCIS</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[
            ['📚', 'Bibliothèque', 'Library'],
            ['🗺️', 'Cartographie', 'Cartography'],
            ['👤', 'Profil', 'Profile'],
          ].map(([icon, label, route]) => (
            <TouchableOpacity
              key={route}
              onPress={() => navigation.navigate(route)}
              style={{ flex: 1, backgroundColor: colors.bg3, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.bd }}
            >
              <Text style={{ fontSize: 16 }}>{icon}</Text>
              <Text style={{ fontSize: 10, color: colors.tx, marginTop: 4 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tip */}
      <View style={{ backgroundColor: colors.pG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.p + '15' }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.p }}>💡 LE SAVIEZ-VOUS ?</Text>
        <Text style={{ fontSize: 11, color: colors.tx, lineHeight: 18, marginTop: 3 }}>{tip}</Text>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
