export const PLAN_LIMITS = {
  free: {
    scansPerDay: 3,
    maxDogs: 1,
    historyDays: 7,
  },
  plus: {
    scansPerDay: Infinity,
    maxDogs: 3,
    historyDays: 90,
  },
  pro: {
    scansPerDay: Infinity,
    maxDogs: Infinity,
    historyDays: Infinity,
  },
};

export const REFERRAL_TIERS = [
  { referrals: 1, founder_status: 'founder_1', beta_priority_score: 10, label: 'Badge fondateur' },
  { referrals: 3, founder_status: 'founder_3', beta_priority_score: 30, label: 'Priorité bêta' },
  { referrals: 5, founder_status: 'founder_5', beta_priority_score: 50, label: 'Avantage premium (en attente)' },
  { referrals: 10, founder_status: 'founder_10', beta_priority_score: 100, label: 'VIP fondateur' },
];

export function normalizePlan(plan) {
  if (!plan) return 'free';
  const key = String(plan).toLowerCase();
  if (key === 'plus' || key === 'pro' || key === 'free') return key;
  return 'free';
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[normalizePlan(plan)] || PLAN_LIMITS.free;
}

export function canScanWithPlan({ plan, todayCount }) {
  const limits = getPlanLimits(plan);
  if (limits.scansPerDay === Infinity) return { allowed: true, remaining: Infinity, limit: Infinity };
  const count = Number(todayCount || 0);
  const remaining = Math.max(0, limits.scansPerDay - count);
  return {
    allowed: count < limits.scansPerDay,
    remaining,
    limit: limits.scansPerDay,
  };
}

export function resolveReferralTier(referralCount = 0) {
  const count = Number(referralCount || 0);
  let tier = null;
  for (const t of REFERRAL_TIERS) {
    if (count >= t.referrals) tier = t;
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
