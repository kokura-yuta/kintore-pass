// 日本時間の暦日で集計。時刻・夏時間・端末のタイムゾーンに依存しない。
const DAY = 86_400_000;
export const japanDay = (value: Date | string) => Math.floor((new Date(value).getTime() + 9 * 3_600_000) / DAY);
export const dateLabel = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const monday = (day: number) => day - ((day + 3) % 7 + 7) % 7;
export type RetentionInput = {
  id: string; displayName: string | null; createdAt: string; weeklyGoal: number | null;
  trainingDays: string[]; totalTrainingDays: number; lastTrainingDate: string | null;
  activityDays: string[]; measurementStartedOn: string | null;
  goalHistory?: { effectiveOn: string; weeklyGoal: number | null; estimated: boolean }[];
};
export type Rules = { ongoingPercent: number; declinePoints: number; inactiveDays: number; minimumDays: number };
export const defaultRules: Rules = { ongoingPercent: 80, declinePoints: 20, inactiveDays: 14, minimumDays: 7 };
export function analyzeRetention(inputs: RetentionInput[], now = new Date(), rules = defaultRules) {
  const today = japanDay(now);
  const rows = inputs.map((user) => {
    const registered = japanDay(user.createdAt);
    const days = new Set(user.trainingDays.map((date) => japanDay(`${date}T00:00:00+09:00`)).filter((d) => d >= registered && d <= today));
    const goal = user.weeklyGoal !== null && user.weeklyGoal >= 1 && user.weeklyGoal <= 7 ? user.weeklyGoal : null;
    const measure = createTrainingPeriod(user, today);
    const period = (start: number, end: number) => {
      const first = Math.max(start, registered);
      const observedDays = Math.max(0, end - first + 1);
      const actual = [...days].filter((d) => d >= first && d <= end).length;
      const target = measure(start, end).target;
      return { start: dateLabel(start), end: dateLabel(end), observedDays, partial: observedDays < 7 || first > start, actual, target, percent: target === null ? null : actual / target * 100 };
    };
    const seven = period(today - 6, today);
    const twentyEight = period(today - 27, today);
    const ageDays = Math.max(0, today - registered + 1);
    const lastDay = user.lastTrainingDate ? japanDay(`${user.lastTrainingDate}T00:00:00+09:00`) : null;
    const inactive = ageDays >= rules.inactiveDays && (lastDay === null || lastDay < today - rules.inactiveDays + 1);
    const status = inactive ? '活動なし'
      : goal === null || seven.percent === null || twentyEight.percent === null || ageDays < rules.minimumDays ? '判定保留'
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
    appRetention: [7, 14, 30, 60, 90].map((day) => appRetention(inputs, day)),
    weeklyMeans: Array.from({ length: 8 }, (_, i) => ({ start: rows[0]?.weeks[i].start ?? dateLabel(monday(today) - (7 - i) * 7), ...mean(rows.map((u) => u.weeks[i].percent)) })),
    cohorts: Array.from({ length: 8 }, (_, i) => {
      const start = monday(today) - (7 - i) * 7;
      const cohort = inputs.filter((u) => monday(japanDay(u.createdAt)) === start);
      return { start: dateLabel(start), registered: cohort.length, ...appRetention(cohort, 7) };
    }), rows };
}
export type RetentionData = ReturnType<typeof analyzeRetention>;

export type LongOptions = { range: '1m' | '3m' | '6m' | '1y' | 'all'; unit: 'day' | 'week' | 'month'; cohortUnit: 'week' | 'month'; userId?: string };
export const defaultLongOptions: LongOptions = { range: '1y', unit: 'month', cohortUnit: 'month' };
const dayNumber = (date: string) => japanDay(`${date}T00:00:00+09:00`);
const validGoal = (goal: number | null) => goal !== null && goal >= 1 && goal <= 7 ? goal : null;
function createTrainingPeriod(user: RetentionInput, today: number) {
  const registered = japanDay(user.createdAt);
  const days = [...new Set(user.trainingDays.map(dayNumber))].sort((a,b)=>a-b);
  const history = [...(user.goalHistory ?? [])].map(row=>({...row, day:dayNumber(row.effectiveOn)})).sort((a,b)=>a.day-b.day);
  const lowerBound = (day:number) => { let lo=0,hi=days.length;while(lo<hi){const mid=(lo+hi)>>>1;if(days[mid]<day)lo=mid+1;else hi=mid;}return lo; };
  return (start:number,end:number) => {
    const first=Math.max(start,registered),last=Math.min(end,today);
    const observedDays=Math.max(0,last-first+1);
    const actual=observedDays ? lowerBound(last+1)-lowerBound(first) : 0;
    const changes=[first,...history.filter(row=>row.day>first&&row.day<=last).map(row=>row.day),last+1];
    let target=0,unknownDays=0,estimatedDays=0;
    for(let i=0; i<changes.length-1 && observedDays; i++) {
      const n=changes[i+1]-changes[i];const entry=history.filter(row=>row.day<=changes[i]).at(-1);
      const goal=validGoal(entry?entry.weeklyGoal:history.length?null:user.weeklyGoal);
      if(goal===null)unknownDays+=n;else target+=goal*n/7;
      if(!history.length||entry?.estimated)estimatedDays+=n;
    }
    if (Math.abs(target - Math.round(target)) < 1e-10) target = Math.round(target);
    const known=observedDays>0&&unknownDays===0&&target>0;
    return { start:dateLabel(start),end:dateLabel(last),observedDays,partial:first>start||last<end,actual,
      target:known?target:null,percent:known?actual/target*100:null,unknownDays,estimatedDays };
  };
}
export function trainingPeriod(user: RetentionInput, start: number, end: number, today: number) {
  return createTrainingPeriod(user,today)(start,end);
}
const meanValues = (values: (number | null)[]) => {
  const known = values.filter((v): v is number => v !== null);
  return { percent: known.length ? known.reduce((sum, v) => sum + v, 0) / known.length : null, users: known.length };
};
const monthStart = (day: number) => {
  const date = new Date(day * DAY);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / DAY);
};
const nextMonth = (day: number) => {
  const date = new Date(day * DAY);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY);
};
function buckets(start: number, end: number, unit: LongOptions['unit']) {
  const result: { start: number; end: number }[] = [];
  let cursor = unit === 'month' ? monthStart(start) : unit === 'week' ? monday(start) : start;
  while (cursor <= end) {
    if (result.length >= 4000) throw new RangeError('期間が長いため、週別または月別に切り替えてください。');
    const next = unit === 'month' ? nextMonth(cursor) : cursor + (unit === 'week' ? 7 : 1);
    result.push({ start: Math.max(cursor, start), end: Math.min(next - 1, end) }); cursor = next;
  }
  return result;
}
export function analyzeLongRetention(inputs: RetentionInput[], now = new Date(), options = defaultLongOptions) {
  const today = japanDay(now);
  const registered = inputs.map(u => japanDay(u.createdAt)).filter(d => d <= today);
  const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };
  const date = new Date(today * DAY);
  const monthCount = options.range === 'all' ? 0 : months[options.range];
  const shiftedMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthCount, 1));
  const lastShiftedDay = new Date(Date.UTC(shiftedMonth.getUTCFullYear(), shiftedMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const selectedStart = Math.floor(Date.UTC(shiftedMonth.getUTCFullYear(), shiftedMonth.getUTCMonth(), Math.min(date.getUTCDate(), lastShiftedDay)) / DAY) + 1;
  const start = options.range === 'all' ? Math.min(today, ...registered) : selectedStart;
  const selected = inputs.find(u => u.id === options.userId);
  const measures = new Map(inputs.map(u=>[u.id,createTrainingPeriod(u,today)]));
  const measure = (u:RetentionInput,a:number,b:number) => measures.get(u.id)!(a,b);
  const periods = buckets(start, today, options.unit);
  const average = (a: number, b: number) => meanValues(inputs.map(u => measure(u,a,b).percent));
  const points = periods.map(period => {
    const own = selected ? measure(selected,period.start,period.end) : null;
    const values=inputs.map(u=>measure(u,period.start,period.end));
    const m = meanValues(values.map(v=>v.percent));
    return { start: dateLabel(period.start), end: dateLabel(period.end), ...m,
      individual: own?.percent ?? null, individualActual: own?.actual ?? null, individualTarget: own?.target ?? null,
      difference: own?.percent != null && m.percent != null ? own.percent - m.percent : null,
      partial: own?.partial ?? false, estimatedUsers: values.filter(p=>p.percent!==null&&p.estimatedDays>0).length };
  });
  const appMetric = (cohort: RetentionInput[], day: number) => {
    const eligible = cohort.filter(u => japanDay(u.createdAt) + day < today);
    const measured = eligible.filter(u => u.measurementStartedOn && dayNumber(u.measurementStartedOn) <= japanDay(u.createdAt) + day);
    const retained = measured.filter(u => u.activityDays.includes(dateLabel(japanDay(u.createdAt) + day))).length;
    return { day, eligible: eligible.length, retained, unmeasured: eligible.length - measured.length,
      percent: eligible.length && eligible.length === measured.length ? retained / eligible.length * 100 : null };
  };
  const cohorts = buckets(start, today, options.cohortUnit).map(period => {
    const cohort = inputs.filter(u => japanDay(u.createdAt) >= period.start && japanDay(u.createdAt) <= period.end);
    return { start: dateLabel(period.start), registered: cohort.length, metrics: [7, 14, 30, 60, 90].map(day => appMetric(cohort, day)) };
  });
  const currentMonth = monthStart(today); const previousStart = monthStart(currentMonth - 1);
  const current = average(currentMonth, today); const previous = average(previousStart, currentMonth - 1);
  const aggregate = average(start, today); const ownAggregate = selected ? measure(selected,start,today) : null;
  return { options, start: dateLabel(start), end: dateLabel(today), points, cohorts, average: aggregate,
    individual: ownAggregate, selectedUserId: selected?.id ?? null,
    monthComparison: { current, previous, difference: current.percent !== null && previous.percent !== null ? current.percent - previous.percent : null,
      note: '今月は当日まで、前月は全月。期間内目標を日数按分した達成率を比較。' },
    goalBasis: '変更履歴がある日は当時の目標を使用。同日の変更は最終値。履歴導入前は導入時の現在目標を遡及した推定値（estimatedUsers）です。目標不明の日を含む期間は集計対象外。' };
}
export type LongRetentionData = ReturnType<typeof analyzeLongRetention>;
