import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTrainingHistory } from '@/contexts/TrainingHistoryContext';
import { ScreenStateCard } from '@/components/ScreenStateCard';

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey() {
  const today = new Date();
  return dateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

export default function CalendarScreen() {
  const router = useRouter();
  const { errorMessage, isLoading, records, reloadRecords } = useTrainingHistory();
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const recordDates = useMemo(() => new Set(records.map((record) => record.performedOn)), [records]);
  const selectedRecords = records.filter((record) => record.performedOn === selectedDate);
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  function changeMonth(offset: number) {
    const next = new Date(year, monthIndex + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), 1));
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="マイページへ戻る" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>TRAINING HISTORY</Text><Text style={styles.title}>カレンダー</Text></View>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.monthHeader}>
              <Pressable accessibilityLabel="前の月" onPress={() => changeMonth(-1)} style={styles.monthButton}><Text style={styles.monthArrow}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{year}年 {monthIndex + 1}月</Text>
              <Pressable accessibilityLabel="次の月" onPress={() => changeMonth(1)} style={styles.monthButton}><Text style={styles.monthArrow}>›</Text></Pressable>
            </View>
            <View style={styles.weekRow}>
              {weekdayLabels.map((label) => <Text key={label} style={styles.weekLabel}>{label}</Text>)}
            </View>
            <View style={styles.daysGrid}>
              {calendarCells.map((day, index) => {
                if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
                const key = dateKey(year, monthIndex, day);
                const selected = selectedDate === key;
                return (
                  <Pressable key={key} onPress={() => setSelectedDate(key)} style={styles.dayCell}>
                    <View style={[styles.dayCircle, selected && styles.selectedDay]}><Text style={[styles.dayText, selected && styles.selectedDayText]}>{day}</Text></View>
                    {recordDates.has(key) ? <View style={styles.recordDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.legend}><View style={styles.recordDot} /><Text style={styles.legendText}>トレーニング実施日</Text></View>
          </View>

          <Text style={styles.selectedTitle}>{selectedDate.replaceAll('-', '.')} の記録</Text>
          {isLoading ? <ScreenStateCard compact title="記録を読み込み中" type="loading" /> : null}
          {errorMessage ? (
            <ScreenStateCard actionLabel="もう一度読み込む" compact message={errorMessage} onAction={() => void reloadRecords()} title="記録を読み込めませんでした" type="error" />
          ) : null}
          {!isLoading && !errorMessage && selectedRecords.length === 0 ? (
            <ScreenStateCard compact message="トレーニングを保存すると、この日に金色の印が付きます。" title="記録はありません" type="empty" />
          ) : null}
          {!isLoading && !errorMessage ? selectedRecords.map((record, recordIndex) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeading}><Text style={styles.recordTitle}>トレーニング {recordIndex + 1}</Text><Text style={styles.recordMeta}>{record.trainingMinutes ? `${record.trainingMinutes}分` : '時間未入力'} ・ 調子 {record.condition ?? '—'}/10</Text></View>
              {record.exercises.map((exercise) => (
                <View key={exercise.exerciseId} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.setSummary}>{exercise.sets.map((set) => `${set.weightKg ?? '—'}kg × ${set.reps ?? '—'}回`).join(' / ')}</Text>
                </View>
              ))}
              {record.memo ? <Text style={styles.memo}>メモ：{record.memo}</Text> : null}
            </View>
          )) : null}
          <Text style={styles.previewNote}>ログイン中のユーザーの保存済み記録を表示しています。</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#203441', borderRadius: 13 },
  backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 3, color: '#F4F6F3', fontSize: 27, fontWeight: '700' },
  calendarCard: { marginTop: 18, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#0C151D' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthArrow: { color: '#73E7FF', fontSize: 27 },
  monthTitle: { color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginTop: 12 },
  weekLabel: { width: '14.285%', color: '#657681', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  dayCell: { width: '14.285%', height: 48, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  selectedDay: { backgroundColor: '#00D4FF' },
  dayText: { color: '#CDD7DD', fontSize: 11, fontWeight: '600' },
  selectedDayText: { color: '#050A0F' },
  recordDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00D4FF' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  legendText: { color: '#72828D', fontSize: 9 },
  selectedTitle: { marginTop: 22, color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  recordCard: { marginTop: 11, padding: 16, borderWidth: 1, borderColor: '#203441', borderRadius: 16, backgroundColor: '#0C151D' },
  recordHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordTitle: { color: '#73E7FF', fontSize: 12, fontWeight: '700' },
  recordMeta: { color: '#72828D', fontSize: 9, fontWeight: '700' },
  exerciseRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#203441' },
  exerciseName: { color: '#E8EBE8', fontSize: 12, fontWeight: '700' },
  setSummary: { marginTop: 5, color: '#8798A3', fontSize: 9, lineHeight: 14 },
  memo: { marginTop: 12, color: '#AAB7BF', fontSize: 10, lineHeight: 16 },
  previewNote: { marginTop: 14, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
