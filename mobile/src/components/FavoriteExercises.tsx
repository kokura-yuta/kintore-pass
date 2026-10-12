import { useAuth } from '@clerk/expo';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/FeedbackPressable';
import * as SecureStore from 'expo-secure-store';
import { exerciseCatalog, type ExerciseCategory, type ExerciseOption } from '@/lib/exerciseCatalog';

const parts: ExerciseCategory[] = ['胸', '背中', '腕', '肩', '脚', '腹筋'];

const FavoritesContext = createContext<{ ids: string[]; ready: boolean; busy: boolean; error: string; toggle: (id: string) => Promise<void> } | null>(null);
export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('FavoritesProvider is required');
  return value;
}
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  // Remount on identity changes so one account never renders another's favorites.
  return <FavoriteStore key={userId ?? 'guest'} userId={userId ?? null}>{children}</FavoriteStore>;
}

function FavoriteStore({ userId, children }: {
  userId: string | null; children: ReactNode;
}) {
  const storageKey = userId ? `favorite-exercises-v1-${userId}` : null;
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
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

  return <FavoritesContext.Provider value={{ ids, ready, busy, error, toggle }}>{children}</FavoritesContext.Provider>;
}

export function FavoriteExercises({ addedIds, onAdd, disabled = false }: { addedIds: string[]; onAdd: (exercise: ExerciseOption) => void; disabled?: boolean }) {
  const { ids, ready, busy, error } = useFavorites();
  const [part, setPart] = useState<ExerciseCategory | null>(null);
  function selectPart(category: ExerciseCategory) {
    setPart(category);
  }
  const favorites = exerciseCatalog.filter(item => item.category === part && ids.includes(item.id));
  return <View style={styles.card}>
    <Text style={styles.title}>部位別お気に入り種目</Text>
    <Text style={styles.note}>部位を選ぶと、種目検索の☆で登録したお気に入りを表示します。</Text>
    <View style={styles.parts}>{parts.map(item => <Pressable key={item} accessibilityRole="button"
      disabled={!ready || busy} accessibilityState={{ selected: part === item, disabled: !ready || busy }} onPress={() => selectPart(item)}
      style={[styles.chip, part === item && styles.selected]}>
      <Text style={styles.text}>{item}</Text>
    </Pressable>)}</View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!ready && !error ? <Text style={styles.note}>お気に入りを確認中…</Text> : null}
    {part && ready ? <View>
      {favorites.map(exercise => {
        const added = addedIds.includes(exercise.id);
        return <View key={exercise.id} style={styles.row}>
          <View style={styles.exercise}>
            <Text style={styles.text}>{exercise.name}</Text>
            <Text style={styles.note}>{exercise.category} · {exercise.equipment}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}を記録に追加`}
            accessibilityState={{ disabled: added || disabled }} disabled={added || disabled}
            onPress={() => onAdd(exercise)} style={styles.action}>
            <Text style={[styles.blue, (added || disabled) && styles.muted]}>{added ? '追加済み' : '＋ 追加'}</Text>
          </Pressable>
        </View>;
      })}
      {favorites.length === 0 ? <Text style={styles.note}>この部位のお気に入りはまだありません。種目検索の☆から登録できます。</Text> : null}
    </View> : ready ? <Text style={styles.note}>部位を選んでお気に入りを表示</Text> : null}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: '#203441' },
  exercise: { flexGrow: 1, flexBasis: 150, paddingVertical: 13 },
  action: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  blue: { color: '#73E7FF', fontSize: 13 },
  muted: { color: '#99AAB4' },
  star: { color: '#73E7FF', fontSize: 26 },
  error: { color: '#FF9595', marginTop: 10 },
});
