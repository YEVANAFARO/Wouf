import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ThemeContext, DogsContext } from '../../context/appContexts';
import { scanService } from '../../services/database';
import { getUserFacingError } from '../../services/userFacingErrors';

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const LOAD_TIMEOUT_MS = 8000;
const EMPTY_STATS = {
  total: 0,
  validatedCount: 0,
  correctedCount: 0,
  hasEnoughHistory: false,
  probableStates: [],
  validatedStates: [],
  hours: Array(24).fill(0),
  triggers: [],
  topContexts: [],
  days: Array(7).fill(0),
  recurring: [],
  latestAdvice: null,
  latestPattern: null,
  latestNote: 'Pas encore assez de scans pour afficher une cartographie utile.',
};

export default function CartographyScreen() {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!activeDog?.id) {
      setStats(EMPTY_STATS);
      setLoadError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const nextStats = await Promise.race([
        scanService.getStats(activeDog.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('cartography_timeout')), LOAD_TIMEOUT_MS)),
      ]);
      setStats({ ...EMPTY_STATS, ...nextStats });
    } catch (error) {
      setStats(EMPTY_STATS);
      setLoadError(getUserFacingError(error, 'Impossible de charger la cartographie pour le moment.'));
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
        <Text style={{ fontSize: 42 }}>🗺️</Text>
        <Text style={{ color: colors.tx, fontSize: 16, fontWeight: '800', marginTop: 10 }}>Aucun chien sélectionné</Text>
        <Text style={{ color: colors.ts, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
          Ajoute ou sélectionne un chien pour voir sa cartographie émotionnelle.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.ts }}>Chargement...</Text>
      </View>
    );
  }

  const probable = stats.probableStates || [];
  const validated = stats.validatedStates || [];
  const recurring = stats.recurring || [];
  const topContexts = stats.topContexts || [];
  const hours = (Array.isArray(stats.hours) && stats.hours.length === 24 ? stats.hours : EMPTY_STATS.hours)
    .map((value) => toFiniteNumber(value, 0));
  const days = (Array.isArray(stats.days) && stats.days.length === 7 ? stats.days : EMPTY_STATS.days)
    .map((value) => toFiniteNumber(value, 0));
  const rawMaxHour = Math.max(...hours, 0);
  const maxHour = Math.max(rawMaxHour, 1);
  const hourMaxLabel = hours.findIndex((n) => n === rawMaxHour);
  const rawMaxDay = Math.max(...days, 0);
  const maxDay = Math.max(rawMaxDay, 1);

  const SectionCard = ({ title, subtitle, children }) => (
    <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.bd }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.tx }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>{subtitle}</Text>}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );

  const StatBars = ({ items, color, emptyText, totalMode = 'count' }) => {
    if (!items.length) return <Text style={{ fontSize: 11, color: colors.td }}>{emptyText}</Text>;
    const max = Math.max(...items.map(([, value]) => Number(value || 0)), 1);
    return items.map(([label, value]) => {
      const numericValue = toFiniteNumber(value, 0);
      const display = totalMode === 'score' ? Math.round(numericValue) : numericValue;
      const width = `${clamp(Math.round((numericValue / max) * 100), 8, 100)}%`;
      return (
        <View key={label} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: colors.tx }}>{label}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{display}{totalMode === 'score' ? ' pts' : ''}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: colors.bd, borderRadius: 4 }}>
            <View style={{ width, height: '100%', backgroundColor: color, borderRadius: 4 }} />
          </View>
        </View>
      );
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx, marginBottom: 10 }}>🗺️ {activeDog.name}</Text>

      {!!loadError && (
        <View style={{ backgroundColor: colors.aG, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.a }}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.p, fontSize: 11, fontWeight: '700' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ backgroundColor: colors.pG, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.p + '35' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.p }}>Lecture probabiliste</Text>
        <Text style={{ fontSize: 11, color: colors.tx, lineHeight: 18, marginTop: 4 }}>
          Cette cartographie montre des tendances observées dans les scans et validations enregistrés. Elle aide à repérer des répétitions utiles, sans poser de diagnostic certain.
        </Text>
      </View>

      {!stats.total && !loadError && (
        <View style={{ backgroundColor: colors.bg2, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.bd }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tx }}>Cartographie vide pour l’instant</Text>
          <Text style={{ fontSize: 11, color: colors.ts, marginTop: 4 }}>
            Lance quelques scans validés pour faire émerger des tendances horaires, contextuelles et récurrentes.
          </Text>
        </View>
      )}

      {!stats.hasEnoughHistory && (
        <View style={{ backgroundColor: colors.gG, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.g + '35' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.g }}>Historique encore léger</Text>
          <Text style={{ fontSize: 11, color: colors.tx, marginTop: 4 }}>
            Les tendances vont devenir plus fiables quand {activeDog.name} aura plus de scans et de validations.
          </Text>
        </View>
      )}

      {stats.validatedCount >= 10 && stats.latestAdvice && (
        <View style={{ backgroundColor: colors.pG, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: colors.p + '40' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.p }}>🎯 Conseil personnalisé</Text>
          <Text style={{ fontSize: 12, color: colors.tx, lineHeight: 20, marginTop: 4 }}>{stats.latestAdvice}</Text>
        </View>
      )}

      <SectionCard
        title="États probables les plus fréquents"
        subtitle="Basé sur `scan_state_scores` et les scores retournés par l'interprétation serveur."
      >
        <StatBars
          items={probable}
          color={colors.b}
          totalMode="score"
          emptyText="Pas assez de signaux probables disponibles pour le moment."
        />
      </SectionCard>

      <SectionCard
        title="États validés / corrigés"
        subtitle="Quand une validation ou correction existe, elle passe avant les hypothèses probables."
      >
        <StatBars
          items={validated}
          color={colors.p}
          emptyText="Aucune validation ou correction enregistrée pour l'instant."
        />
      </SectionCard>

      <SectionCard
        title="Heatmap horaire simplifiée"
        subtitle={rawMaxHour > 0 ? `Pic observé vers ${hourMaxLabel}h.` : 'Pas encore assez de scans pour dégager une plage dominante.'}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 64 }}>
          {hours.map((count, hour) => (
            <View key={hour} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: '80%',
                  height: clamp((toFiniteNumber(count, 0) / maxHour) * 56, 4, 56),
                  backgroundColor: count > 0 ? colors.b : colors.b + '18',
                  borderRadius: 2,
                }}
              />
              {hour % 6 === 0 && <Text style={{ fontSize: 7, color: colors.td }}>{hour}h</Text>}
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Déclencheurs les plus récurrents"
        subtitle="Basé sur les contextes cochés dans les scans."
      >
        <StatBars
          items={stats.triggers || []}
          color={colors.g}
          emptyText="Aucun déclencheur récurrent clair pour le moment."
        />
      </SectionCard>

      <SectionCard
        title="Contextes les plus fréquents"
        subtitle="Combinaisons de contexte observées le plus souvent dans les scans enregistrés."
      >
        <StatBars
          items={topContexts}
          color={colors.a}
          emptyText="Pas encore assez de scans pour faire ressortir des contextes dominants."
        />
      </SectionCard>

      <SectionCard
        title="Évolution dans le temps"
        subtitle="Vue simple par jour de semaine pour repérer les périodes où l'activité revient le plus."
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 54 }}>
          {days.map((count, index) => (
            <View key={`${DAY_LABELS[index]}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: '70%',
                  height: clamp((toFiniteNumber(count, 0) / maxDay) * 46, 4, 46),
                  backgroundColor: count > 0 ? colors.p : colors.p + '18',
                  borderRadius: 2,
                }}
              />
              <Text style={{ fontSize: 8, color: colors.td, marginTop: 4 }}>{DAY_LABELS[index]}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Tendances récurrentes détectées"
        subtitle="Basé sur les données persistées dans `recurring_patterns`."
      >
        {!recurring.length ? (
          <Text style={{ fontSize: 11, color: colors.td }}>Pas assez d'historique pour dégager une tendance stable.</Text>
        ) : recurring.map((item, idx) => (
          <View key={`${item.type}-${item.label}-${idx}`} style={{ marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.bd }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tx }}>{item.type} · {item.label}</Text>
            <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>
              Intensité observée: {Math.round((item.score || 0) * 100)}%
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title="Repère rapide"
        subtitle="Lecture simple des volumes observés, à manipuler avec prudence."
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, color: colors.ts }}>Scans</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.tx }}>{stats.total}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: colors.ts }}>Validés</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.p }}>{stats.validatedCount}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: colors.ts }}>Corrigés</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.a }}>{stats.correctedCount}</Text>
          </View>
        </View>
      </SectionCard>

      {stats.latestNote && (
        <View style={{ backgroundColor: colors.bG, borderRadius: 10, padding: 9, marginBottom: 7 }}>
          <Text style={{ fontSize: 10, color: colors.tx }}>{stats.latestNote}</Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
