import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '@/lib/api';
import { jstDay, monthCells, shiftMonth } from '@/lib/friend-calendar';

type Profile = { id: string; name: string; shared: boolean; records: { performedAt: string; exercises: { name: string; bodyPart: string; sets: { setNumber: number; weightKg: number | null; reps: number | null }[] }[] }[] };
export default function FriendCalendarScreen() {
  const router = useRouter();
  const { userId: target } = useLocalSearchParams<{ userId: string }>();
  const { getToken, userId, isLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  const today = jstDay(new Date().toISOString());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [data, setData] = useState<{ key: string; profile: Profile } | null>(null);
  const [failure, setFailure] = useState<{key:string;message:string}|null>(null);
  const [revision, setRevision] = useState(0);
  const key = `${userId}:${target}:${month}:${revision}`;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setData(null);
      if (state === 'active') setRevision(v => v + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    if (!isLoaded) return;
    (async () => {
      if (!target || !/^[0-9a-f-]{36}$/i.test(target)) throw new Error('友達を選び直してください。');
      const token = await tokenRef.current();
      if (!token) throw new Error('ログインしてください。');
      const result = await apiRequest<{ profile: Profile }>(`/api/friends?userId=${encodeURIComponent(target)}&month=${month}`, { token, method: 'GET' });
      if (active) setData({ key, profile: result.profile });
    })().catch(e => { if (active) setFailure({key,message:e instanceof Error ? e.message : '読み込めませんでした。'}); });
    return () => { active = false; };
  }, [key, target, month, isLoaded]);
  const profile = data?.key === key ? data.profile : null;
  const error = failure?.key === key ? failure.message : '';
  const records = profile?.shared ? profile.records : [];
  const dates = new Set(records.map(r => jstDay(r.performedAt)));
  const daily = records.filter(r => jstDay(r.performedAt) === selected);
  function move(offset: number) {
    const next = shiftMonth(month, offset);
    setMonth(next); setSelected(`${next}-01`);
  }
  return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={s.link}>‹ 友達一覧へ</Text></Pressable>
    <Text style={s.eyebrow}>FRIEND’S TRAINING</Text><Text style={s.title}>{profile?.name ?? '友達'} のカレンダー</Text>
    <Text style={s.muted}>共有を許可した友達の筋トレ記録だけ表示します。</Text>
    <View style={s.card}><View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="前の月" disabled={month === '1900-01'} onPress={() => move(-1)} style={s.arrow}><Text style={s.link}>‹</Text></Pressable>
      <Text style={s.heading}>{Number(month.slice(0, 4))}年 {Number(month.slice(5))}月</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="次の月" disabled={month >= today.slice(0, 7)} onPress={() => move(1)} style={s.arrow}><Text style={[s.link, month >= today.slice(0, 7) && s.disabled]}>›</Text></Pressable>
    </View>
    <View style={s.grid}>{['日','月','火','水','木','金','土'].map(day => <View key={day} style={s.cell}><Text style={s.muted}>{day}</Text></View>)}</View>
    <View style={s.grid}>{monthCells(month).map((day, i) => day ? <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${day}${dates.has(day) ? ' 筋トレ記録あり' : ''}`} accessibilityState={{ selected: day === selected }} onPress={() => setSelected(day)} style={s.cell}><View style={[s.day, day === selected && s.selected]}><Text style={[s.dayText, day === selected && s.selectedText]}>{Number(day.slice(8))}</Text></View><View style={[s.dot, dates.has(day) && s.activeDot]}/></Pressable> : <View key={`blank-${i}`} style={s.cell}/>)}</View>
    <Text style={s.muted}>● 筋トレ実施日 · 日本時間</Text></View>
    {!profile && !error && <ActivityIndicator color="#73E7FF"/>}
    {!!error && <View style={s.card}><Text style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision(v => v + 1)}><Text style={s.link}>もう一度試す</Text></Pressable></View>}
    {profile && !profile.shared && <Text style={s.muted}>相手は記録を公開していません。</Text>}
    {profile?.shared && <><Text style={s.heading}>{selected.replaceAll('-', '.')} のトレーニング</Text><Text style={s.muted}>表示月の実施日数：{dates.size}日 · 選択日の記録：{daily.length}件</Text>
    {!daily.length && <View style={s.card}><Text style={s.muted}>この日の共有された筋トレ記録はありません。</Text></View>}
    {daily.map((record, i) => <View key={`${record.performedAt}-${i}`} style={s.card}><Text style={s.heading}>{[...new Set(record.exercises.map(e => e.bodyPart).filter(Boolean))].join('／') || '部位未設定'} · {record.exercises.length}種目</Text>{record.exercises.map((exercise, j) => <View key={j} style={s.exercise}><Text style={s.heading}>{exercise.name}</Text>{!exercise.sets.length && <Text style={s.muted}>セット未記録</Text>}{exercise.sets.map(set => <Text key={set.setNumber} style={s.muted}>{set.setNumber}セット目　{set.weightKg === null ? '重量未記録' : `${set.weightKg}kg`} × {set.reps === null ? '回数未記録' : `${set.reps}回`}</Text>)}</View>)}</View>)}</>}
    <Pressable accessibilityRole="button" onPress={() => { setData(null); setRevision(v => v + 1); }}><Text style={s.link}>最新情報に更新</Text></Pressable>
    <Text style={s.muted}>写真・体重・体脂肪率・会話・記録メモは共有しません。通報・ブロック・友達解除は友達一覧で操作できます。</Text>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' }, content: { padding: 20, paddingBottom: 100, gap: 16 },
  title: { color: '#F4F6F3', fontSize: 26, fontWeight: '800' }, heading: { color: '#F4F6F3', fontSize: 17, fontWeight: '700' }, eyebrow: { color: '#73E7FF', fontSize: 12, letterSpacing: 2 },
  link: { color: '#73E7FF', fontSize: 17, paddingVertical: 10 }, muted: { color: '#939DA5', fontSize: 13, lineHeight: 22 }, error: { color: '#ff8e83' },
  card: { backgroundColor: '#0C151D', borderColor: '#24323C', borderWidth: 1, borderRadius: 24, padding: 16, gap: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, dayText: { color: '#F4F6F3', fontSize: 15 }, selected: { backgroundColor: '#00C7EB' }, selectedText: { color: '#050A0F', fontWeight: '700' }, dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 }, activeDot: { backgroundColor: '#00C7EB' }, disabled: { opacity: 0.3 }, exercise: { gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#24323C' },
});
