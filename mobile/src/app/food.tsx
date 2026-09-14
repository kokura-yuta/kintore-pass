import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';

type MealType = '朝食' | '昼食' | '夕食' | '間食';

type FoodEntry = {
  id: string;
  date: string;
  mealType: MealType;
  name: string;
  calories: number;
  proteinGrams: number;
};

const mealTypes: MealType[] = ['朝食', '昼食', '夕食', '間食'];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return year >= 2000 && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

export default function FoodScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [entryDate, setEntryDate] = useState(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('朝食');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [error, setError] = useState('');

  const todayEntries = entries.filter((entry) => entry.date === today());
  const totalCalories = todayEntries.reduce((total, entry) => total + entry.calories, 0);
  const totalProtein = todayEntries.reduce((total, entry) => total + entry.proteinGrams, 0);
  const historyDates = [...new Set(entries.map((entry) => entry.date))].sort((a, b) => b.localeCompare(a));

  function resetForm() {
    setEditingId(null);
    setEntryDate(today());
    setMealType('朝食');
    setName('');
    setCalories('');
    setProtein('');
    setError('');
  }

  function editEntry(entry: FoodEntry) {
    setEditingId(entry.id);
    setEntryDate(entry.date);
    setMealType(entry.mealType);
    setName(entry.name);
    setCalories(String(entry.calories));
    setProtein(String(entry.proteinGrams));
    setError('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function saveEntry() {
    const normalizedName = name.trim();
    const parsedCalories = Number(calories);
    const parsedProtein = protein.trim() ? Number(protein) : 0;

    if (!normalizedName) {
      setError('食事名を入力してください。');
      return;
    }
    if (!isValidDate(entryDate)) {
      setError('日付をYYYY-MM-DD形式で正しく入力してください。');
      return;
    }
    if (!calories.trim() || !Number.isFinite(parsedCalories) || parsedCalories < 0) {
      setError('カロリーを正しく入力してください。');
      return;
    }
    if (!Number.isFinite(parsedProtein) || parsedProtein < 0) {
      setError('たんぱく質を正しく入力してください。');
      return;
    }

    setEntries((current) => {
      const entry = {
        id: editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: entryDate,
        mealType,
        name: normalizedName,
        calories: parsedCalories,
        proteinGrams: parsedProtein,
      };
      return editingId ? current.map((item) => item.id === editingId ? entry : item) : [...current, entry];
    });
    resetForm();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>NUTRITION</Text>
                <Text style={styles.title}>食事管理</Text>
              </View>
              <Text style={styles.date}>今日</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>今日の合計</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalCalories.toLocaleString()}</Text>
                  <Text style={styles.summaryUnit}>kcal</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalProtein.toFixed(1)}</Text>
                  <Text style={styles.summaryUnit}>たんぱく質 g</Text>
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>{editingId ? '食事を編集' : '食事を追加'}</Text>
              <Text style={styles.formLabel}>記録日</Text>
              <TextInput accessibilityLabel="記録日" keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(value) => { setEntryDate(value); setError(''); }} placeholder="YYYY-MM-DD" placeholderTextColor="#556772" style={styles.input} value={entryDate} />
              <Text style={styles.formLabel}>食事区分</Text>
              <View style={styles.mealTypeRow}>
                {mealTypes.map((item) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mealType === item }}
                    key={item}
                    onPress={() => setMealType(item)}
                    style={[styles.mealTypeButton, mealType === item && styles.selectedMealType]}
                  >
                    <Text style={[styles.mealTypeText, mealType === item && styles.selectedMealTypeText]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>食事名</Text>
              <TextInput
                accessibilityLabel="食事名"
                maxLength={80}
                onChangeText={(value) => { setName(value); setError(''); }}
                placeholder="例：鶏むね肉とご飯"
                placeholderTextColor="#556772"
                style={styles.input}
                value={name}
              />

              <View style={styles.numberRow}>
                <View style={styles.numberField}>
                  <Text style={styles.formLabel}>カロリー</Text>
                  <View style={styles.inputWithUnit}>
                    <TextInput accessibilityLabel="カロリー" keyboardType="decimal-pad" onChangeText={(value) => { setCalories(value); setError(''); }} placeholder="0" placeholderTextColor="#556772" style={styles.numberInput} value={calories} />
                    <Text style={styles.inputUnit}>kcal</Text>
                  </View>
                </View>
                <View style={styles.numberField}>
                  <Text style={styles.formLabel}>たんぱく質</Text>
                  <View style={styles.inputWithUnit}>
                    <TextInput accessibilityLabel="たんぱく質" keyboardType="decimal-pad" onChangeText={(value) => { setProtein(value); setError(''); }} placeholder="任意" placeholderTextColor="#556772" style={styles.numberInput} value={protein} />
                    <Text style={styles.inputUnit}>g</Text>
                  </View>
                </View>
              </View>

              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveEntry} style={styles.addButton}>
                <Text style={styles.addButtonText}>{editingId ? '変更を保存' : 'この食事を追加'}</Text>
              </Pressable>
              {editingId ? <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancelButton}><Text style={styles.cancelText}>編集をやめる</Text></Pressable> : null}
              <Text style={styles.previewNote}>現在は画面内だけの仮記録です。画面を閉じると消えます。サーバー保存はAPI接続後に対応します。</Text>
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.sectionTitle}>今日の食事</Text>
              <Text style={styles.count}>{todayEntries.length}件</Text>
            </View>
            {todayEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>まだ食事記録がありません</Text>
                <Text style={styles.emptyText}>食べたものを追加すると、今日の合計を確認できます。</Text>
              </View>
            ) : (
              <View style={styles.entryList}>
                {todayEntries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryCopy}>
                      <Text style={styles.entryType}>{entry.mealType}</Text>
                      <Text style={styles.entryName}>{entry.name}</Text>
                    </View>
                    <View style={styles.entryNumbers}>
                      <Text style={styles.entryCalories}>{entry.calories.toLocaleString()} kcal</Text>
                      <Text style={styles.entryProtein}>P {entry.proteinGrams.toFixed(1)} g</Text>
                    </View>
                    <View style={styles.entryActions}><Pressable accessibilityRole="button" onPress={() => editEntry(entry)}><Text style={styles.actionText}>編集</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(entry.id)}><Text style={styles.deleteText}>削除</Text></Pressable></View>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.listHeading}><Text style={styles.sectionTitle}>食事履歴</Text><Text style={styles.count}>{entries.length}件</Text></View>
            {historyDates.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyText}>履歴はまだありません。</Text></View> : historyDates.map((date) => (
              <View key={date} style={styles.historyGroup}>
                <Text style={styles.historyDate}>{date}{date === today() ? '（今日）' : ''}</Text>
                {entries.filter((entry) => entry.date === date).map((entry) => (
                  <View key={entry.id} style={styles.historyRow}>
                    <Text style={styles.historyName}>{entry.mealType} · {entry.name}　{entry.calories.toLocaleString()} kcal</Text>
                    <Pressable accessibilityLabel={`${entry.name}を編集`} accessibilityRole="button" onPress={() => editEntry(entry)}><Text style={styles.actionText}>編集</Text></Pressable>
                    <Pressable accessibilityLabel={`${entry.name}を削除`} accessibilityRole="button" onPress={() => setDeletingId(entry.id)}><Text style={styles.deleteText}>削除</Text></Pressable>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />
      <Modal animationType="fade" onRequestClose={() => setDeletingId(null)} transparent visible={Boolean(deletingId)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmCard}><Text style={styles.confirmText}>この食事記録を削除しますか？</Text><View style={styles.confirmActions}><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.actionText}>キャンセル</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setEntries((current) => current.filter((entry) => entry.id !== deletingId)); if (editingId === deletingId) resetForm(); setDeletingId(null); }}><Text style={styles.deleteText}>削除する</Text></Pressable></View></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },
  title: { marginTop: 5, color: '#F4F6F3', fontSize: 28, fontWeight: '700' },
  date: { color: '#8A9BA5', fontSize: 12, fontWeight: '700' },
  summaryCard: { marginTop: 20, padding: 18, borderWidth: 1, borderColor: '#1E6076', borderRadius: 18, backgroundColor: '#081821' },
  cardLabel: { color: '#8A9BA5', fontSize: 10, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  summaryItem: { flex: 1 },
  summaryValue: { color: '#F4F6F3', fontSize: 29, fontWeight: '700' },
  summaryUnit: { marginTop: 3, color: '#73E7FF', fontSize: 10, fontWeight: '700' },
  divider: { width: 1, height: 48, marginHorizontal: 16, backgroundColor: '#203441' },
  formCard: { marginTop: 14, padding: 17, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#0A1219' },
  sectionTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  formLabel: { marginTop: 16, marginBottom: 7, color: '#A7B5BD', fontSize: 10, fontWeight: '700' },
  mealTypeRow: { flexDirection: 'row', gap: 7 },
  mealTypeButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F' },
  selectedMealType: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  mealTypeText: { color: '#9EADB5', fontSize: 10, fontWeight: '700' },
  selectedMealTypeText: { color: '#050A0F' },
  input: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: '#294653', borderRadius: 13, color: '#F4F6F3', backgroundColor: '#071018', fontSize: 14 },
  numberRow: { flexDirection: 'row', gap: 10 },
  numberField: { flex: 1 },
  inputWithUnit: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 13, backgroundColor: '#071018' },
  numberInput: { flex: 1, minWidth: 0, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 14 },
  inputUnit: { paddingRight: 12, color: '#70838E', fontSize: 10, fontWeight: '700' },
  error: { marginTop: 12, color: '#FF8D98', fontSize: 11 },
  addButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 14, backgroundColor: '#00D4FF' },
  addButtonText: { color: '#050A0F', fontSize: 13, fontWeight: '700' },
  previewNote: { marginTop: 10, color: '#60727D', fontSize: 9, lineHeight: 14, textAlign: 'center' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  count: { color: '#73E7FF', fontSize: 10, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#091118' },
  emptyTitle: { color: '#DDE4E7', fontSize: 13, fontWeight: '700' },
  emptyText: { marginTop: 7, color: '#71838E', fontSize: 10, lineHeight: 17, textAlign: 'center' },
  entryList: { gap: 9 },
  entryCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: 1, borderColor: '#203441', borderRadius: 15, backgroundColor: '#091118' },
  entryCopy: { flex: 1, marginRight: 12 },
  entryType: { color: '#73E7FF', fontSize: 9, fontWeight: '700' },
  entryName: { marginTop: 5, color: '#F4F6F3', fontSize: 13, fontWeight: '600' },
  entryNumbers: { alignItems: 'flex-end' },
  entryCalories: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' },
  entryProtein: { marginTop: 5, color: '#80929C', fontSize: 9, fontWeight: '700' },
  cancelButton: { alignItems: 'center', marginTop: 14, padding: 10 },
  cancelText: { color: '#73E7FF', fontSize: 12, fontWeight: '700' },
  entryActions: { gap: 12, marginLeft: 12 },
  actionText: { color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  deleteText: { color: '#FF8D98', fontSize: 11, fontWeight: '700' },
  historyGroup: { marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#203441', borderRadius: 15, backgroundColor: '#091118' },
  historyDate: { marginBottom: 10, color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#203441' },
  historyName: { flex: 1, color: '#F4F6F3', fontSize: 11 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.72)' },
  confirmCard: { padding: 20, borderWidth: 1, borderColor: '#FF8D98', borderRadius: 14, backgroundColor: '#181115' },
  confirmText: { color: '#F4F6F3', fontSize: 12 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 14 },
});
