# LOT 4 — Scan Pipeline V1 & Persistence Mapping

## Audio metadata available in app (from `AudioService`)
- `duration`
- `isBark`
- `detectionType`
- `confidence`
- `audioSignature`
  - `peakFreq`
  - `volume`
  - `bands.{sub200,low,mid,high,vhigh}`
  - `burstCount`
  - `avgBurstMs`
- `details` (heuristics: `modRate`, `burstCount`, etc.)
- `aiVerified`

## End-to-end pipeline (LOT 4)
1. Capture audio + local metadata in app
2. If ambiguous, call `verify-audio` (Edge Function)
3. If bark flow continues, call `interpret-scan` (Edge Function)
4. Persist to DB via `scanService.create`:
   - insert in `scans` (legacy + V2 compatibility)
   - insert in `scan_features` (V2)

## Mapping: `scans`
Main V2 fields persisted:
- `mode` <- `scanData.mode`
- `bark_detected` <- `scanData.isBark`
- `context_json` <- `scanData.context`
- `body_json` <- `scanData.bodyLanguage`
- `top_hypothesis` <- `scanData.topHypothesis || first hypothesis category`
- `hypotheses_json` <- `scanData.hypotheses`
- `confidence_top` <- `scanData.confidenceTop || first hypothesis confidence`
- `vet_flag` <- `scanData.vetFlag`
- `audio_duration` <- `scanData.audioDuration`

Legacy compatibility fields kept in parallel:
- `scan_mode`, `is_bark`, `context`, `body_language`, `hypotheses`, `ai_advice`, `raw_ai_response`, etc.

## Mapping: `scan_features`
- `scan_id` <- inserted `scans.id`
- `dog_id` <- `scanData.dogId`
- `peak_freq` <- `scanData.audioSignature.peakFreq`
- `rms_energy` <- `scanData.audioSignature.volume` (V1 proxy)
- `low_band_energy` <- `scanData.audioSignature.bands.low`
- `mid_band_energy` <- `scanData.audioSignature.bands.mid`
- `high_band_energy` <- `scanData.audioSignature.bands.high`
- `bark_rate` <- `scanData.audioDetails.modRate` (V1 proxy)
- `burst_count` <- `scanData.audioSignature.burstCount`
- `spectral_centroid`, `spectral_rolloff`, `zcr`, `mfcc_summary` <- nullable in V1 if unavailable

## Fallback / error behavior
- `verify-audio` error: local result kept (no crash)
- `interpret-scan` error: safe error surfaced to user
- DB persistence error (`scans` or `scan_features`): user sees save error alert
- `non_bark` / `uncertain`: flow remains safe and non-blocking
