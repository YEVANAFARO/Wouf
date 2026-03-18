/**
 * WOUF — Onboarding Screen
 * ═══════════════════════════
 * FEATURE #3: Onboarding (partie 1)
 * 5 écrans éducatifs avec auto-play + navigation manuelle
 */

import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { ThemeContext } from '../../../App';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    emoji: '🎙️',
    title: "Ton chien parle.\nTu ne l'entends pas… encore.",
    body: "Chaque aboiement est un message. WOUF capte le son, analyse son spectre et le transforme en émotion identifiable. Tu vas enfin comprendre ce qu'il essaie de te dire.",
  },
  {
    emoji: '🧠',
    title: 'Une IA qui connaît\nTON chien',
    body: "WOUF croise le profil unique de ton chien, le contexte de l'aboiement et son langage corporel pour te donner 3 hypothèses classées par confiance. Plus tu utilises WOUF, plus il devient précis.",
  },
  {
    emoji: '🧬',
    title: 'Son empreinte vocale,\ncomme une empreinte digitale',
    body: 'Chaque chien a une signature sonore unique. Au fil du temps, WOUF reconnaît la voix de ton compagnon et affine ses interprétations pour une précision inégalée.',
  },
  {
    emoji: '🗺️',
    title: 'La carte émotionnelle\nde ton chien',
    body: "Quand aboie-t-il le plus ? Pourquoi ? Quels déclencheurs reviennent ? WOUF construit une cartographie complète pour t'aider à anticiper et agir.",
  },
  {
    emoji: '🏆',
    title: 'Joue, progresse,\ndébloque',
    body: "Chaque scan te rapporte de l'XP, des pièces et des récompenses. Missions quotidiennes, coffres, réductions partenaires… Plus tu comprends ton chien, plus tu gagnes !",
  },
];

export default function OnboardingScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const [page, setPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  // Auto-play toutes les 4 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setPage(p => (p + 1) % PAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Animation à chaque changement de page
  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [page]);

  const pg = PAGES[page];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <Text style={{ fontSize: 72, textAlign: 'center', marginBottom: 20 }}>{pg.emoji}</Text>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={{
            fontSize: 24, fontWeight: '900', color: colors.w, textAlign: 'center',
            marginBottom: 12, lineHeight: 32,
          }}>
            {pg.title}
          </Text>
          <Text style={{
            color: colors.ts, textAlign: 'center', fontSize: 13, lineHeight: 22, maxWidth: 320,
          }}>
            {pg.body}
          </Text>
        </Animated.View>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
        {PAGES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setPage(i)}>
            <View style={{
              width: i === page ? 24 : 8, height: 8, borderRadius: 4,
              backgroundColor: i === page ? colors.p : colors.td,
            }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <TouchableOpacity
          onPress={() => navigation.replace('Auth')}
          style={{
            backgroundColor: colors.p, borderRadius: 14, paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.bg, fontSize: 16, fontWeight: '800' }}>
            🐾 Entrer dans WOUF
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
