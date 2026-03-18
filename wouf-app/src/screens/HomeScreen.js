// src/screens/HomeScreen.js — PLACEHOLDER (à développer)
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ThemeContext, AuthContext, DogsContext } from '../context/appContexts';
import { DAILY_TIPS } from '../config/constants';

export default function HomeScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { profile } = useContext(AuthContext);
  const { activeDog, dogs, activeDogIndex, setActiveDog } = useContext(DogsContext);
  const day = new Date().getDate();
  const tip = DAILY_TIPS[day % DAILY_TIPS.length];

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
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.g }}>
              Niv.{profile?.level || 1} · {profile?.xp || 0}/{(profile?.level || 1) * 200} XP
            </Text>
          </View>
        </View>
        <View style={{ height: 4, backgroundColor: colors.bd, borderRadius: 2, marginTop: 6 }}>
          <View style={{ width: `${Math.round((profile?.xp || 0) / ((profile?.level || 1) * 200) * 100)}%`,
            height: '100%', backgroundColor: colors.g, borderRadius: 2 }} />
        </View>
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

      {/* Shop teaser */}
      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.g + '40' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.g }}>🛍️ SHOP WOUF</Text>
        <Text style={{ fontSize: 12, color: colors.tx, marginTop: 4 }}>À venir — récompenses, perks fondateurs et contenus premium.</Text>
      </View>

      {/* Scan button */}
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <TouchableOpacity onPress={() => activeDog ? navigation.navigate('Scan') : navigation.navigate('AddDog')}
          style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.p,
            justifyContent: 'center', alignItems: 'center', opacity: activeDog ? 1 : 0.6 }}>
          <Text style={{ fontSize: 38 }}>🎙️</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.tx, marginTop: 14 }}>{activeDog ? 'Scanner un aboiement' : 'Ajouter un chien pour scanner'}</Text>
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
