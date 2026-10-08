import type { SubscriptionStatus } from './subscription';

type Plan = Pick<SubscriptionStatus, 'accessLevel' | 'canUseAiFeatures' | 'status' | 'expiresAt' | 'trial'>;

export function canAccessPaidScreen(plan: Plan | null, now = Date.now()) {
  if (!plan?.canUseAiFeatures || plan.accessLevel === 'free') return false;
  if (plan.status === 'operator') return plan.accessLevel === 'premium';
  const expiry = plan.accessLevel === 'trial' ? plan.trial.endsAt : plan.expiresAt;
  return expiry !== null && Date.parse(expiry) > now;
}

export function planLabel(plan: Plan | null, now = Date.now()) {
  if (!plan) return 'プラン確認中…';
  if (!canAccessPaidScreen(plan, now)) return 'Free（無料）';
  if (plan.status === 'operator') return '運営用Premium（無料）';
  if (plan.accessLevel === 'trial') return '7日間無料体験中';
  return 'Premium';
}

export function canNavigateTab(active: boolean, lastPress: number, now: number) {
  return !active && now - lastPress >= 600;
}
