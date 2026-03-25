// WOUF — Scan Flow Screen (FEATURE #4)
// Full flow: Mode → Recording → Context → Body → Confirm → Analyzing → Result
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemeContext, DogsContext, AuthContext } from '../../context/appContexts';
import AudioService from '../../services/audio';
import { interpretBark } from '../../services/ai';
import { scanService, profileService } from '../../services/database';
import { CONTEXTS, BODY_QUESTIONS_QUICK, BODY_QUESTIONS_PRECISE } from '../../config/constants';
import { canScanWithPlan } from '../../services/monetization';
import { getUserFacingError } from '../../services/userFacingErrors';

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeHypotheses(result) {
  const hypotheses = Array.isArray(result?.hypotheses)
    ? result.hypotheses.filter((item) => item?.category)
    : [];

  return {
    ...result,
    hypotheses,
  };
}

export default function ScanFlowScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const { refresh, profile } = useContext(AuthContext);
  const [step, setStep] = useState('mode');
  const [mode, setMode] = useState(null);
  const [context, setContext] = useState({});
  const [body, setBody] = useState({});
  const [bodyIdx, setBodyIdx] = useState(0);
  const [audioResult, setAudioResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [selectedHyp, setSelectedHyp] = useState(null);
  const [volume, setVolume] = useState(0);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef(null);
  const bodyQs = useMemo(() => (mode === 'precise' ? BODY_QUESTIONS_PRECISE : BODY_QUESTIONS_QUICK), [mode]);
  const safeVolume = clamp(Math.round(toFiniteNumber(volume, 0)), 0, 100);
  const safeProgress = clamp(toFiniteNumber(progress, 0), 0, 1);
  const progressWidthPct = step === 'verifying' ? '100%' : `${Math.round(safeProgress * 100)}%`;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      AudioService.cancel().catch(() => {});
    };
  }, []);

  const leaveScan = (fallbackRoute = 'Home') => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(fallbackRoute);
  };

  const resetFlow = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await AudioService.cancel().catch(() => {});
    setMode(null);
    setContext({});
    setBody({});
    setBodyIdx(0);
    setAudioResult(null);
    setAiResult(null);
    setSelectedHyp(null);
    setVolume(0);
    setProgress(0);
    setSaving(false);
    setStep('mode');
  };

  const finishRecording = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      let result = await AudioService.stopRecording();
      if (!result) {
        Alert.alert('Scan interrompu', 'Aucun enregistrement exploitable n’a été récupéré. Réessaie quand ton chien aboie à nouveau.');
        await resetFlow();
        return;
      }

      if (result.needsAI) {
        setStep('verifying');
        result = await AudioService.verifyWithAI(result, result.uri);
      }

      setAudioResult(result);

      if (result.isBark) {
        setStep('context');
        return;
      }

      const msgs = {
        human_voice: { icon: '🗣️', title: 'Voix humaine détectée', body: result.reason || 'WOUF a surtout détecté une voix humaine, pas un aboiement canin.' },
        fake: { icon: '🎭', title: 'Faux aboiement détecté', body: result.reason || 'Ce son ressemble à une imitation humaine. WOUF a besoin d’un vrai aboiement pour fonctionner.' },
        ambient: { icon: '🔇', title: 'Bruit ambiant', body: result.reason || 'Le bruit de fond est trop présent. Rapproche-toi de ton chien.' },
        silence: { icon: '🤫', title: 'Aucun son capté', body: result.reason || 'Aucun son significatif détecté. Vérifie le micro puis réessaie.' },
      };
      const message = msgs[result.detectionType] || msgs.ambient;

      Alert.alert(
        `${message.icon} ${message.title}`,
        `${message.body}\n\n💡 Confiance: ${result.confidence || 0}%${result.aiVerified ? ' (vérifié par IA)' : ''}`,
        [{ text: 'Réessayer', onPress: () => resetFlow() }]
      );
    } catch (error) {
      Alert.alert('Erreur audio', getUserFacingError(error, 'Impossible de traiter cet enregistrement pour le moment.'));
      await resetFlow();
    }
  };

  const startRecording = async (selectedMode) => {
    if (!activeDog?.id) {
      Alert.alert('Chien requis', 'Sélectionne d’abord un chien avant de lancer un scan.');
      return;
    }

    try {
      const todayCount = await scanService.countTodayForUser();
      const quota = canScanWithPlan({ plan: profile?.plan, todayCount });
      if (!quota.allowed) {
        Alert.alert(
          'Limite atteinte',
          `Plan ${String(profile?.plan || 'free').toUpperCase()} : ${quota.limit} scans/jour. Passe en Plus ou Pro pour débloquer davantage.`
        );
        return;
      }
    } catch (quotaError) {
      console.warn('[Scan] quota check failed:', quotaError?.message || 'unknown_error');
    }

    setMode(selectedMode);
    setContext({});
    setBody({});
    setBodyIdx(0);
    setAudioResult(null);
    setAiResult(null);
    setSelectedHyp(null);
    setVolume(0);
    setProgress(0);

    const ok = await AudioService.requestPermission();
    if (!ok) {
      Alert.alert('Permission micro requise', 'Active l’accès micro pour pouvoir enregistrer un aboiement.');
      setStep('mode');
      return;
    }

    try {
      setStep('recording');
      await AudioService.startRecording(({ volume: nextVolume, progress: nextProgress }) => {
        setVolume(nextVolume);
        setProgress(nextProgress);
      });
      timeoutRef.current = setTimeout(() => {
        finishRecording();
      }, 7500);
    } catch (error) {
      Alert.alert('Erreur audio', getUserFacingError(error, 'Impossible de démarrer l’enregistrement pour le moment.'));
      await resetFlow();
    }
  };

  const handleInterpret = async () => {
    if (!activeDog?.id || !audioResult) {
      Alert.alert('Scan incomplet', 'Relance un scan complet pour obtenir une interprétation.');
      await resetFlow();
      return;
    }

    setStep('analyzing');

    let scans = [];
    try {
      scans = await scanService.getForDog(activeDog.id, { limit: 10 });
    } catch (historyError) {
      console.warn('[Scan] history load skipped', historyError?.message || 'unknown_error');
    }

    try {
      const result = sanitizeHypotheses(
        await interpretBark(activeDog, context, body, scans, mode, AudioService.getMetadata(audioResult))
      );

      if (!result.hypotheses.length) {
        Alert.alert('Résultat incomplet', 'WOUF n’a pas reçu assez d’éléments pour proposer 3 hypothèses fiables. Réessaie avec un enregistrement plus clair.');
        await resetFlow();
        return;
      }

      setAiResult(result);
      setSelectedHyp(result.hypotheses[0] || null);
      setStep('result');
    } catch (error) {
      Alert.alert('Interprétation indisponible', getUserFacingError(error, 'Impossible de générer une interprétation pour le moment.'));
      await resetFlow();
    }
  };

  const handleSave = async () => {
    if (!selectedHyp || !aiResult?.hypotheses?.length || !activeDog?.id) return;

    const validatedHypothesis = Math.max(
      0,
      aiResult.hypotheses.findIndex(
        (hypothesis) => hypothesis.category === selectedHyp.category && hypothesis.confidence === selectedHyp.confidence
      )
    );

    setSaving(true);
    try {
      const createdScan = await scanService.create({
        dogId: activeDog.id,
        mode,
        isBark: Boolean(audioResult?.isBark),
        detectionType: audioResult?.detectionType || 'uncertain',
        audioDuration: audioResult?.duration,
        audioSignature: audioResult?.audioSignature,
        audioDetails: audioResult?.details,
        context,
        bodyLanguage: body,
        hypotheses: aiResult.hypotheses,
        topHypothesis: aiResult.top_hypothesis || selectedHyp.category,
        confidenceTop: aiResult.confidence_top ?? selectedHyp.confidence,
        vetFlag: Boolean(aiResult.vet_flag),
        selectedHypothesis: selectedHyp.category,
        validatedHypothesis,
        validated: true,
        scanStateScores: aiResult.scan_state_scores,
        cartographyNote: aiResult.cartography_note,
        recurringPattern: aiResult.recurring_pattern,
        aiAdvice: aiResult.advice || aiResult.ai_advice,
        rawAiResponse: aiResult,
      });

      await profileService.addXp(mode === 'precise' ? 30 : 20);
      await refresh();

      if (Array.isArray(createdScan?.warnings) && createdScan.warnings.length) {
        Alert.alert(
          'Scan enregistré',
          'Le scan principal a bien été sauvegardé. Certaines analyses secondaires seront complétées ou recalculées plus tard.'
        );
      }

      await resetFlow();
      leaveScan();
    } catch (error) {
      Alert.alert('Sauvegarde impossible', getUserFacingError(error, 'Le résultat reste affiché, mais la sauvegarde a échoué. Réessaie dans un instant.'));
    } finally {
      setSaving(false);
    }
  };

  if (step === 'mode') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
        <TouchableOpacity onPress={() => leaveScan()} style={{ position: 'absolute', top: 50, left: 16 }}>
          <Text style={{ color: colors.p, fontWeight: '600' }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>🎙️</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.tx, textAlign: 'center' }}>Analyser {activeDog?.name || 'mon chien'}</Text>
        {!activeDog && (
          <Text style={{ fontSize: 12, color: colors.ts, textAlign: 'center', marginTop: 8 }}>
            Ajoute ou sélectionne un chien avant de lancer un scan.
          </Text>
        )}
        {[['quick', '⚡ Rapide', '3 questions', colors.b], ['precise', '🎯 Précis', '7 questions', colors.p]].map(([id, title, subtitle, color]) => (
          <TouchableOpacity
            key={id}
            onPress={() => startRecording(id)}
            disabled={!activeDog}
            style={{ width: '100%', padding: 16, borderRadius: 14, backgroundColor: colors.bg2, borderWidth: 2, borderColor: color + '40', marginTop: 10, opacity: activeDog ? 1 : 0.5 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.ts }}>{subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (step === 'recording' || step === 'verifying') {
    return (
      <View style={{ flex: 1, backgroundColor: '#060C17', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: `rgba(0,240,192,${Math.min(volume / 200, 0.25).toFixed(2)})`, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>{step === 'verifying' ? '🧠' : '🎙️'}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 16 }}>
          {step === 'verifying' ? 'Vérification IA…' : `J'écoute ${activeDog?.name || 'ton chien'}…`}
        </Text>
        {step === 'verifying' ? (
          <Text style={{ fontSize: 12, color: '#8494AA', marginTop: 8, textAlign: 'center' }}>
            Cas ambigu détecté — l'IA vérifie si c'est bien un vrai aboiement.
          </Text>
        ) : (
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#00F0C0', marginTop: 8 }}>{safeVolume}%</Text>
        )}
        <View style={{ width: '60%', height: 4, backgroundColor: '#1C2E46', borderRadius: 2, marginTop: 12 }}>
          <View style={{ width: progressWidthPct, height: '100%', backgroundColor: step === 'verifying' ? '#A78BFA' : '#00F0C0', borderRadius: 2 }} />
        </View>
        <TouchableOpacity onPress={resetFlow} style={{ marginTop: 18 }}>
          <Text style={{ color: '#AFC0D5', fontSize: 12, fontWeight: '700' }}>Annuler ce scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'context') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 18 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Contexte</Text>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CONTEXTS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setContext((previous) => ({ ...previous, [item]: !previous[item] }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 5, marginBottom: 5, backgroundColor: context[item] ? colors.pG : colors.bg2, borderWidth: context[item] ? 2 : 1, borderColor: context[item] ? colors.p + '50' : colors.bd }}
              >
                <Text style={{ fontSize: 12, color: context[item] ? colors.p : colors.tx }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity onPress={() => { setBodyIdx(0); setStep('body'); }} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.bg, fontWeight: '700' }}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'body' && bodyQs[bodyIdx]) {
    const question = bodyQs[bodyIdx];
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 18 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.pu }}>{bodyIdx + 1}/{bodyQs.length}</Text>
        <Text style={{ fontSize: 32, marginBottom: 6 }}>{question.icon}</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx }}>{question.q.replace('{name}', activeDog?.name || 'ton chien')}</Text>
        <ScrollView style={{ flex: 1, marginTop: 12 }}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                setBody((previous) => ({ ...previous, [question.id]: option }));
                if (bodyIdx < bodyQs.length - 1) setBodyIdx((value) => value + 1);
                else setStep('confirm');
              }}
              style={{ padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.bd }}
            >
              <Text style={{ fontSize: 13, color: colors.tx }}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>🧠</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx }}>Interpréter ?</Text>
        <Text style={{ fontSize: 12, color: colors.ts, textAlign: 'center', marginTop: 8 }}>
          WOUF croise l’audio, le contexte, le langage corporel et l’historique récent pour proposer 3 hypothèses prudentes.
        </Text>
        <TouchableOpacity onPress={handleInterpret} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40, marginTop: 28 }}>
          <Text style={{ color: colors.bg, fontSize: 16, fontWeight: '800' }}>🧠 Lancer l’analyse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'analyzing') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20 }}>🧠</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tx, marginTop: 10 }}>Analyse IA…</Text>
        <Text style={{ fontSize: 12, color: colors.ts, marginTop: 6 }}>Quelques secondes suffisent en général.</Text>
      </View>
    );
  }

  if (step === 'result' && aiResult) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.tx, marginBottom: 10 }}>3 interprétations</Text>
          {aiResult.hypotheses.map((hypothesis, index) => (
            <TouchableOpacity
              key={`${hypothesis.category}-${index}`}
              onPress={() => setSelectedHyp(hypothesis)}
              style={{ padding: 12, marginBottom: 7, borderRadius: 14, backgroundColor: selectedHyp === hypothesis ? (hypothesis.color || colors.p) + '10' : colors.bg2, borderWidth: selectedHyp === hypothesis ? 2 : 1, borderColor: selectedHyp === hypothesis ? hypothesis.color || colors.p : colors.bd }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: hypothesis.color || colors.p }}>
                {hypothesis.emoji || '🐾'} {hypothesis.category} — {hypothesis.confidence}%
              </Text>
              <Text style={{ fontSize: 11, color: colors.ts, marginTop: 4 }}>{hypothesis.explanation}</Text>
            </TouchableOpacity>
          ))}

          {aiResult.ai_advice || aiResult.advice ? (
            <View style={{ backgroundColor: colors.bg2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.bd, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.p }}>Conseil prudent</Text>
              <Text style={{ fontSize: 11, color: colors.tx, lineHeight: 18, marginTop: 4 }}>{aiResult.ai_advice || aiResult.advice}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={handleSave} disabled={!selectedHyp || saving} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: selectedHyp && !saving ? 1 : 0.3 }}>
            <Text style={{ color: colors.bg, fontWeight: '700' }}>
              {saving ? 'Sauvegarde…' : selectedHyp ? `Valider « ${selectedHyp.category} »` : 'Sélectionne une hypothèse'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetFlow} disabled={saving} style={{ alignItems: 'center', marginTop: 12, opacity: saving ? 0.4 : 1 }}>
            <Text style={{ color: colors.ts, fontSize: 12 }}>Annuler et recommencer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}
