import type { BodyAnalysisHistoryItem } from './bodyAnalyses';
import type { SubscriptionStatus } from './subscription';

export function averageBodyScore100(analysis: BodyAnalysisHistoryItem | null) {
  const scores = analysis?.areas.map(area => area.score).filter((score): score is number =>
    score !== null && Number.isFinite(score) && score >= 0 && score <= 10) ?? [];
  return scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length * 10).toFixed(1)) : null;
}

// Successful analyses and the subscription's applicable period match the existing
// body-analysis limit rules. This is display-only; the server still enforces limits.
export function remainingBodyAnalyses(plan: SubscriptionStatus | null, history: BodyAnalysisHistoryItem[] | null, now = new Date()): number | null {
  if (!plan) return null;
  if (!plan.canUseAiFeatures || plan.accessLevel === 'free') return 0;
  const expiry = plan.accessLevel === 'trial' ? plan.trial.endsAt : plan.expiresAt;
  if (plan.status !== 'operator' && (!expiry || !Number.isFinite(Date.parse(expiry)))) return null;
  if (plan.status !== 'operator' && Date.parse(expiry!) <= now.getTime()) return 0;
  if (!history) return null;
  const trial = plan.accessLevel === 'trial';
  const japanOffset = 9 * 60 * 60 * 1000;
  const japanNow = new Date(now.getTime() + japanOffset);
  const start = trial ? Date.parse(plan.trial.startedAt ?? '') : Date.UTC(japanNow.getUTCFullYear(), japanNow.getUTCMonth(), 1) - japanOffset;
  const end = trial ? Date.parse(plan.trial.endsAt ?? '') : Date.UTC(japanNow.getUTCFullYear(), japanNow.getUTCMonth() + 1, 1) - japanOffset;
  const limit = plan.features.bodyAnalysis.currentLimit;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || !Number.isInteger(limit) || limit < 0) return null;
  const dates = history.map(item => Date.parse(item.analyzedAt ?? ''));
  if (dates.some(date => !Number.isFinite(date))) return null;
  const used = dates.filter(date => date >= start && date < end).length;
  // GET returns at most 50 newest results: a truncated period cannot overstate availability.
  if (history.length >= 50 && dates.every(date => date >= start) && used < limit) return null;
  return Math.max(0, limit - used);
}
