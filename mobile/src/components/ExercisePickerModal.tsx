import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exerciseCatalog, exerciseCategories, type ExerciseOption } from '@/lib/exerciseCatalog';
import { useFavorites } from '@/components/FavoriteExercises';

type Props = {
  addedIds: string[];
  onAdd: (exercise: ExerciseOption) => void;
  onClose: () => void;
  visible: boolean;
};

export function ExercisePickerModal({ addedIds, onAdd, onClose, visible }: Props) {
  const { ids, ready, busy, error, toggle } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof exerciseCategories)[number]>('すべて');
  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return exerciseCatalog.filter((exercise) => {
      const matchesCategory = category === 'すべて' || exercise.category === category;
      const matchesQuery = !normalizedQuery || `${exercise.name}${exercise.equipment}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>EXERCISE LIST</Text>
              <Text style={styles.title}>種目を追加</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>

          <TextInput
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="種目名・器具で検索"
            placeholderTextColor="#657681"
            style={styles.searchInput}
            value={query}
          />

          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {exerciseCategories.map((item) => (
                <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.selectedChip]}>
                  <Text style={[styles.categoryText, category === item && styles.selectedChipText]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.hint}>☆でお気に入り登録・解除 ／ ＋で今回の記録に追加</Text>
          <Text style={styles.hint}>お気に入りはアカウント別にこの端末へ保存されます。</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {filteredExercises.map((exercise) => {
              const added = addedIds.includes(exercise.id);
              return (
                <View
                  key={exercise.id}
                  style={styles.exerciseRow}
                >
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>{exercise.category} · {exercise.equipment}</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}のお気に入りを${ids.includes(exercise.id) ? '解除' : '登録'}`}
                      accessibilityState={{ selected: ids.includes(exercise.id), disabled: !ready || busy }} disabled={!ready || busy}
                      onPress={() => void toggle(exercise.id)} style={styles.action}>
                      <Text style={[styles.addText, (!ready || busy) && styles.addedText]}>{ids.includes(exercise.id) ? '★' : '☆'} お気に入り</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}を記録に追加`} accessibilityState={{ disabled: added }}
                      disabled={added} onPress={() => onAdd(exercise)} style={styles.action}>
                      <Text style={[styles.addText, added && styles.addedText]}>{added ? '追加済み' : '＋ 追加'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {filteredExercises.length === 0 ? <Text style={styles.emptyText}>該当する種目がありません。</Text> : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: { color: '#99AAB4', fontSize: 12, marginHorizontal: 20, marginBottom: 6 },
  error: { color: '#FF9595', marginHorizontal: 20, marginBottom: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  action: { minHeight: 44, minWidth: 58, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  eyebrow: { color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 4, color: '#F4F6F3', fontSize: 25, fontWeight: '700' },
  closeButton: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#294653', borderRadius: 20 },
  closeText: { color: '#73E7FF', fontSize: 12, fontWeight: '600' },
  searchInput: { minHeight: 51, marginHorizontal: 20, marginTop: 19, paddingHorizontal: 15, borderWidth: 1, borderColor: '#294653', borderRadius: 14, backgroundColor: '#0C151D', color: '#F4F6F3', fontSize: 14 },
  categoryRow: { gap: 8, paddingHorizontal: 20, paddingVertical: 15 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: '#294653', borderRadius: 20 },
  selectedChip: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  categoryText: { color: '#99AAB4', fontSize: 11, fontWeight: '600' },
  selectedChipText: { color: '#050A0F' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  exerciseRow: { minHeight: 67, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#142833' },
  addedRow: { opacity: 0.45 },
  exerciseCopy: { flexGrow: 1, flexBasis: 130, paddingRight: 12 },
  exerciseName: { color: '#F4F6F3', fontSize: 13, fontWeight: '700' },
  exerciseMeta: { marginTop: 4, color: '#72828D', fontSize: 10 },
  addText: { color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  addedText: { color: '#72828D' },
  emptyText: { paddingVertical: 40, color: '#72828D', fontSize: 13, textAlign: 'center' },
});
