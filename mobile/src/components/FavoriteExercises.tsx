import { useAuth } from '@clerk/expo';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { exerciseCatalog, type ExerciseCategory, type ExerciseOption } from '@/lib/exerciseCatalog';

const parts: ExerciseCategory[] = ['胸', '背中', '腕', '肩', '脚', '腹筋'];

export function FavoriteExercises(props: { addedIds: string[]; onAdd: (exercise: ExerciseOption) => void }) {
  const { userId } = useAuth();
  // Remount on identity changes so one account never renders another's favorites.
  return <FavoriteList key={userId ?? 'guest'} {...props} userId={userId ?? null} />;
}

function FavoriteList({ userId, addedIds, onAdd }: {
  userId: string | null; addedIds: string[]; onAdd: (exercise: ExerciseOption) => void;
}) {
  const storageKey = userId ? `favorite-exercises-v1-${userId}` : null;
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [part, setPart] = useState<ExerciseCategory | null>(null);
  const [editing, setEditing] = useState(false);

  function selectPart(category: ExerciseCategory) {
    if (!ready || busy) return;
    const selectedFavorites = exerciseCatalog.filter(item => item.category === category && ids.includes(item.id));
    // The parent uses a functional update and ignores duplicates, preserving entered sets.
    selectedFavorites.forEach(item => onAdd(item));
    setPart(category);
    setEditing(selectedFavorites.length === 0);
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = storageKey ? Platform.OS === 'web'
          ? localStorage.getItem(storageKey) : await SecureStore.getItemAsync(storageKey) : null;
        const value: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(value)) throw new Error('Invalid favorites');
        if (active) setIds(exerciseCatalog.filter(item => value.includes(item.id)).map(item => item.id));
      } catch {
        if (active) setError('お気に入りを読み込めませんでした。画面を開き直してください。');
        return;
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [storageKey]);

  async function toggle(id: string) {
    if (!ready || lock.current) return;
    lock.current = true;
    setBusy(true);
    const next = ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
    try {
      if (storageKey) {
        if (Platform.OS === 'web') localStorage.setItem(storageKey, JSON.stringify(next));
        else await SecureStore.setItemAsync(storageKey, JSON.stringify(next));
      }
      setIds(next);
      setError('');
    } catch { setError('保存できませんでした。もう一度お試しください。'); }
    finally { lock.current = false; setBusy(false); }
  }

  const favorites = exerciseCatalog.filter(item => item.category === part && ids.includes(item.id));
  const selecting = editing || favorites.length === 0;
  const list = selecting ? exerciseCatalog.filter(item => item.category === part) : favorites;
  return <View style={styles.card}>
    <Text style={styles.title}>部位別お気に入り種目</Text>
    <Text style={styles.note}>部位を押すと、お気に入り種目をまとめて記録欄に追加</Text>
    <View style={styles.parts}>{parts.map(item => <Pressable key={item} accessibilityRole="button"
      disabled={!ready || busy} accessibilityState={{ selected: part === item, disabled: !ready || busy }} onPress={() => selectPart(item)}
      style={[styles.chip, part === item && styles.selected]}>
      <Text style={styles.text}>{item === '脚' ? '足' : item}</Text>
    </Pressable>)}</View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {part && ready ? <View>
      <View style={styles.heading}><Text style={styles.text}>{part}のお気に入り</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => editing ? selectPart(part) : setEditing(true)} style={styles.action}>
          <Text style={styles.blue}>{editing ? '完了' : '追加・編集'}</Text>
        </Pressable></View>
      {favorites.length === 0 ? <Text style={styles.note}>まだ登録されていません。☆を押して追加してください。</Text> : null}
      {!selecting ? <Text style={styles.note}>下の記録欄で重量・回数を入力できます。</Text> : null}
      {selecting && list.map(item => <View key={item.id} style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}を記録に追加`}
          disabled={addedIds.includes(item.id)} onPress={() => onAdd(item)} style={styles.exercise}>
          <Text style={styles.text}>{item.name}</Text>
          <Text style={styles.note}>{addedIds.includes(item.id) ? '記録に追加済み' : '＋ 記録に追加'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}のお気に入りを${ids.includes(item.id) ? '解除' : '登録'}`}
          accessibilityState={{ selected: ids.includes(item.id), disabled: busy }} disabled={busy}
          onPress={() => { setEditing(true); void toggle(item.id); }} style={styles.action}>
          <Text style={styles.star}>{ids.includes(item.id) ? '★' : '☆'}</Text>
        </Pressable>
      </View>)}
      <Text style={styles.note}>{userId ? 'お気に入りはこの端末に保存されます。' : 'ログイン前のお気に入りは一時的な設定です。'}</Text>
    </View> : part && !error ? <Text style={styles.note}>お気に入りを確認中…</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, padding: 16, borderRadius: 17, backgroundColor: '#0C151D', borderWidth: 1, borderColor: '#203441' },
  title: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  note: { color: '#99AAB4', fontSize: 12, lineHeight: 19, marginTop: 5 },
  parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { minWidth: 64, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#294653' },
  selected: { backgroundColor: '#123D50', borderColor: '#00D4FF' },
  text: { color: '#F4F6F3', fontSize: 14, fontWeight: '600' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#203441' },
  exercise: { flex: 1, paddingVertical: 13 },
  action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  blue: { color: '#73E7FF', fontSize: 13 },
  star: { color: '#73E7FF', fontSize: 26 },
  error: { color: '#FF9595', marginTop: 10 },
});
