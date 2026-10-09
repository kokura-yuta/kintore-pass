// 日本時間の暦日で集計。時刻・夏時間・端末のタイムゾーンに依存しない。
const DAY = 86_400_000;
export const japanDay = (value: Date | string) => Math.floor((new Date(value).getTime() + 9 * 3_600_000) / DAY);
export const dateLabel = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const monday = (day: number) => day - ((day + 3) % 7 + 7) % 7;
export type RetentionInput = {
  id: string; displayName: string | null; createdAt: string; weeklyGoal: number | null;
  trainingDays: string[]; totalTrainingDays: number; lastTrainingDate: string | null;
  activityDays: string[]; measurementStartedOn: string | null;
};
export type Rules = { ongoingPercent: number; declinePoints: number; inactiveDays: number; minimumDays: number };
export const defaultRules: Rules = { ongoingPercent: 80, declinePoints: 20, inactiveDays: 14, minimumDays: 7 };
export function analyzeRetention(inputs: RetentionInput[], now = new Date(), rules = defaultRules) {
  const today = japanDay(now);
  const rows = inputs.map((user) => {
    const registered = japanDay(user.createdAt);
    const days = new Set(user.trainingDays.map((date) => japanDay(`${date}T00:00:00+09:00`)).filter((d) => d >= registered && d <= today));
    const goal = user.weeklyGoal !== null && user.weeklyGoal >= 1 && user.weeklyGoal <= 7 ? user.weeklyGoal : null;
    const period = (start: number, end: number) => {
      const first = Math.max(start, registered);
      const observedDays = Math.max(0, end - first + 1);
      const actual = [...days].filter((d) => d >= first && d <= end).length;
      const target = goal === null || observedDays === 0 ? null : goal * observedDays / 7;
      return { start: dateLabel(start), end: dateLabel(end), observedDays, partial: observedDays < 7 || first > start, actual, target, percent: target === null ? null : actual / target * 100 };
    };
    const seven = period(today - 6, today);
    const twentyEight = period(today - 27, today);
    const ageDays = Math.max(0, today - registered + 1);
    const lastDay = user.lastTrainingDate ? japanDay(`${user.lastTrainingDate}T00:00:00+09:00`) : null;
    const inactive = ageDays >= rules.inactiveDays && (lastDay === null || lastDay < today - rules.inactiveDays + 1);
    const status = goal === null || ageDays < rules.minimumDays ? '判定保留'
      : inactive ? '活動なし'
      : seven.percent! >= rules.ongoingPercent ? '継続中'
      : twentyEight.percent! - seven.percent! >= rules.declinePoints ? '頻度低下' : '目標未達';
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const start = monday(today) - (7 - index) * 7;
      return period(start, Math.min(start + 6, today));
    });
    return { id: user.id, displayName: user.displayName, registeredOn: dateLabel(registered), ageDays, weeklyGoal: goal,
      totalTrainingDays: user.totalTrainingDays, lastTrainingDate: user.lastTrainingDate, seven, twentyEight, weeks, status, inactive };
  });
  const mean = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null);
    return { percent: valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null, users: valid.length };
  };
  // 最終日が終わるまで非継続と断定しない。計測前の対象日は分母には残し、率を非表示にする。
  const appRetention = (cohort: RetentionInput[], offset: number) => {
    const eligible = cohort.filter((u) => japanDay(u.createdAt) + offset < today);
    const measurable = eligible.filter((u) => u.measurementStartedOn && japanDay(`${u.measurementStartedOn}T00:00:00+09:00`) <= japanDay(u.createdAt) + offset);
    const retained = measurable.filter((u) => u.activityDays.includes(dateLabel(japanDay(u.createdAt) + offset))).length;
    return { day: offset, eligible: eligible.length, measured: measurable.length, unmeasured: eligible.length - measurable.length, retained,
      percent: eligible.length > 0 && measurable.length === eligible.length ? retained / eligible.length * 100 : null };
  };
  return { generatedAt: now.toISOString(), rules, goalBasis: '目標変更履歴がないため、現在の週目標を過去にも適用しています。部分期間は登録日以降の日数で按分（当日を含む）します。',
    activityBasis: '認証済みアプリの起動・前面表示を日本時間で1日1件計測。登録日＋指定日の利用を判定します。対象日が終了したユーザーだけを分母に含め、未計測者がいる率は表示しません。',
    summary: { totalUsers: rows.length, activeSeven: rows.filter((u) => u.seven.actual > 0).length, activeTwentyEight: rows.filter((u) => u.twentyEight.actual > 0).length,
      meanSeven: mean(rows.map((u) => u.seven.percent)), meanTwentyEight: mean(rows.map((u) => u.twentyEight.percent)), declining: rows.filter((u) => u.status === '頻度低下').length,
      inactive: rows.filter((u) => u.inactive).length },
    appRetention: [7, 14, 30].map((day) => appRetention(inputs, day)),
    weeklyMeans: Array.from({ length: 8 }, (_, i) => ({ start: rows[0]?.weeks[i].start ?? dateLabel(monday(today) - (7 - i) * 7), ...mean(rows.map((u) => u.weeks[i].percent)) })),
    cohorts: Array.from({ length: 8 }, (_, i) => {
      const start = monday(today) - (7 - i) * 7;
      const cohort = inputs.filter((u) => monday(japanDay(u.createdAt)) === start);
      return { start: dateLabel(start), registered: cohort.length, ...appRetention(cohort, 7) };
    }), rows };
}
export type RetentionData = ReturnType<typeof analyzeRetention>;
