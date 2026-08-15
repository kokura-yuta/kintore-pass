import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exerciseCatalog, exerciseCategories, type ExerciseOption } from '@/lib/exerciseCatalog';

type Props = {
  addedIds: string[];
  onAdd: (exercise: ExerciseOption) => void;
  onClose: () => void;
  visible: boolean;
};

export function ExercisePickerModal({ addedIds, onAdd, onClose, visible }: Props) {
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
            placeholderTextColor="#697169"
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

          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {filteredExercises.map((exercise) => {
              const added = addedIds.includes(exercise.id);
              return (
                <Pressable
                  disabled={added}
                  key={exercise.id}
                  onPress={() => onAdd(exercise)}
                  style={[styles.exerciseRow, added && styles.addedRow]}
                >
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>{exercise.category} · {exercise.equipment}</Text>
                  </View>
                  <Text style={[styles.addText, added && styles.addedText]}>{added ? '追加済み' : '＋ 追加'}</Text>
                </Pressable>
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
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  eyebrow: { color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 4, color: '#F4F6F3', fontSize: 25, fontWeight: '700' },
  closeButton: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 20 },
  closeText: { color: '#FFF1B8', fontSize: 12, fontWeight: '600' },
  searchInput: { minHeight: 51, marginHorizontal: 20, marginTop: 19, paddingHorizontal: 15, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 14, backgroundColor: '#151515', color: '#F4F6F3', fontSize: 14 },
  categoryRow: { gap: 8, paddingHorizontal: 20, paddingVertical: 15 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 20 },
  selectedChip: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  categoryText: { color: '#9DA69F', fontSize: 11, fontWeight: '600' },
  selectedChipText: { color: '#0A0A0A' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  exerciseRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2C2924' },
  addedRow: { opacity: 0.45 },
  exerciseCopy: { flex: 1, paddingRight: 12 },
  exerciseName: { color: '#F4F6F3', fontSize: 13, fontWeight: '700' },
  exerciseMeta: { marginTop: 4, color: '#737B75', fontSize: 10 },
  addText: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' },
  addedText: { color: '#737B75' },
  emptyText: { paddingVertical: 40, color: '#737B75', fontSize: 13, textAlign: 'center' },
});
