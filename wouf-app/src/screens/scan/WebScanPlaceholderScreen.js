import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { ThemeContext } from '../../context/appContexts';

export default function WebScanPlaceholderScreen() {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 44 }}>🎙️</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginTop: 10 }}>Scan temporairement désactivé sur Web</Text>
      <Text style={{ fontSize: 12, color: colors.ts, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
        La stabilisation actuelle cible le parcours Auth + Onboarding + Home.
      </Text>
      <Text style={{ fontSize: 12, color: colors.ts, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
        Le module audio sera réactivé après stabilisation complète.
      </Text>
    </View>
  );
}
