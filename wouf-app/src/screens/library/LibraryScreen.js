import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { ThemeContext, DogsContext } from '../../../App';
import { scanService } from '../../services/database';
import { getUserFacingError } from '../../services/userFacingErrors';

function resolveScanLabel(scan) {
  return scan?.corrected_label
    || (scan?.correction ? scan?.correction_emotion : null)
    || scan?.selected_hypothesis
    || scan?.top_hypothesis
    || scan?.hypotheses_json?.[scan?.validated_hypothesis || 0]?.category
    || scan?.hypotheses?.[scan?.validated_hypothesis || 0]?.category
    || scan?.hypotheses_json?.[0]?.category
    || scan?.hypotheses?.[0]?.category
    || 'État non précisé';
}

function formatScanDate(scan) {
  const raw = scan?.scanned_at || scan?.created_at;
  if (!raw) return 'Date indisponible';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 'Date indisponible' : date.toLocaleDateString('fr-FR');
}

export default function LibraryScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!activeDog?.id) {
      setScans([]);
      setLoadError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      setScans(await scanService.getForDog(activeDog.id));
    } catch (error) {
      setScans([]);
      setLoadError(getUserFacingError(error, 'Impossible de charger l’historique pour le moment.'));
    } finally {
      setLoading(false);
    }
  }, [activeDog?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!activeDog) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 42 }}>📚</Text>
        <Text style={{ color: colors.tx, fontSize: 16, fontWeight: '800', marginTop: 10 }}>Aucun chien sélectionné</Text>
        <Text style={{ color: colors.ts, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
          Ajoute ou sélectionne un chien pour retrouver son historique de scans.
        </Text>
      </View>
    );
  }

  const cats = {};
  scans.forEach((scan) => {
    const label = resolveScanLabel(scan);
    cats[label] = (cats[label] || 0) + 1;
  });

  const items = filter === 'all' ? scans : scans.filter((scan) => resolveScanLabel(scan) === filter);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.p} />}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx, marginBottom: 10 }}>📚 {activeDog.name}</Text>

      {!!loadError && (
        <View style={{ backgroundColor: colors.aG, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <Text style={{ color: colors.a, fontSize: 12, fontWeight: '700' }}>{loadError}</Text>
        </View>
      )}

      <ScrollView horizontal style={{ marginBottom: 10 }}>
        {[['all', 'Tout'], ...Object.entries(cats)].map(([key, value]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              marginRight: 5,
              backgroundColor: filter === key ? colors.pG : colors.bg2,
              borderWidth: 1,
              borderColor: filter === key ? colors.p + '50' : colors.bd,
            }}
          >
            <Text style={{ fontSize: 11, color: filter === key ? colors.p : colors.tx }}>
              {key === 'all' ? 'Tout' : `${key} (${value})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {items.map((scan) => {
        const label = resolveScanLabel(scan);
        const emoji = scan?.hypotheses_json?.[scan?.validated_hypothesis || 0]?.emoji
          || scan?.hypotheses?.[scan?.validated_hypothesis || 0]?.emoji
          || scan?.hypotheses_json?.[0]?.emoji
          || scan?.hypotheses?.[0]?.emoji
          || '🐾';

        return (
          <TouchableOpacity
            key={scan.id}
            onPress={() => navigation.navigate('ScanDetail', { scan })}
            style={{
              backgroundColor: colors.bg2,
              borderRadius: 10,
              padding: 10,
              marginBottom: 5,
              borderWidth: 1,
              borderColor: colors.bd,
              borderLeftWidth: 3,
              borderLeftColor: scan.validated ? colors.p : colors.a,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: scan.validated ? colors.p : colors.a }}>
                {emoji} {label}
              </Text>
              <Text style={{ fontSize: 9, color: colors.td }}>{formatScanDate(scan)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {!loading && items.length === 0 && (
        <View style={{ alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 40 }}>📚</Text>
          <Text style={{ color: colors.td, textAlign: 'center' }}>
            {loadError ? 'Réessaie un peu plus tard.' : 'Aucun scan enregistré pour le moment.'}
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
