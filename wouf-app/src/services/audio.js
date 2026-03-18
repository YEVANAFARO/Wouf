/**
 * WOUF — Audio Recording & Intelligent Detection Service v2
 * ═══════════════════════════════════════════════════════════
 * COUCHE 1: Analyse metering temps réel (volume, pics, patterns)
 * COUCHE 2: Analyse patterns post-enregistrement (bursts, régularité, fake, voix)
 * COUCHE 3: Vérification IA Claude (envoi audio base64 si cas ambigu)
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';

const REC_OPT = {
  isMeteringEnabled: true,
  android: { extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
  ios: { extension: '.m4a', outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
};
const DUR = 7000, MET = 50;
const T = {
  SIL_AVG: 8, SIL_PEAK: 15,
  BARK_PEAK: 25, BARK_RISE: 12, BARK_FALL: 8, BARK_STD: 18, BARK_BUR_MIN: 80, BARK_BUR_MAX: 900, BARK_GAP_MIN: 100, BARK_GAP_MAX: 3000,
  HUM_CONT: 1200, HUM_STD: 14, HUM_MOD_LO: 2, HUM_MOD_HI: 8, HUM_PCT: 55,
  FK_INT_REG: 0.82, FK_VOL_REG: 0.88, FK_RAMP: 0.65, FK_BREATH_LO: 6, FK_BREATH_HI: 25, FK_LONG: 600, FK_GAP_REG: 0.90,
};

class AudioService {
  rec = null; interval = null; data = []; onMeter = null; active = false;

  async requestPermission() { try { return (await Audio.requestPermissionsAsync()).status === 'granted'; } catch { return false; } }

  async startRecording(onMeter) {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
    this.onMeter = onMeter; this.data = []; this.active = true;
    const { recording } = await Audio.Recording.createAsync(REC_OPT);
    this.rec = recording; const t0 = Date.now();
    this.interval = setInterval(async () => {
      if (!this.rec || !this.active) return;
      try { const s = await this.rec.getStatusAsync(); if (s.isRecording && s.metering != null) { const el = Date.now() - t0, v = this._db(s.metering); this.data.push({ ts: el, db: s.metering, v }); if (this.onMeter) this.onMeter({ volume: v, progress: Math.min(el / DUR, 1), elapsed: el }); } } catch {}
    }, MET);
    setTimeout(() => { if (this.active) this.stopRecording(); }, DUR);
  }

  async stopRecording() {
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (!this.rec) return null;
    await this.rec.stopAndUnloadAsync(); const uri = this.rec.getURI(); this.rec = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    return { uri, duration: DUR, ...this._analyze(this.data) };
  }

  async cancel() {
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (this.rec) {
      try { await this.rec.stopAndUnloadAsync(); } catch {}
      this.rec = null;
    }
    try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch {}
  }

  getMetadata(result) {
    if (!result) return null;
    return {
      duration: result.duration ?? null,
      isBark: Boolean(result.isBark),
      detectionType: result.detectionType || 'uncertain',
      confidence: result.confidence ?? null,
      audioSignature: result.audioSignature || null,
      details: result.details || null,
      aiVerified: Boolean(result.aiVerified),
    };
  }

  // ═══ COUCHE 1+2: ANALYSE LOCALE ══════════════════════════

  _analyze(data) {
    if (!data || data.length < 10) return { isBark: false, detectionType: 'silence', confidence: 95, reason: 'Aucun son capté.', audioSignature: this._eSig(), details: {}, needsAI: false };

    const V = data.map(d => d.v);
    const avg = V.reduce((a, b) => a + b, 0) / V.length;
    const mx = Math.max(...V);
    const std = Math.sqrt(V.reduce((s, v) => s + (v - avg) ** 2, 0) / V.length);

    // Bursts
    const bursts = this._bursts(data);
    const nB = bursts.length;
    const avgBD = nB > 0 ? bursts.reduce((s, b) => s + b.dur, 0) / nB : 0;
    const goodB = bursts.filter(b => b.dur >= T.BARK_BUR_MIN && b.dur <= T.BARK_BUR_MAX);
    const longB = bursts.filter(b => b.dur > T.FK_LONG);

    // Peaks
    let nPk = 0, rS = 0, rC = 0, fS = 0, fC = 0;
    for (let i = 1; i < V.length; i++) { const d = V[i] - V[i-1]; if (d > T.BARK_RISE) { nPk++; rS += d; rC++; } if (d < -T.BARK_FALL) { fS += Math.abs(d); fC++; } }
    const aR = rC ? rS / rC : 0, aF = fC ? fS / fC : 0;

    // Continuity (voice)
    const cont = this._continuity(data, avg);

    // Regularity (fake)
    const reg = this._regularity(bursts);

    // Ramp-up + breath
    const ramp = this._ramp(data);
    const breath = this._breath(data, bursts);

    // Speech patterns
    const speech = this._speech(data, V, avg);

    // ═══ SCORING ═══════════════════════════════════════════
    const sc = { bark: 0, human_voice: 0, fake: 0, ambient: 0, silence: 0 };

    // Silence
    if (avg < T.SIL_AVG && mx < T.SIL_PEAK) sc.silence = 95;
    // Ambient
    if (std < 6 && avg < 30 && avg >= T.SIL_AVG) sc.ambient = 60 + Math.round((6 - std) * 5);

    // ── VOIX HUMAINE ──
    if (cont.longMs > T.HUM_CONT) sc.human_voice += 25;
    if (std < T.HUM_STD && std > 4) sc.human_voice += 20;
    if (cont.modRate >= T.HUM_MOD_LO && cont.modRate <= T.HUM_MOD_HI) sc.human_voice += 20;
    if (nPk < 4 && avg > 18) sc.human_voice += 15;
    if (cont.pct > T.HUM_PCT) sc.human_voice += 10;
    if (speech.phonemes) sc.human_voice += 15;
    if (speech.pitch) sc.human_voice += 10;

    // ── FAKE ──
    if (reg.intSim > T.FK_INT_REG && nB >= 2) sc.fake += 30;
    if (reg.volSim > T.FK_VOL_REG && nB >= 2) sc.fake += 25;
    if (ramp) sc.fake += 20;
    if (longB.length > 0 && nB >= 2) sc.fake += 20;
    if (breath) sc.fake += 15;
    if (reg.gapSim > T.FK_GAP_REG && nB >= 3) sc.fake += 15;
    if (reg.durSim > 0.88 && nB >= 2) sc.fake += 10;

    // ── VRAI ABOIEMENT ──
    if (nPk >= 1 && nPk <= 30) sc.bark += 12;
    if (std > T.BARK_STD) sc.bark += 15;
    if (mx > T.BARK_PEAK) sc.bark += 10;
    if (goodB.length > 0) sc.bark += 20 + Math.min(goodB.length * 4, 15);
    if (aR > T.BARK_RISE) sc.bark += 15;
    if (aF > T.BARK_FALL) sc.bark += 10;
    if (reg.intSim < 0.70 && nB >= 2) sc.bark += 10; // Pas trop régulier
    if (!ramp && mx > 35) sc.bark += 8;
    if (reg.volSim < 0.80 && nB >= 2) sc.bark += 8;  // Volumes variés
    const natGaps = nB >= 2 ? bursts.slice(1).filter((b, i) => { const g = b.start - bursts[i].end; return g >= T.BARK_GAP_MIN && g <= T.BARK_GAP_MAX; }).length : 0;
    if (natGaps > 0) sc.bark += 5 + Math.min(natGaps * 3, 10);

    // ═══ DÉCISION ══════════════════════════════════════════
    const sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    let [type, score] = sorted[0]; let isBark = type === 'bark'; let conf = Math.min(95, score); let reason = '';

    if (score < 25) { type = 'ambient'; isBark = false; conf = 45; reason = 'Signal trop faible ou ambigu.'; }
    else if (type === 'bark' && sc.fake > 40 && sc.fake > sc.bark * 0.6) {
      type = 'fake'; isBark = false; conf = Math.round(Math.min(90, (sc.fake + sc.bark) / 2));
      reason = 'Sons trop réguliers et uniformes. Un vrai chien aboie avec une variabilité naturelle — chaque aboiement diffère en durée et intensité. Ici, c\'est trop "parfait" → imitation humaine.';
    } else if (type === 'bark' && sc.human_voice > 50 && sc.bark - sc.human_voice < 20) {
      type = 'human_voice'; isBark = false; conf = Math.round(Math.min(90, sc.human_voice));
      reason = 'Son continu et modulé, typique de la parole humaine. Un aboiement est un son court suivi de silence, pas un flux vocal.';
    } else if (type === 'human_voice' && sc.fake > 45) {
      type = 'fake'; isBark = false; conf = Math.round(Math.min(90, sc.fake));
      reason = 'Voix humaine imitant un aboiement. Les respirations et la montée progressive trahissent l\'imitation.';
    } else {
      const R = {
        bark: `${nB} aboiement${nB > 1 ? 's' : ''} — pics courts (${Math.round(avgBD)}ms moy.) avec silence entre, variabilité naturelle.`,
        human_voice: 'Flux vocal continu avec modulation. Un aboiement est un son court et brutal, pas un flux.',
        fake: `Imitation : intervalles ${Math.round(reg.intSim * 100)}% identiques${ramp ? ', montée progressive' : ''}${breath ? ', respiration avant le son' : ''}. Trop régulier pour un vrai chien.`,
        ambient: 'Bruit de fond constant. Rapproche-toi de ton chien.', silence: 'Aucun son significatif.',
      };
      reason = R[type] || ''; if (type !== 'bark') isBark = false;
    }

    const needsAI = conf < 75 || (sorted[0][1] - (sorted[1]?.[1] || 0) < 15 && sorted[0][1] > 30) || (type === 'bark' && sc.fake > 30) || (type === 'bark' && sc.human_voice > 35);
    const sig = this._sig(data, bursts, { n: nPk, aR, aF });

    return { isBark, detectionType: type, confidence: Math.round(conf), reason, audioSignature: sig, needsAI,
      details: { scores: sc, burstCount: nB, goodBursts: goodB.length, longBursts: longB.length, peaks: nPk, avgVol: Math.round(avg), maxVol: Math.round(mx), std: Math.round(std * 10) / 10, avgBurstMs: Math.round(avgBD), contPct: cont.pct, longContMs: Math.round(cont.longMs), modRate: Math.round(cont.modRate * 10) / 10, intReg: Math.round(reg.intSim * 100), volReg: Math.round(reg.volSim * 100), durReg: Math.round(reg.durSim * 100), ramp, breath, phonemes: speech.phonemes, pitch: speech.pitch } };
  }

  // ═══ COUCHE 3: VÉRIFICATION IA (audio réel) ══════════════

  async verifyWithAI(result, audioUri) {
    if (!result?.needsAI) return result;
    try {
      const b64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.functions.invoke('verify-audio', {
        body: {
          audioBase64: b64,
          audioMimeType: 'audio/mp4',
          baseline: {
            detectionType: result.detectionType,
            confidence: result.confidence,
            reason: result.reason,
            details: result.details || null,
          },
        },
      });

      if (error || !data?.ok || !data?.data) {
        console.warn('[Audio] verify-audio edge function failed');
        return result;
      }

      const ai = data.data;
      const typeMap = {
        bark: 'bark',
        non_bark: result.detectionType === 'bark' ? 'ambient' : result.detectionType,
        uncertain: result.detectionType,
      };

      const mappedType = typeMap[ai.classification] || result.detectionType;
      const isBark = ai.classification === 'bark';
      const fc = Math.round((Number(ai.confidence) || result.confidence) * 0.65 + result.confidence * 0.35);

      return {
        ...result,
        isBark,
        detectionType: mappedType,
        confidence: fc,
        reason: ai.reason || result.reason,
        aiVerified: true,
        aiResult: ai,
      };
    } catch (e) {
      console.warn('[Audio] verify-audio failed:', e?.message || 'unknown_error');
      return result;
    }
  }

  // ═══ HELPERS ═════════════════════════════════════════════

  _bursts(data) {
    const th = T.BARK_PEAK * 0.55; const bs = []; let inB = false, s = 0, pk = 0, n = 0;
    for (const d of data) {
      if (d.v > th) { if (!inB) { inB = true; s = d.ts; pk = d.v; n = 1; } else { pk = Math.max(pk, d.v); n++; } }
      else if (inB) { const dur = d.ts - s; if (dur >= 40) bs.push({ start: s, end: d.ts, dur, peak: pk, n }); inB = false; }
    }
    if (inB && data.length > 0) { const dur = data[data.length - 1].ts - s; if (dur >= 40) bs.push({ start: s, end: data[data.length - 1].ts, dur, peak: pk, n }); }
    return bs;
  }

  _continuity(data, avg) {
    const nf = Math.max(10, avg * 0.3); let longMs = 0, cStart = null, above = 0, cross = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].v > nf) { above++; if (cStart === null) cStart = data[i].ts; } else if (cStart !== null) { longMs = Math.max(longMs, data[i].ts - cStart); cStart = null; }
      if (i > 0 && (data[i].v > avg) !== (data[i - 1].v > avg)) cross++;
    }
    if (cStart !== null && data.length > 0) longMs = Math.max(longMs, data[data.length - 1].ts - cStart);
    const tot = data.length > 1 ? data[data.length - 1].ts - data[0].ts : 1;
    return { longMs, pct: Math.round(above / data.length * 100), modRate: cross / (tot / 1000) };
  }

  _regularity(bs) {
    if (bs.length < 2) return { intSim: 0, volSim: 0, durSim: 0, gapSim: 0 };
    const ints = [], gaps = [];
    for (let i = 1; i < bs.length; i++) { ints.push(bs[i].start - bs[i - 1].start); gaps.push(bs[i].start - bs[i - 1].end); }
    return { intSim: this._sim(ints), volSim: this._sim(bs.map(b => b.peak)), durSim: this._sim(bs.map(b => b.dur)), gapSim: this._sim(gaps) };
  }

  _ramp(data) {
    const w = Math.min(data.length, 8); if (w < 5) return false;
    let inc = 0; for (let i = 1; i < w; i++) if (data[i].v > data[i - 1].v + 1) inc++;
    return inc / (w - 1) > T.FK_RAMP;
  }

  _breath(data, bs) {
    if (bs.length === 0) return false;
    const win = data.filter(d => d.ts < bs[0].start && d.ts > bs[0].start - 400);
    if (win.length < 4) return false;
    const a = win.reduce((s, d) => s + d.v, 0) / win.length;
    return a > T.FK_BREATH_LO && a < T.FK_BREATH_HI;
  }

  _speech(data, V, avg) {
    if (data.length < 20) return { phonemes: false, pitch: false };
    let mp = 0, inS = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i].v > avg * 0.6) { inS = true; }
      else if (inS) { inS = false; if (i + 3 < data.length) { const g = data[Math.min(i + 2, data.length - 1)].ts - data[i].ts; if (g < 80 && data[Math.min(i + 3, data.length - 1)]?.v > avg * 0.5) mp++; } }
    }
    const wS = Math.ceil(200 / MET); let pc = 0;
    for (let i = wS; i < V.length - wS; i += wS) { const pA = V.slice(i - wS, i).reduce((a, b) => a + b, 0) / wS, cA = V.slice(i, i + wS).reduce((a, b) => a + b, 0) / wS, d = Math.abs(cA - pA); if (d > 3 && d < 15) pc++; }
    return { phonemes: mp >= 3, pitch: pc >= 4 };
  }

  _sim(vals) { if (vals.length < 2) return 0; const a = vals.reduce((x, b) => x + b, 0) / vals.length; if (a === 0) return 0; return Math.max(0, Math.min(1, 1 - Math.sqrt(vals.reduce((s, v) => s + (v - a) ** 2, 0) / vals.length) / a)); }

  _sig(data, bs, pk) {
    const V = data.map(d => d.v), a = V.reduce((x, b) => x + b, 0) / V.length, m = Math.max(...V), i = m / 100, sh = pk.aR > 18;
    return { bands: { sub200: Math.round(Math.max(2, i * 12 + (bs.length > 3 ? 8 : 0) + Math.random() * 4)), low: Math.round(Math.max(4, i * 22 + (sh ? 3 : 12) + Math.random() * 6)), mid: Math.round(Math.max(8, i * 38 + (sh ? 12 : -4) + Math.random() * 8)), high: Math.round(Math.max(2, i * 22 + (sh ? 8 : -2) + Math.random() * 5)), vhigh: Math.round(Math.max(1, i * 8 + Math.random() * 4)) }, peakFreq: sh ? 800 + Math.round(Math.random() * 1400) : 250 + Math.round(Math.random() * 450), volume: Math.round(a), burstCount: bs.length, avgBurstMs: bs.length ? Math.round(bs.reduce((s, b) => s + b.dur, 0) / bs.length) : 0 };
  }

  _eSig() { return { bands: { sub200: 0, low: 0, mid: 0, high: 0, vhigh: 0 }, peakFreq: 0, volume: 0, burstCount: 0, avgBurstMs: 0 }; }
  _db(db) { return Math.round(((Math.max(-60, Math.min(0, db)) + 60) / 60) * 100); }
  async deleteRecording(uri) { try { if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {} }
}

export default new AudioService();
