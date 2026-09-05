import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStateCard } from '@/components/ScreenStateCard';
import { useWeightHistory } from '@/contexts/WeightHistoryContext';
import { sanitizeDecimalInput } from '@/lib/numberInput';

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
  const { records, saveRecord } = useWeightHistory();
  const [recordedOn, setRecordedOn] = useState(formatLocalDate(new Date()));
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
    const numericWeight = Number(weightKg);
    if (!isValidDate(recordedOn)) {
      setError('日付をYYYY-MM-DD形式で入力してください。');
      return;
    }
    if (!weightKg || !Number.isFinite(numericWeight) || numericWeight < 30 || numericWeight > 300) {
      setError('体重を30〜300kgで入力してください。');
      return;
    }
    setError('');
    setSuccess('');
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    saveRecord({ id: `weight-${Date.now()}`, recordedOn, weightKg: numericWeight });
    setWeightKg('');
    setIsSaving(false);
    setSuccess('体重を記録しました。同じ日付の記録は最新の値に更新されます。');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Pressable accessibilityLabel="マイページへ戻る" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
              <View><Text style={styles.eyebrow}>BODY WEIGHT</Text><Text style={styles.title}>体重記録</Text></View>
            </View>

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
              <Text style={styles.cardTitle}>今日の体重を追加</Text>
              <Text style={styles.fieldLabel}>日付</Text>
              <TextInput autoCapitalize="none" onChangeText={setRecordedOn} placeholder="YYYY-MM-DD" placeholderTextColor="#556772" style={styles.textInput} value={recordedOn} />
              <Text style={styles.fieldLabel}>体重</Text>
              <View style={styles.weightInputWrap}>
                <TextInput inputMode="decimal" keyboardType="decimal-pad" onChangeText={(text) => { setWeightKg(sanitizeDecimalInput(text)); setError(''); setSuccess(''); }} placeholder="65.0" placeholderTextColor="#556772" style={styles.weightInput} value={weightKg} />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}
              <Pressable disabled={isSaving} onPress={addWeight} style={[styles.saveButton, isSaving && styles.disabledButton]}>
                {isSaving ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.saveText}>体重を記録</Text>}
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>記録履歴</Text>
              {sortedRecords.length === 0 ? <ScreenStateCard compact embedded message="最初の体重を入力すると、ここへ日付ごとの履歴が残ります。" title="体重記録はまだありません" type="empty" /> : [...sortedRecords].reverse().map((record, index) => {
                const previous = [...sortedRecords].reverse()[index + 1];
                const difference = previous ? Number((record.weightKg - previous.weightKg).toFixed(1)) : null;
                return <View key={record.id} style={styles.historyRow}><Text style={styles.historyDate}>{record.recordedOn.replaceAll('-', '.')}</Text><View style={styles.historyRight}><Text style={styles.historyWeight}>{record.weightKg} kg</Text><Text style={styles.historyDiff}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${difference} kg`}</Text></View></View>;
              })}
            </View>
            <Text style={styles.previewNote}>現在は確認用の仮データです。API接続後はユーザーごとの体重履歴を保存します。</Text>
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
  chart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 18, paddingTop: 14 }, barColumn: { flex: 1, alignItems: 'center' }, barValue: { marginBottom: 5, color: '#CDD7DD', fontSize: 8, fontWeight: '600' }, bar: { width: '65%', maxWidth: 28, borderRadius: 7, backgroundColor: '#00D4FF' }, barDate: { marginTop: 6, color: '#657681', fontSize: 7, fontWeight: '700' },
  fieldLabel: { marginTop: 16, marginBottom: 7, color: '#AAB7BF', fontSize: 10, fontWeight: '600' }, textInput: { minHeight: 50, paddingHorizontal: 13, borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F', color: '#F4F6F3', fontSize: 13 }, weightInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F' }, weightInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '600' }, inputUnit: { paddingRight: 13, color: '#72828D', fontSize: 10 },
  error: { marginTop: 9, color: '#FF7676', fontSize: 10 }, success: { marginTop: 9, color: '#73E7FF', fontSize: 10 }, saveButton: { minHeight: 51, alignItems: 'center', justifyContent: 'center', marginTop: 13, borderRadius: 13, backgroundColor: '#00D4FF' }, disabledButton: { opacity: 0.5 }, saveText: { color: '#050A0F', fontSize: 13, fontWeight: '700' },
  historyRow: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#203441' }, historyDate: { color: '#AAB7BF', fontSize: 10, fontWeight: '700' }, historyRight: { flexDirection: 'row', alignItems: 'center', gap: 12 }, historyWeight: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' }, historyDiff: { width: 45, color: '#72828D', fontSize: 8, textAlign: 'right' }, previewNote: { marginTop: 14, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
