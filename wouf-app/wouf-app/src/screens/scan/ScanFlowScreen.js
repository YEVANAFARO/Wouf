// WOUF — Scan Flow Screen (FEATURE #4)
// Full flow: Mode → Recording → Context → Body → Confirm → Analyzing → Result
import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemeContext, DogsContext, AuthContext } from '../../../App';
import AudioService from '../../services/audio';
import { interpretBark } from '../../services/ai';
import { scanService, profileService } from '../../services/database';
import { CONTEXTS, BODY_QUESTIONS_QUICK, BODY_QUESTIONS_PRECISE } from '../../config/constants';

// ⚠️ Même clé que dans ai.js — en prod: via Edge Function
const AI_KEY = 'YOUR_API_KEY';

export default function ScanFlowScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const { refresh } = useContext(AuthContext);
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
  const bodyQs = mode === 'precise' ? BODY_QUESTIONS_PRECISE : BODY_QUESTIONS_QUICK;

  const startRecording = async (selectedMode) => {
    setMode(selectedMode);
    setStep('recording');
    const ok = await AudioService.requestPermission();
    if (!ok) { Alert.alert('Permission micro requise'); setStep('mode'); return; }
    AudioService.startRecording(({ volume: v, progress: p }) => { setVolume(v); setProgress(p); });
    setTimeout(async () => {
      try {
        let result = await AudioService.stopRecording();
        if (!result) { setStep('mode'); return; }

        // COUCHE 3: Si détection ambiguë, vérifier avec l'IA
        if (result.needsAI && AI_KEY !== 'YOUR_API_KEY') {
          setStep('verifying');
          result = await AudioService.verifyWithAI(result, result.uri, AI_KEY);
        }

        setAudioResult(result);

        if (result.isBark) {
          setStep('context');
        } else {
          // Messages adaptés au type détecté
          const msgs = {
            human_voice: { icon: '🗣️', title: 'Voix humaine détectée', body: result.reason || 'WOUF a détecté une voix humaine, pas un aboiement canin.' },
            fake: { icon: '🎭', title: 'Faux aboiement détecté', body: result.reason || 'Ce son ressemble à une imitation humaine. WOUF a besoin d\'un vrai aboiement pour fonctionner.' },
            ambient: { icon: '🔇', title: 'Bruit ambiant', body: result.reason || 'Bruit de fond sans aboiement. Rapproche-toi de ton chien.' },
            silence: { icon: '🤫', title: 'Aucun son capté', body: 'Aucun son significatif détecté. Vérifie que le micro fonctionne.' },
          };
          const m = msgs[result.detectionType] || msgs.ambient;
          Alert.alert(
            `${m.icon} ${m.title}`,
            `${m.body}\n\n💡 Confiance: ${result.confidence}%${result.aiVerified ? ' (vérifié par IA)' : ''}`,
            [{ text: 'Réessayer', onPress: () => setStep('mode') }]
          );
        }
      } catch (e) { setStep('mode'); }
    }, 7500);
  };

  if (step === 'mode') return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 50, left: 16 }}>
        <Text style={{ color: colors.p, fontWeight: '600' }}>← Retour</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 52, marginBottom: 14 }}>🎙️</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.tx, textAlign: 'center' }}>Analyser {activeDog?.name}</Text>
      {[['quick', '⚡ Rapide', '3 questions', colors.b], ['precise', '🎯 Précis', '7 questions', colors.p]].map(([id, t, d, c]) => (
        <TouchableOpacity key={id} onPress={() => startRecording(id)} style={{ width: '100%', padding: 16, borderRadius: 14, backgroundColor: colors.bg2, borderWidth: 2, borderColor: c + '40', marginTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: c }}>{t}</Text>
          <Text style={{ fontSize: 12, color: colors.ts }}>{d}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (step === 'recording' || step === 'verifying') return (
    <View style={{ flex: 1, backgroundColor: '#060C17', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(0,240,192,' + Math.min(volume / 200, 0.25).toFixed(2) + ')', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 40 }}>{step === 'verifying' ? '🧠' : '🎙️'}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 16 }}>
        {step === 'verifying' ? 'Vérification IA…' : `J'écoute ${activeDog?.name}…`}
      </Text>
      {step === 'verifying'
        ? <Text style={{ fontSize: 12, color: '#8494AA', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>Cas ambigu détecté — l'IA vérifie si c'est un vrai aboiement</Text>
        : <Text style={{ fontSize: 28, fontWeight: '800', color: '#00F0C0', marginTop: 8 }}>{volume}%</Text>
      }
      <View style={{ width: '60%', height: 4, backgroundColor: '#1C2E46', borderRadius: 2, marginTop: 12 }}>
        <View style={{ width: (step === 'verifying' ? 100 : progress * 100) + '%', height: '100%', backgroundColor: step === 'verifying' ? '#A78BFA' : '#00F0C0', borderRadius: 2 }} />
      </View>
    </View>
  );

  if (step === 'context') return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 18 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Contexte</Text>
      <ScrollView style={{ flex: 1 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CONTEXTS.map(c => <TouchableOpacity key={c} onPress={() => setContext(p => ({ ...p, [c]: !p[c] }))} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 5, marginBottom: 5, backgroundColor: context[c] ? colors.pG : colors.bg2, borderWidth: context[c] ? 2 : 1, borderColor: context[c] ? colors.p + '50' : colors.bd }}>
          <Text style={{ fontSize: 12, color: context[c] ? colors.p : colors.tx }}>{c}</Text>
        </TouchableOpacity>)}
      </View></ScrollView>
      <TouchableOpacity onPress={() => { setBodyIdx(0); setStep('body'); }} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: colors.bg, fontWeight: '700' }}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'body' && bodyQs[bodyIdx]) {
    const q = bodyQs[bodyIdx];
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 18 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.pu }}>{bodyIdx + 1}/{bodyQs.length}</Text>
        <Text style={{ fontSize: 32, marginBottom: 6 }}>{q.icon}</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx }}>{q.q.replace('{name}', activeDog?.name)}</Text>
        <ScrollView style={{ flex: 1, marginTop: 12 }}>
          {q.options.map(o => <TouchableOpacity key={o} onPress={() => { setBody(p => ({ ...p, [q.id]: o })); if (bodyIdx < bodyQs.length - 1) setBodyIdx(i => i + 1); else setStep('confirm'); }} style={{ padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.bd }}>
            <Text style={{ fontSize: 13, color: colors.tx }}>{o}</Text>
          </TouchableOpacity>)}
        </ScrollView>
      </View>
    );
  }

  if (step === 'verifying') return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      <Text style={{ fontSize: 40 }}>🔍</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tx, marginTop: 10, textAlign: 'center' }}>Vérification IA de l'audio…</Text>
      <Text style={{ fontSize: 12, color: colors.ts, marginTop: 6, textAlign: 'center' }}>L'IA écoute l'enregistrement pour confirmer la détection.</Text>
    </View>
  );

  if (step === 'confirm') return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      <Text style={{ fontSize: 52, marginBottom: 14 }}>🧠</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx }}>Interpréter ?</Text>
      <TouchableOpacity onPress={async () => {
        setStep('analyzing');
        const scans = await scanService.getForDog(activeDog.id, { limit: 10 });
        const result = await interpretBark(activeDog, context, body, scans, mode);
        if (result) { setAiResult(result); setStep('result'); } else { Alert.alert('Erreur'); setStep('mode'); }
      }} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40, marginTop: 28 }}>
        <Text style={{ color: colors.bg, fontSize: 16, fontWeight: '800' }}>🧠 Go</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'analyzing') return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>🧠</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tx, marginTop: 10 }}>Analyse IA…</Text>
    </View>
  );

  if (step === 'result' && aiResult) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.tx, marginBottom: 10 }}>3 interprétations</Text>
        {aiResult.hypotheses.map((h, i) => (
          <TouchableOpacity key={i} onPress={() => setSelectedHyp(h)} style={{ padding: 12, marginBottom: 7, borderRadius: 14, backgroundColor: selectedHyp === h ? (h.color || colors.p) + '10' : colors.bg2, borderWidth: selectedHyp === h ? 2 : 1, borderColor: selectedHyp === h ? h.color || colors.p : colors.bd }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: h.color || colors.p }}>{h.emoji} {h.category} — {h.confidence}%</Text>
            <Text style={{ fontSize: 11, color: colors.ts, marginTop: 4 }}>{h.explanation}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={async () => {
          if (!selectedHyp) return;
          await scanService.create({ dogId: activeDog.id, audioDuration: audioResult?.duration, audioSignature: audioResult?.audioSignature, isBark: true, detectionType: 'bark', mode, context, bodyLanguage: body, hypotheses: aiResult.hypotheses, cartographyNote: aiResult.cartography_note, recurringPattern: aiResult.recurring_pattern, aiAdvice: aiResult.advice, rawAiResponse: aiResult });
          await profileService.addXp(mode === 'precise' ? 30 : 20);
          await refresh();
          navigation.goBack();
        }} disabled={!selectedHyp} style={{ backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: selectedHyp ? 1 : 0.3 }}>
          <Text style={{ color: colors.bg, fontWeight: '700' }}>{selectedHyp ? 'Valider « ' + selectedHyp.category + ' »' : 'Sélectionne'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  return null;
}
