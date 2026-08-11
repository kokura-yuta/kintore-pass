import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { ExerciseRecordCard, type ExerciseRecord } from '@/components/ExerciseRecordCard';
import { exerciseCatalog, type ExerciseOption } from '@/lib/exerciseCatalog';

function createRecord(exercise: ExerciseOption): ExerciseRecord {
  return {
    ...exercise,
    sets: Array.from({ length: 3 }, (_, index) => ({
      id: `${exercise.id}-set-${index + 1}`,
      weightKg: '',
      reps: '',
    })),
  };
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TrainingScreen() {
  const defaultExercises = ['bench-press', 'incline-dumbbell-press', 'side-raise']
    .map((id) => exerciseCatalog.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is ExerciseOption => Boolean(exercise))
    .map(createRecord);
  const [exercises, setExercises] = useState<ExerciseRecord[]>(defaultExercises);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [trainingMinutes, setTrainingMinutes] = useState('');
  const [condition, setCondition] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const trainingDate = formatLocalDate(new Date());

  function addExercise(exercise: ExerciseOption) {
    setExercises((current) => [...current, createRecord(exercise)]);
    setErrorMessage('');
  }

  function updateSet(exerciseIndex: number, setId: string, field: 'weightKg' | 'reps', value: string) {
    setExercises((current) => current.map((exercise, index) => index === exerciseIndex
      ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, [field]: value } : set) }
      : exercise));
    setErrorMessage('');
    setSuccessMessage('');
  }

  function addSet(exerciseIndex: number) {
    setExercises((current) => current.map((exercise, index) => index === exerciseIndex
      ? {
          ...exercise,
          sets: [...exercise.sets, { id: `${exercise.id}-set-${Date.now()}`, weightKg: '', reps: '' }],
        }
      : exercise));
  }

  function removeSet(exerciseIndex: number, setId: string) {
    setExercises((current) => current.map((exercise, index) => index === exerciseIndex && exercise.sets.length > 1
      ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
      : exercise));
  }

  async function saveRecord() {
    setSuccessMessage('');
    if (exercises.length === 0) {
      setErrorMessage('実施した種目を1つ以上追加してください。');
      return;
    }
    if (exercises.some((exercise) => exercise.sets.some((set) => !set.reps))) {
      setErrorMessage('すべてのセットに回数を入力してください。');
      return;
    }
    if (!trainingMinutes || Number(trainingMinutes) <= 0) {
      setErrorMessage('トレーニング時間を入力してください。');
      return;
    }
    if (!condition) {
      setErrorMessage('今日の調子を1〜10で選択してください。');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setIsSaving(false);
    setSuccessMessage('入力内容を確認しました。API接続後、この記録を履歴へ保存します。');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>TRAINING LOG</Text>
              <Text style={styles.title}>トレーニング記録</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateLabel}>DATE</Text>
              <Text style={styles.dateValue}>{trainingDate}</Text>
            </View>
          </View>
          <Text style={styles.lead}>今日取り組んだ種目とコンディションを記録します。</Text>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>実施した種目</Text>
            <Text style={styles.exerciseCount}>{exercises.length}種目</Text>
          </View>

          {exercises.map((exercise, index) => (
            <ExerciseRecordCard
              exercise={exercise}
              index={index}
              key={exercise.id}
              onAddSet={() => addSet(index)}
              onChangeSet={(setId, field, value) => updateSet(index, setId, field, value)}
              onRemove={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))}
              onRemoveSet={(setId) => removeSet(index, setId)}
            />
          ))}

          <Pressable onPress={() => setPickerVisible(true)} style={styles.addButton}>
            <Text style={styles.addButtonIcon}>＋</Text>
            <Text style={styles.addButtonText}>種目を検索して追加</Text>
          </Pressable>

          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>トレーニング詳細</Text>
            <Text style={styles.fieldLabel}>トレーニング時間</Text>
            <View style={styles.timeInputWrap}>
              <TextInput
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(text) => setTrainingMinutes(text.replace(/\D/g, ''))}
                placeholder="60"
                placeholderTextColor="#59605A"
                style={styles.timeInput}
                value={trainingMinutes}
              />
              <Text style={styles.timeUnit}>分</Text>
            </View>

            <Text style={styles.conditionLabel}>今日の調子 <Text style={styles.conditionValue}>{condition ?? '—'} / 10</Text></Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                <Pressable key={score} onPress={() => setCondition(score)} style={[styles.ratingButton, condition === score && styles.selectedRating]}>
                  <Text style={[styles.ratingText, condition === score && styles.selectedRatingText]}>{score}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>メモ <Text style={styles.optionalText}>任意</Text></Text>
            <TextInput
              multiline
              onChangeText={setMemo}
              placeholder="フォーム、疲労、気づいたことなど"
              placeholderTextColor="#59605A"
              style={styles.memoInput}
              textAlignVertical="top"
              value={memo}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable disabled={isSaving} onPress={saveRecord} style={[styles.saveButton, isSaving && styles.disabledButton]}>
            {isSaving ? <ActivityIndicator color="#0B0D0C" /> : <Text style={styles.saveButtonText}>記録を保存</Text>}
          </Pressable>
          <Text style={styles.previewNote}>現在は開発用確認です。履歴保存は記録API接続後に有効になります。</Text>
        </ScrollView>
      </SafeAreaView>

      <BottomNavigation />
      <ExercisePickerModal
        addedIds={exercises.map((exercise) => exercise.id)}
        onAdd={addExercise}
        onClose={() => setPickerVisible(false)}
        visible={pickerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#B6F24B', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 5, color: '#F4F6F3', fontSize: 27, fontWeight: '900' },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#2C312D', borderRadius: 13, backgroundColor: '#151816' },
  dateLabel: { color: '#697169', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  dateValue: { marginTop: 3, color: '#DDE1DD', fontSize: 10, fontWeight: '800' },
  lead: { marginTop: 11, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 11 },
  sectionTitle: { color: '#F4F6F3', fontSize: 15, fontWeight: '900' },
  exerciseCount: { color: '#B6F24B', fontSize: 11, fontWeight: '900' },
  addButton: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#B6F24B', borderRadius: 15 },
  addButtonIcon: { color: '#B6F24B', fontSize: 19, fontWeight: '700' },
  addButtonText: { color: '#B6F24B', fontSize: 13, fontWeight: '900' },
  detailsCard: { marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#2C312D', borderRadius: 17, backgroundColor: '#151816' },
  cardTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '900' },
  fieldLabel: { marginTop: 19, marginBottom: 8, color: '#A5ADA7', fontSize: 11, fontWeight: '800' },
  timeInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#343A35', borderRadius: 12, backgroundColor: '#0B0D0C' },
  timeInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '800' },
  timeUnit: { paddingRight: 13, color: '#737B75', fontSize: 11 },
  conditionLabel: { marginTop: 20, color: '#A5ADA7', fontSize: 11, fontWeight: '800' },
  conditionValue: { color: '#B6F24B' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  ratingButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#343A35', borderRadius: 10, backgroundColor: '#0B0D0C' },
  selectedRating: { borderColor: '#B6F24B', backgroundColor: '#B6F24B' },
  ratingText: { color: '#8E978F', fontSize: 11, fontWeight: '900' },
  selectedRatingText: { color: '#0B0D0C' },
  optionalText: { color: '#697169', fontSize: 9 },
  memoInput: { minHeight: 100, padding: 13, borderWidth: 1, borderColor: '#343A35', borderRadius: 12, backgroundColor: '#0B0D0C', color: '#F4F6F3', fontSize: 13, lineHeight: 20 },
  error: { marginTop: 13, color: '#FF7676', fontSize: 12, lineHeight: 18 },
  success: { marginTop: 13, color: '#B6F24B', fontSize: 12, lineHeight: 18 },
  saveButton: { minHeight: 55, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 15, backgroundColor: '#B6F24B' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { color: '#0B0D0C', fontSize: 15, fontWeight: '900' },
  previewNote: { marginTop: 12, color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
