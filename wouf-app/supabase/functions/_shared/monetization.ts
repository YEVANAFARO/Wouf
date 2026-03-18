export const REFERRAL_TIERS = [
  { referrals: 1, founder_status: 'founder_1', beta_priority_score: 10, label: 'Badge fondateur' },
  { referrals: 3, founder_status: 'founder_3', beta_priority_score: 30, label: 'Priorité bêta' },
  { referrals: 5, founder_status: 'founder_5', beta_priority_score: 50, label: 'Avantage premium (en attente)' },
  { referrals: 10, founder_status: 'founder_10', beta_priority_score: 100, label: 'VIP fondateur' },
];

export function resolveReferralTier(referralCount: number) {
  let tier: (typeof REFERRAL_TIERS)[number] | null = null;
  for (const t of REFERRAL_TIERS) {
    if (referralCount >= t.referrals) tier = t;
  }

  if (!tier) {
    return {
      founder_status: 'standard',
      beta_priority_score: 0,
      label: 'Standard',
    };
  }

  return tier;
}
