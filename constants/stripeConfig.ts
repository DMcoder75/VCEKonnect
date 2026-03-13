// =====================================================
// Stripe Product & Price Configuration for FairPrep
// Mapping between Stripe IDs and app tiers
// =====================================================

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface TierConfig {
  price_id: string;
  product_id: string;
  name: string;
  price_aud: number;
  price_display: string;
  duration_months: number;
  price_per_month: string;
}

// Stripe product and price IDs
export const STRIPE_TIERS: Record<Exclude<SubscriptionTier, 'free'>, TierConfig> = {
  basic: {
    price_id: "price_1TAMI7RIGJDaSBb0z7l9PZf7",
    product_id: "prod_U8dZKZHVfIDwFN",
    name: "FairPrep Basic",
    price_aud: 20,
    price_display: "$20 AUD",
    duration_months: 6,
    price_per_month: "$3.33/month",
  },
  pro: {
    price_id: "price_1TAMIdRIGJDaSBb0ElTZ0U0z",
    product_id: "prod_U8dZoHgUDzuaoW",
    name: "FairPrep Pro",
    price_aud: 40,
    price_display: "$40 AUD",
    duration_months: 6,
    price_per_month: "$6.67/month",
  },
};

// Helper to get tier from product ID
export function getTierFromProductId(productId: string): SubscriptionTier {
  if (productId === STRIPE_TIERS.basic.product_id) return 'basic';
  if (productId === STRIPE_TIERS.pro.product_id) return 'pro';
  return 'free';
}

// Helper to get config for a tier
export function getTierConfig(tier: Exclude<SubscriptionTier, 'free'>): TierConfig {
  return STRIPE_TIERS[tier];
}
