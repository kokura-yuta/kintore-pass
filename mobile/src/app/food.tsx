import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { isApiBypassEnabled } from '@/lib/api';
import {
  createFoodRecord,
  deleteFoodRecord,
  fetchFoodRecords,
  type FoodRecord,
  type MealType,
} from '@/lib/foodRecords';

const mealTypes: MealType[] = ['朝食', '昼食', '夕食', '間食'];

// 端末の現在日付をAPIで使うYYYY-MM-DD形式へ変換する
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FoodScreen() {
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const [entries, setEntries] = useState<FoodRecord[]>([]);
  const [mealType, setMealType] = useState<MealType>('朝食');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(!isApiBypassEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);
  const savingLock = useRef(false);
  const recordedDate = getToday();

  const totalCalories = entries.reduce((total, entry) => total + entry.calories, 0);
  const totalProtein = entries.reduce((total, entry) => total + entry.proteinGrams, 0);

  // 再描画後も最新のClerkトークン取得関数を利用する
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // 画面を開いたときに今日の食事をバックエンドから読み込む
  const loadEntries = useCallback(async () => {
    if (isApiBypassEnabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await getTokenRef.current();

      if (!token) {
        throw new Error('ログイン状態を確認できませんでした。');
      }

      const response = await fetchFoodRecords(token, recordedDate);
      setEntries(response.records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '食事記録を読み込めませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [recordedDate]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadEntries();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadEntries]);

  // 入力内容を検査し、本人の食事記録として保存する
  async function addEntry() {
    if (savingLock.current) return;

    const normalizedName = name.trim();
    const parsedCalories = Number(calories);
    const parsedProtein = protein.trim() ? Number(protein) : 0;

    if (!normalizedName) {
      setError('食事名を入力してください。');
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

    setError('');
    setSuccess('');
    savingLock.current = true;
    setIsSaving(true);

    try {
      const input = {
        recordedDate,
        mealType,
        name: normalizedName,
        calories: parsedCalories,
        proteinGrams: parsedProtein,
      };

      let savedRecord: FoodRecord;

      if (isApiBypassEnabled) {
        savedRecord = {
          id: `food-${Date.now()}`,
          ...input,
        };
      } else {
        const token = await getTokenRef.current();

        if (!token) {
          throw new Error('ログイン状態を確認できませんでした。');
        }

        savedRecord = await createFoodRecord(token, input);
      }

      setEntries((current) => [...current, savedRecord]);
      setName('');
      setCalories('');
      setProtein('');
      setSuccess('食事を記録しました。');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '食事記録を保存できませんでした。');
    } finally {
      savingLock.current = false;
      setIsSaving(false);
    }
  }

  // 削除確認後、本人の食事記録をNeonと画面の両方から削除する
  function confirmDelete(record: FoodRecord) {
    Alert.alert('食事記録を削除', `${record.name}を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingRecordId(record.id);
            setError('');

            try {
              if (!isApiBypassEnabled) {
                const token = await getTokenRef.current();

                if (!token) throw new Error('ログイン状態を確認できませんでした。');
                await deleteFoodRecord(token, record.id);
              }

              setEntries((current) => current.filter((entry) => entry.id !== record.id));
              setSuccess('食事記録を削除しました。');
            } catch (deleteError) {
              setError(deleteError instanceof Error ? deleteError.message : '食事記録を削除できませんでした。');
            } finally {
              setDeletingRecordId(null);
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              <Text style={styles.sectionTitle}>食事を追加</Text>
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
              {success ? <Text style={styles.success}>{success}</Text> : null}
              <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => { void addEntry(); }} style={[styles.addButton, isSaving && styles.disabledButton]}>
                {isSaving ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.addButtonText}>この食事を追加</Text>}
              </Pressable>
              <Text style={styles.previewNote}>保存した内容はログイン中の本人の記録としてNeonに残ります。</Text>
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.sectionTitle}>今日の食事</Text>
              <Text style={styles.count}>{entries.length}件</Text>
            </View>
            {isLoading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color="#00D4FF" />
                <Text style={styles.emptyText}>食事記録を読み込んでいます。</Text>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>まだ食事記録がありません</Text>
                <Text style={styles.emptyText}>食べたものを追加すると、今日の合計を確認できます。</Text>
              </View>
            ) : (
              <View style={styles.entryList}>
                {entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryCopy}>
                      <Text style={styles.entryType}>{entry.mealType}</Text>
                      <Text style={styles.entryName}>{entry.name}</Text>
                    </View>
                    <View style={styles.entryNumbers}>
                      <Text style={styles.entryCalories}>{entry.calories.toLocaleString()} kcal</Text>
                      <Text style={styles.entryProtein}>P {entry.proteinGrams.toFixed(1)} g</Text>
                      <Pressable accessibilityLabel={`${entry.name}を削除`} disabled={deletingRecordId === entry.id} onPress={() => confirmDelete(entry)}>
                        <Text style={styles.deleteText}>{deletingRecordId === entry.id ? '削除中' : '削除'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />
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
  success: { marginTop: 12, color: '#73E7FF', fontSize: 11 },
  addButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 14, backgroundColor: '#00D4FF' },
  disabledButton: { opacity: 0.55 },
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
  deleteText: { marginTop: 7, color: '#FF8D98', fontSize: 9, fontWeight: '700' },
});
