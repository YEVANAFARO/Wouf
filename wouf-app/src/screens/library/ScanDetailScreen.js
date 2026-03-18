import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../../../App';

export default function ScanDetailScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const scan = route?.params?.scan || null;
  const hypothesisIndex = scan?.validated_hypothesis ?? 0;
  const hypothesis = scan?.hypotheses_json?.[hypothesisIndex]
    || scan?.hypotheses?.[hypothesisIndex]
    || scan?.hypotheses_json?.[0]
    || scan?.hypotheses?.[0]
    || null;
  const resolvedLabel = scan?.corrected_label
    || (scan?.correction ? scan?.correction_emotion : null)
    || scan?.selected_hypothesis
    || scan?.top_hypothesis
    || hypothesis?.category
    || 'État non précisé';

  if (!scan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 40 }}>🧾</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.tx, marginTop: 10 }}>Détail indisponible</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.p, fontWeight: '700' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.p, fontWeight: '600', marginBottom: 10 }}>← Retour</Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.bd }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.p }}>
          {hypothesis?.emoji || '🐾'} {resolvedLabel}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.tx, marginTop: 4 }}>
          {hypothesis?.confidence != null ? `${hypothesis.confidence}% confiance` : 'Confiance non disponible'}
        </Text>

        {hypothesis?.explanation ? (
          <Text style={{ fontSize: 12, color: colors.ts, lineHeight: 20, marginTop: 8 }}>{hypothesis.explanation}</Text>
        ) : (
          <Text style={{ fontSize: 12, color: colors.ts, lineHeight: 20, marginTop: 8 }}>
            Aucun commentaire détaillé n’a été enregistré pour ce scan.
          </Text>
        )}

        {(hypothesis?.actions || []).map((action, index) => (
          <Text key={index} style={{ fontSize: 11, color: colors.tx, marginTop: 2 }}>• {action}</Text>
        ))}

        {scan?.correction && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.aG, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, color: colors.a }}>
              ✏️ {scan.correction_text || 'Correction utilisateur'} → {scan.correction_emotion || scan.corrected_label || 'État corrigé'}
            </Text>
          </View>
        )}

        {!scan?.validated && !scan?.correction && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.bg3, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, color: colors.ts }}>
              Ce scan est enregistré sans correction manuelle supplémentaire.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
