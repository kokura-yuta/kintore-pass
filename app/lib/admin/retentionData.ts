import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, userProfiles, trainingGoalHistory } from '@/db/schema';
import { analyzeRetention, analyzeLongRetention, defaultLongOptions, defaultRules, type LongOptions, type RetentionInput } from '@/shared/retention';
import { trainingRetentionQuery, activityRetentionQuery } from './retentionQueries';

function setting(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 && value <= maximum ? value : fallback;
}

export async function loadRetention(options: LongOptions = defaultLongOptions) {
  const db = getDb();
  const now = new Date();
  // DB側で種目のある保存済み記録を暦日ごとに圧縮。下書きは端末だけで、DBに保存されない。
  // 変更・削除の都度再集計するため、集計キャッシュに古い実績は残らない。
  const [accounts, training, activity, goals] = await Promise.all([
    db.select({ id: users.id, displayName: users.displayName, createdAt: users.createdAt, weeklyGoal: userProfiles.weeklyTrainingDays }).from(users).leftJoin(userProfiles, eq(users.id, userProfiles.userId)),
    db.execute(trainingRetentionQuery(now)),
    db.execute(activityRetentionQuery),
    db.select().from(trainingGoalHistory),
  ]);
  const trainingMap = new Map(training.rows.map((r) => [String(r.user_id), r]));
  const activityMap = new Map(activity.rows.map((r) => [String(r.user_id), r]));
  const goalMap = new Map<string, RetentionInput['goalHistory']>();
  for (const g of goals) {
    const history = goalMap.get(g.userId) ?? [];
    history.push({ effectiveOn: g.effectiveOn, weeklyGoal: g.weeklyGoal, estimated: g.estimated });
    goalMap.set(g.userId, history);
  }
  const inputs: RetentionInput[] = accounts.map((u) => {
    const t = trainingMap.get(u.id); const a = activityMap.get(u.id);
    return { ...u, createdAt: u.createdAt.toISOString(), trainingDays: (t?.days ?? []) as string[], totalTrainingDays: Number(t?.total ?? 0), lastTrainingDate: (t?.last ?? null) as string | null,
      activityDays: (a?.days ?? []) as string[], measurementStartedOn: (a?.started ?? null) as string | null,
      goalHistory: goalMap.get(u.id) ?? [] };
  });
  const result = analyzeRetention(inputs, now, {
    ongoingPercent: setting('RETENTION_ONGOING_PERCENT', defaultRules.ongoingPercent, 100),
    declinePoints: setting('RETENTION_DECLINE_POINTS', defaultRules.declinePoints, 100),
    inactiveDays: Math.floor(setting('RETENTION_INACTIVE_DAYS', defaultRules.inactiveDays, 365)),
    minimumDays: Math.floor(setting('RETENTION_MINIMUM_DAYS', defaultRules.minimumDays, 365)),
  });
  const longTerm = analyzeLongRetention(inputs, now, options);
  return { ...result, goalBasis: longTerm.goalBasis, longTerm };
}
