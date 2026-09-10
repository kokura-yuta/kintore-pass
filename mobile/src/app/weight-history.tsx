import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStateCard } from '@/components/ScreenStateCard';
import { useWeightHistory } from '@/contexts/WeightHistoryContext';
import { isApiBypassEnabled } from '@/lib/api';
import { sanitizeDecimalInput } from '@/lib/numberInput';
import {
  createWeightRecord,
  deleteWeightRecord,
  fetchWeightRecords,
  type WeightRecord,
  updateWeightRecord,
} from '@/lib/weightRecords';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export default function WeightHistoryScreen() {
  const router = useRouter();
  const { getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const {
    records: previewRecords,
    saveRecord: savePreviewRecord,
  } = useWeightHistory();
  const [records, setRecords] = useState<WeightRecord[]>(
    isApiBypassEnabled ? previewRecords : [],
  );
  const [recordedOn, setRecordedOn] = useState(formatLocalDate(new Date()));
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(!isApiBypassEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);
  const savingLock = useRef(false);

  // Clerkの最新トークン取得関数を、再描画しても同じRefから利用する
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // ログイン中の本人の体重履歴をバックエンド経由でNeonから取得する
  const loadRecords = useCallback(async () => {
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

      const response = await fetchWeightRecords(token);
      setRecords(response.records);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : '体重履歴を読み込めませんでした。',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 画面を開いたときに保存済みの体重履歴を1回読み込む
  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadRecords();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadRecords]);
  const sortedRecords = useMemo(() => [...records].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn)), [records]);
  const chartRecords = sortedRecords.slice(-7);
  const latest = sortedRecords.at(-1);
  const first = chartRecords.at(0);
  const change = latest && first ? Number((latest.weightKg - first.weightKg).toFixed(1)) : null;
  const weights = chartRecords.map((record) => record.weightKg);
  const minimum = weights.length ? Math.min(...weights) - 0.5 : 0;
  const maximum = weights.length ? Math.max(...weights) + 0.5 : 1;
  const range = Math.max(maximum - minimum, 1);

  async function addWeight() {
    if (savingLock.current) return;

    const numericWeight = Number(weightKg);
    if (!isValidDate(recordedOn)) {
      setError('日付をYYYY-MM-DD形式で入力してください。');
      return;
    }
    if (!weightKg || !Number.isFinite(numericWeight) || numericWeight < 20 || numericWeight > 500) {
      setError('体重を20〜500kgで入力してください。');
      return;
    }

    setError('');
    setSuccess('');
    savingLock.current = true;
    setIsSaving(true);

    try {
      const sameDateRecord = records.find(
        (record) => record.recordedOn === recordedOn,
      );
      const updateTargetId = editingRecordId ?? sameDateRecord?.id ?? null;

      if (isApiBypassEnabled) {
        const previewRecord = {
          id: updateTargetId ?? `weight-${Date.now()}`,
          recordedOn,
          weightKg: numericWeight,
        };
        savePreviewRecord(previewRecord);
        setRecords((current) => [
          ...current.filter(
            (record) => record.id !== previewRecord.id && record.recordedOn !== recordedOn,
          ),
          previewRecord,
        ]);
      } else {
        const token = await getTokenRef.current();

        if (!token) {
          throw new Error('ログイン状態を確認できませんでした。');
        }

        const savedRecord = updateTargetId
          ? await updateWeightRecord(token, updateTargetId, numericWeight)
          : await createWeightRecord(token, recordedOn, numericWeight);

        setRecords((current) => [
          ...current.filter(
            (record) => record.id !== savedRecord.id,
          ),
          savedRecord,
        ]);
      }

      setWeightKg('');
      setEditingRecordId(null);
      setSuccess(
        updateTargetId
          ? '体重記録を更新しました。'
          : '体重を記録しました。',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : '体重を保存できませんでした。',
      );
    } finally {
      savingLock.current = false;
      setIsSaving(false);
    }
  }

  // 選んだ記録の日付と体重を入力欄へ戻し、更新できる状態にする
  function startEditing(record: WeightRecord) {
    setEditingRecordId(record.id);
    setRecordedOn(record.recordedOn);
    setWeightKg(String(record.weightKg));
    setError('');
    setSuccess('');
  }

  // 編集をやめて新しい体重を入力する状態へ戻す
  function cancelEditing() {
    setEditingRecordId(null);
    setRecordedOn(formatLocalDate(new Date()));
    setWeightKg('');
    setError('');
    setSuccess('');
  }

  // 確認後、本人の体重記録をバックエンド経由で1件削除する
  async function performDelete(recordId: string) {
    setDeletingRecordId(recordId);
    setError('');
    setSuccess('');

    try {
      if (!isApiBypassEnabled) {
        const token = await getTokenRef.current();

        if (!token) {
          throw new Error('ログイン状態を確認できませんでした。');
        }

        await deleteWeightRecord(token, recordId);
      }

      setRecords((current) =>
        current.filter((record) => record.id !== recordId),
      );

      if (editingRecordId === recordId) {
        cancelEditing();
      }

      setSuccess('体重記録を削除しました。');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : '体重記録を削除できませんでした。',
      );
    } finally {
      setDeletingRecordId(null);
    }
  }

  // 削除は元に戻せないため、実行前に利用者へ確認する
  function confirmDelete(record: WeightRecord) {
    const message = `${record.recordedOn}の${record.weightKg}kgを削除します。`;

    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) {
        void performDelete(record.id);
      }
      return;
    }

    Alert.alert('体重記録を削除しますか？', message, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => void performDelete(record.id),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0} style={styles.safeArea}>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Pressable accessibilityLabel="マイページへ戻る" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
              <View><Text style={styles.eyebrow}>BODY WEIGHT</Text><Text style={styles.title}>体重記録</Text></View>
            </View>

            {isLoading ? (
              <ScreenStateCard compact message="本人の体重履歴をNeonから取得しています。" title="体重履歴を読み込み中" type="loading" />
            ) : null}
            {!isLoading && error && records.length === 0 ? (
              <ScreenStateCard actionLabel="もう一度読み込む" compact message={error} onAction={() => void loadRecords()} title="体重履歴を読み込めませんでした" type="error" />
            ) : null}

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>最新</Text><Text style={styles.summaryValue}>{latest?.weightKg ?? '—'}<Text style={styles.summaryUnit}> kg</Text></Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>表示期間の変化</Text><Text style={[styles.summaryValue, change !== null && change <= 0 && styles.greenValue]}>{change === null ? '—' : `${change > 0 ? '+' : ''}${change}`}<Text style={styles.summaryUnit}> kg</Text></Text></View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}><Text style={styles.cardTitle}>最近の推移</Text><Text style={styles.cardHint}>直近7件</Text></View>
              {chartRecords.length ? (
                <View style={styles.chart}>
                  {chartRecords.map((record) => {
                    const height = 35 + ((record.weightKg - minimum) / range) * 95;
                    return (
                      <View key={record.id} style={styles.barColumn}>
                        <Text style={styles.barValue}>{record.weightKg}</Text>
                        <View style={[styles.bar, { height }]} />
                        <Text style={styles.barDate}>{record.recordedOn.slice(5).replace('-', '/')}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : <ScreenStateCard compact embedded message="体重を記録すると、直近7件の変化をグラフで確認できます。" title="体重の推移はまだありません" type="empty" />}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>{editingRecordId ? '体重記録を編集' : '今日の体重を追加'}</Text>
                {editingRecordId ? <Pressable onPress={cancelEditing}><Text style={styles.cancelEdit}>編集をやめる</Text></Pressable> : null}
              </View>
              <Text style={styles.fieldLabel}>日付</Text>
              <TextInput accessibilityLabel="体重を記録する日付" autoCapitalize="none" editable={!editingRecordId} onChangeText={setRecordedOn} placeholder="YYYY-MM-DD" placeholderTextColor="#556772" style={[styles.textInput, editingRecordId && styles.readOnlyInput]} value={recordedOn} />
              <Text style={styles.fieldLabel}>体重</Text>
              <View style={styles.weightInputWrap}>
                <TextInput accessibilityLabel="記録する体重" inputMode="decimal" keyboardType="decimal-pad" onChangeText={(text) => { setWeightKg(sanitizeDecimalInput(text)); setError(''); setSuccess(''); }} placeholder="65.0" placeholderTextColor="#556772" style={styles.weightInput} value={weightKg} />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}
              <Pressable accessibilityLabel="体重を記録" accessibilityState={{ disabled: isSaving, busy: isSaving }} disabled={isSaving} onPress={addWeight} style={[styles.saveButton, isSaving && styles.disabledButton]}>
                {isSaving ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.saveText}>{editingRecordId ? '変更を保存' : '体重を記録'}</Text>}
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>記録履歴</Text>
              {sortedRecords.length === 0 ? <ScreenStateCard compact embedded message="最初の体重を入力すると、ここへ日付ごとの履歴が残ります。" title="体重記録はまだありません" type="empty" /> : [...sortedRecords].reverse().map((record, index) => {
                const previous = [...sortedRecords].reverse()[index + 1];
                const difference = previous ? Number((record.weightKg - previous.weightKg).toFixed(1)) : null;
                return <View key={record.id} style={styles.historyRow}><Text style={styles.historyDate}>{record.recordedOn.replaceAll('-', '.')}</Text><View style={styles.historyRight}><View><Text style={styles.historyWeight}>{record.weightKg} kg</Text><Text style={styles.historyDiff}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${difference} kg`}</Text></View><Pressable accessibilityLabel={`${record.recordedOn}の体重を編集`} onPress={() => startEditing(record)} style={styles.historyAction}><Text style={styles.editText}>編集</Text></Pressable><Pressable accessibilityLabel={`${record.recordedOn}の体重を削除`} disabled={deletingRecordId === record.id} onPress={() => confirmDelete(record)} style={styles.historyAction}>{deletingRecordId === record.id ? <ActivityIndicator color="#FF8D98" size="small" /> : <Text style={styles.deleteText}>削除</Text>}</Pressable></View></View>;
              })}
            </View>
            <Text style={styles.previewNote}>{isApiBypassEnabled ? '開発用モードでは画面内へ一時保存します。' : '体重履歴はログイン中の本人のデータとしてNeonへ保存されます。'}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center' }, backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#203441', borderRadius: 13 }, backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 },
  eyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 27, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 18 }, summaryCard: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 16, backgroundColor: '#0C151D' }, summaryLabel: { color: '#72828D', fontSize: 9, fontWeight: '600' }, summaryValue: { marginTop: 8, color: '#F4F6F3', fontSize: 23, fontWeight: '700' }, greenValue: { color: '#73E7FF' }, summaryUnit: { color: '#8798A3', fontSize: 10 },
  card: { marginTop: 13, padding: 16, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { color: '#F4F6F3', fontSize: 15, fontWeight: '700' }, cardHint: { color: '#72828D', fontSize: 9, fontWeight: '600' },
  cancelEdit: { color: '#73E7FF', fontSize: 10, fontWeight: '700' },
  chart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 18, paddingTop: 14 }, barColumn: { flex: 1, alignItems: 'center' }, barValue: { marginBottom: 5, color: '#CDD7DD', fontSize: 8, fontWeight: '600' }, bar: { width: '65%', maxWidth: 28, borderRadius: 7, backgroundColor: '#00D4FF' }, barDate: { marginTop: 6, color: '#657681', fontSize: 7, fontWeight: '700' },
  fieldLabel: { marginTop: 16, marginBottom: 7, color: '#AAB7BF', fontSize: 10, fontWeight: '600' }, textInput: { minHeight: 50, paddingHorizontal: 13, borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F', color: '#F4F6F3', fontSize: 13 }, weightInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F' }, weightInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '600' }, inputUnit: { paddingRight: 13, color: '#72828D', fontSize: 10 },
  readOnlyInput: { opacity: 0.55 },
  error: { marginTop: 9, color: '#FF7676', fontSize: 10 }, success: { marginTop: 9, color: '#73E7FF', fontSize: 10 }, saveButton: { minHeight: 51, alignItems: 'center', justifyContent: 'center', marginTop: 13, borderRadius: 13, backgroundColor: '#00D4FF' }, disabledButton: { opacity: 0.5 }, saveText: { color: '#050A0F', fontSize: 13, fontWeight: '700' },
  historyRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#203441' }, historyDate: { color: '#AAB7BF', fontSize: 10, fontWeight: '700' }, historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 }, historyWeight: { color: '#F4F6F3', fontSize: 12, fontWeight: '700', textAlign: 'right' }, historyDiff: { color: '#72828D', fontSize: 8, textAlign: 'right' }, historyAction: { minWidth: 38, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 9 }, editText: { color: '#73E7FF', fontSize: 9, fontWeight: '700' }, deleteText: { color: '#FF8D98', fontSize: 9, fontWeight: '700' }, previewNote: { marginTop: 14, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
