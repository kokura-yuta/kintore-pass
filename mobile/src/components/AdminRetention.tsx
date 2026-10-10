import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import type { RetentionData, LongRetentionData, LongOptions } from '../../../shared/retention';
import { LongRetention } from './LongRetention';

const pct = (v: number | null) => v === null ? '未設定・未計測' : `${v.toFixed(1)}%`;
export function AdminRetention({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  const [data, setData] = useState<(RetentionData & { longTerm: LongRetentionData }) | null>(null);
  const [options,setOptions] = useState<LongOptions>({range:'1y',unit:'month',cohortUnit:'month'});
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<'seven' | 'twentyEight' | 'last'>('seven');
  const [page, setPage] = useState(0);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await tokenRef.current();
      if (!token) throw new Error('ログインが必要です。');
      const query = new URLSearchParams({range:options.range,unit:options.unit,cohortUnit:options.cohortUnit,...(selected?{userId:selected}:{})});
      const result = await apiRequest<RetentionData & {longTerm:LongRetentionData}>(`/api/admin/retention?${query}`, { method: 'GET', token, timeoutMs: 60_000 });
      if (active) { setData(result); setError(''); }
    })().catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : '取得できませんでした。'); });
    return () => { active = false; };
  }, [revision,options,selected]);
  if (error) return <View style={styles.card}><Text style={styles.error}>{error}</Text><Pressable onPress={() => setRevision((v) => v + 1)}><Text style={styles.link}>継続状況を再取得</Text></Pressable></View>;
  if (!data) return <Text style={styles.text}>継続状況を取得中…</Text>;
  const s = data.summary;
  const user = data.rows.find((u) => u.id === selected);
  const sorted = [...data.rows].sort((a, b) => sort === 'last' ? (a.lastTrainingDate ?? '').localeCompare(b.lastTrainingDate ?? '') : (a[sort].percent ?? Infinity) - (b[sort].percent ?? Infinity));
  return <View style={styles.section}>
    <Text style={styles.title}>継続率分析</Text>
    <View style={styles.grid}>{[
      ['筋トレ達成率・7日', pct(s.meanSeven.percent), `対象${s.meanSeven.users}人`], ['筋トレ達成率・28日', pct(s.meanTwentyEight.percent), `対象${s.meanTwentyEight.users}人`],
      ['総登録', `${s.totalUsers}人`, ''], ['記録者・7日／28日', `${s.activeSeven}／${s.activeTwentyEight}人`, ''],
      ['頻度低下／活動なし', `${s.declining}／${s.inactive}人`, '記録からの推定'],
      ...data.appRetention.map((r) => [`アプリ${r.day}日後継続率`, pct(r.percent), `継続${r.retained}／対象${r.eligible}人・未計測${r.unmeasured}人`]),
    ].map(([label, value, note]) => <View key={label} style={styles.card}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text><Text style={styles.muted}>{note}</Text></View>)}</View>
    <Text style={styles.muted}>{data.goalBasis}</Text><Text style={styles.muted}>{data.activityBasis}</Text>
    {compact ? <Pressable onPress={() => router.push('/admin-retention' as Href)}><Text style={styles.link}>ユーザー別・8週間の分析を見る →</Text></Pressable> : <>
      <LongRetention data={data.longTerm} options={options} onChange={v=>{setOptions(v);setData(null);}} />
      <Pressable onPress={() => setRevision((v) => v + 1)}><Text style={styles.link}>最新データに更新</Text></Pressable>
      <Text style={styles.title}>8週間・平均筋トレ達成率</Text><Chart values={data.weeklyMeans.map((w) => ({ label: w.start, percent: w.percent, note: `対象${w.users}人` }))} />
      <Text style={styles.title}>登録週別・7日後アプリ継続率</Text><Chart values={data.cohorts.map((w) => ({ label: w.start, percent: w.percent, note: `${w.retained}/${w.eligible}人・未計測${w.unmeasured}` }))} />
      <Text style={styles.title}>並び替え</Text><View style={styles.grid}>{(['seven', 'twentyEight', 'last'] as const).map((v, i) => <Pressable key={v} onPress={() => { setSort(v); setPage(0); }}><Text style={styles.link}>{sort === v ? '● ' : ''}{['7日達成率', '28日達成率', '最終日が古い順'][i]}</Text></Pressable>)}</View>
      {sorted.slice(page * 25, (page + 1) * 25).map((u) => <Pressable key={u.id} onPress={() => setSelected(u.id)} style={styles.card}><Text style={styles.link}>{u.displayName || u.id}</Text><Text style={styles.text}>登録 {u.registeredOn}／週目標 {u.weeklyGoal ?? '未設定'}回</Text><Text style={styles.text}>7日 {u.seven.actual}回・{pct(u.seven.percent)}／28日 {pct(u.twentyEight.percent)}</Text><Text style={styles.muted}>最終 {u.lastTrainingDate || '記録なし'}／{u.status}{u.twentyEight.observedDays < 28 ? '／部分期間' : ''}</Text></Pressable>)}
      <View style={styles.grid}><Pressable disabled={!page} onPress={() => setPage((v) => v - 1)}><Text style={styles.link}>前へ</Text></Pressable><Text style={styles.text}>{page + 1}ページ</Text><Pressable disabled={(page + 1) * 25 >= sorted.length} onPress={() => setPage((v) => v + 1)}><Text style={styles.link}>次へ</Text></Pressable></View>
      {user && <View style={styles.card}><Text style={styles.title}>{user.displayName || user.id} の詳細</Text><Text style={styles.text}>登録から{user.ageDays}日／累計{user.totalTrainingDays}日／週目標{user.weeklyGoal ?? '未設定'}回</Text><Text style={styles.text}>7日 {pct(user.seven.percent)}／28日 {pct(user.twentyEight.percent)}／最終 {user.lastTrainingDate || '記録なし'}</Text><Text style={styles.muted}>目標（灰）・実績（青）／達成率</Text>{user.weeks.map((w) => <View key={w.start}><Text style={styles.text}>{w.start}：{w.actual}／{w.target?.toFixed(1) ?? '未設定'}回 · {pct(w.percent)} {w.partial ? '部分週' : ''}</Text><View style={styles.track}><View style={[styles.goal, { width: `${(w.target ?? 0) / 7 * 100}%` }]} /></View><View style={styles.track}><View style={[styles.actual, { width: `${w.actual / 7 * 100}%` }]} /></View></View>)}</View>}
    </>}
  </View>;
}
function Chart({ values }: { values: { label: string; percent: number | null; note: string }[] }) {
  return <View style={styles.card}>{values.map((w) => <View key={w.label}><Text style={styles.text}>{w.label} · {pct(w.percent)} · {w.note}</Text><View style={styles.track}><View style={[styles.actual, { width: `${Math.min(100, w.percent ?? 0)}%` }]} /></View></View>)}</View>;
}
const styles = StyleSheet.create({
  section: { gap: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { borderWidth: 1, borderColor: '#203441', borderRadius: 14, padding: 14, gap: 8, backgroundColor: '#0C151D' },
  title: { color: '#F4F6F3', fontSize: 20, fontWeight: '700' }, text: { color: '#F4F6F3', fontSize: 13 }, muted: { color: '#94AAB5', fontSize: 12 }, value: { color: '#73E7FF', fontSize: 24, fontWeight: '700' }, link: { color: '#73E7FF', paddingVertical: 8 }, error: { color: '#ff8e83' },
  track: { height: 8, backgroundColor: '#203441', borderRadius: 4, overflow: 'hidden', marginVertical: 4 }, goal: { backgroundColor: '#657681', height: 8 }, actual: { backgroundColor: '#00d4ff', height: 8 },
});
