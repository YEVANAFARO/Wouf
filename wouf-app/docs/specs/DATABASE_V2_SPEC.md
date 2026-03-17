# DATABASE_V2_SPEC.md

## Tables principales

### profiles
- id
- email
- phone nullable
- birth_month nullable
- birth_year nullable
- referral_code unique
- referred_by nullable
- referral_count int default 0
- founder_status text default 'standard'
- beta_priority_score int default 0
- plan text default 'free'
- created_at
- updated_at

### dogs
- id
- user_id
- name
- sex
- age_years nullable
- breed_primary nullable
- breed_secondary nullable
- size nullable
- neutered nullable
- personality_tags jsonb
- trigger_tags jsonb
- health_flags jsonb
- created_at
- updated_at

### scans
- id
- dog_id
- user_id
- mode
- audio_url nullable
- audio_duration nullable
- bark_detected boolean
- context_json jsonb
- body_json jsonb
- top_hypothesis nullable
- hypotheses_json jsonb
- selected_hypothesis nullable
- confidence_top nullable
- ai_advice nullable
- vet_flag boolean default false
- validated boolean default false
- corrected_label nullable
- created_at

### scan_features
- id
- scan_id
- dog_id
- peak_freq
- spectral_centroid
- spectral_rolloff
- rms_energy
- zcr
- low_band_energy
- mid_band_energy
- high_band_energy
- bark_rate
- burst_count
- mfcc_summary jsonb nullable
- created_at

### dog_voice_profile
- dog_id primary key
- sample_count
- avg_peak_freq
- avg_centroid
- avg_rolloff
- avg_rms
- avg_zcr
- avg_low_band
- avg_mid_band
- avg_high_band
- avg_bark_rate
- avg_burst_count
- variance_json jsonb
- profile_vector jsonb
- reliability_level text
- updated_at

### scan_state_scores
- id
- scan_id
- state_code
- score
- rank
- source_breakdown jsonb

### recurring_patterns
- id
- dog_id
- pattern_type
- label
- score
- source_json
- updated_at

### user_feedback_events
- id
- scan_id
- user_id
- feedback_type
- selected_label nullable
- free_text nullable
- created_at

## RLS
Chaque utilisateur ne peut lire/écrire que ses propres profils, chiens, scans et événements.
