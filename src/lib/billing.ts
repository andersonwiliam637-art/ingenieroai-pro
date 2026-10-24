export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'incomplete';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'canceled';

export function canUsePaidFeatures(status: SubscriptionStatus | null | undefined) {
  return status === 'trialing' || status === 'active';
}

export function normalizeMinorAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid amount');
  return Math.round(amount * 100);
}
