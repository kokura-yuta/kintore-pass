import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exerciseCategories, type ExerciseCategory, type ExerciseOption } from '@/lib/exerciseCatalog';
import { useFavorites } from '@/components/FavoriteExercises';
import { filterPickerExercises } from '@/lib/exercisePickerFilter';

const pickerCategories = [exerciseCategories[0], 'お気に入り', ...exerciseCategories.slice(1)] as const;

type Props = {
  addedIds: string[];
  onAdd: (exercise: ExerciseOption) => void;
  onClose: () => void;
  visible: boolean;
};

export function ExercisePickerModal({ addedIds, onAdd, onClose, visible }: Props) {
  const { ids, catalog, create, ready, busy, error, toggle } = useFavorites();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [part, setPart] = useState<ExerciseCategory>('胸');
  const [equipment, setEquipment] = useState('');
  const [createError, setCreateError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof pickerCategories)[number]>('すべて');
  useEffect(() => {
    if (visible) {
      setQuery('');
      setCategory('すべて');
      setCreating(false);
    }
  }, [visible]);
  const filteredExercises = useMemo(() => filterPickerExercises(catalog, category, query, ids), [catalog, category, query, ids]);
  async function saveCustom() {
    try {
      await create(name, part, equipment);
      setQuery('');
      setCategory('すべて');
      setCreating(false);
      setName(''); setEquipment(''); setCreateError('');
    } catch (error) { setCreateError(error instanceof Error ? error.message : '保存できませんでした。'); }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>EXERCISE LIST</Text>
              <Text style={styles.title}>種目を追加</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {creating ? <View style={styles.form}>
            <Text style={styles.title}>種目作成</Text>
            <Text style={styles.exerciseMeta}>自分のアカウント用に、この端末へ保存します。</Text>
            <TextInput accessibilityLabel="種目名" editable={!busy} maxLength={60} placeholder="種目名（必須）" placeholderTextColor="#657681" value={name} onChangeText={setName} style={styles.formInput} />
            <Text style={styles.exerciseName}>部位</Text>
            <View style={styles.parts}>{exerciseCategories.slice(1).map(item => <Pressable key={item} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: part === item }} onPress={() => setPart(item as ExerciseCategory)} style={[styles.categoryChip, part === item && styles.selectedChip]}><Text style={[styles.categoryText, part === item && styles.selectedChipText]}>{item}</Text></Pressable>)}</View>
            <TextInput accessibilityLabel="器具（任意）" editable={!busy} maxLength={40} placeholder="器具（任意）例：ケーブル" placeholderTextColor="#657681" value={equipment} onChangeText={setEquipment} style={styles.formInput} />
            {createError ? <Text accessibilityRole="alert" style={styles.error}>{createError}</Text> : null}
            <Pressable accessibilityRole="button" disabled={!ready || busy} onPress={() => void saveCustom()} style={styles.categoryChip}><Text style={styles.closeText}>{busy ? '保存中…' : '作成して一覧に表示'}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setCreating(false)} style={styles.action}><Text style={styles.closeText}>キャンセル</Text></Pressable>
          </View> : null}
          {!creating ?
          <Pressable accessibilityRole="button" disabled={!ready || busy} onPress={() => { setName(query); setCreateError(''); setCreating(true); }} style={styles.createButton}><Text style={styles.closeText}>＋ 種目作成</Text></Pressable>
          : null}
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
              {pickerCategories.map((item) => (
                <Pressable accessibilityRole="radio" accessibilityLabel={item} accessibilityState={{ checked: category === item }} key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.selectedChip]}>
                  <Text style={[styles.categoryText, category === item && styles.selectedChipText]}>{item === 'お気に入り' ? '☆ お気に入り' : item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.hint}>☆でお気に入り登録・解除 ／ ＋で今回の記録に追加</Text>
          <Text style={styles.hint}>お気に入りはアカウント別にこの端末へ保存されます。</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.list}>
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
            {filteredExercises.length === 0 ? <Text style={styles.emptyText}>{category === 'お気に入り' && !ready
              ? error ? 'お気に入りを確認できませんでした。' : 'お気に入りを読み込み中…'
              : category === 'お気に入り' && !query.trim() ? 'お気に入りはまだありません。「すべて」や部位から☆を押して登録してください。' : '該当する種目がありません。'}</Text> : null}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  createButton: { marginHorizontal: 20, marginTop: 16, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 14 },
  form: { padding: 20, gap: 16, paddingBottom: 40 },
  formInput: { minHeight: 51, paddingHorizontal: 15, borderWidth: 1, borderColor: '#294653', borderRadius: 14, color: '#F4F6F3', backgroundColor: '#0C151D' },
  parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  categoryChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: '#294653', borderRadius: 20 },
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
