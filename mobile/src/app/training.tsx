import { useState } from 'react';
import { useAuth } from '@clerk/expo';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { ExerciseRecordCard, type ExerciseRecord } from '@/components/ExerciseRecordCard';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { useTrainingHistory } from '@/contexts/TrainingHistoryContext';
import { exerciseCatalog, type ExerciseOption } from '@/lib/exerciseCatalog';
import { ApiError } from '@/lib/api';
import type { PreviousSetPreview } from '@/lib/previousRecordPreview';
import { createTrainingRecord } from '@/lib/trainingRecords';

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
  const { getToken } = useAuth();
  const { draft } = useTrainingDraft();
  const { addRecord, records } = useTrainingHistory();
  const defaultExercises = ['bench-press', 'incline-dumbbell-press', 'side-raise']
    .map((id) => exerciseCatalog.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is ExerciseOption => Boolean(exercise))
    .map(createRecord);
  const [exercises, setExercises] = useState<ExerciseRecord[]>(() => {
    if (!draft) return defaultExercises;

    return draft.exercises.flatMap((draftExercise) => {
      const exercise = exerciseCatalog.find((item) => item.id === draftExercise.exerciseId) ??
        (draftExercise.exerciseName && draftExercise.category
          ? {
              id: draftExercise.exerciseId,
              name: draftExercise.exerciseName,
              category: draftExercise.category,
              equipment: draftExercise.equipment ?? 'AI提案',
            }
          : null);
      if (!exercise) return [];
      return [{
        ...exercise,
        sets: draftExercise.sets.map((set, index) => ({ ...set, id: `${exercise.id}-menu-set-${index + 1}` })),
      }];
    });
  });
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

  function applyPreviousSets(exerciseIndex: number, previousSets: PreviousSetPreview[]) {
    setExercises((current) => current.map((exercise, index) => index === exerciseIndex
      ? {
          ...exercise,
          sets: previousSets.map((set, setIndex) => ({ ...set, id: `${exercise.id}-previous-set-${setIndex + 1}` })),
        }
      : exercise));
    setErrorMessage('');
    setSuccessMessage('');
  }

  function getPreviousSets(exerciseId: string): PreviousSetPreview[] | undefined {
    const previousExercise = records
      .flatMap((record) => record.exercises)
      .find((exercise) => exercise.exerciseId === exerciseId);
    if (!previousExercise) return undefined;

    return previousExercise.sets.map((set) => ({
      weightKg: set.weightKg ?? '',
      reps: set.reps ?? '',
    }));
  }

  async function saveRecord() {
    setSuccessMessage('');
    if (exercises.length === 0) {
      setErrorMessage('実施した種目を1つ以上追加してください。');
      return;
    }
    const duration = trainingMinutes ? Number(trainingMinutes) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) {
      setErrorMessage('トレーニング時間は1〜600分で入力してください。');
      return;
    }
    const invalidSet = exercises.some((exercise) => exercise.sets.some((set) => {
      const weight = set.weightKg ? Number(set.weightKg) : null;
      const reps = set.reps ? Number(set.reps) : null;
      return (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000))
        || (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 1000));
    }));
    if (invalidSet) {
      setErrorMessage('重量は0〜1000kg、回数は1〜1000回で入力してください。');
      return;
    }
    setErrorMessage('');
    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new ApiError('ログインを確認できませんでした。もう一度ログインしてください。', 401);
      }

      const response = await createTrainingRecord(token, {
        performedAt: new Date().toISOString(),
        durationMinutes: duration,
        conditionScore: condition,
        memo: memo.trim() || null,
        exercises: exercises.map((exercise, exerciseIndex) => ({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          bodyPart: exercise.category,
          bodyArea: null,
          displayOrder: exerciseIndex,
          sets: exercise.sets.map((set, setIndex) => ({
            setNumber: setIndex + 1,
            weightKg: set.weightKg ? Number(set.weightKg) : null,
            reps: set.reps ? Number(set.reps) : null,
          })),
        })),
      });

      addRecord({
        id: response.trainingSessionId,
        performedOn: trainingDate,
        menuId: draft?.menuId ?? null,
        exercises: exercises.map((exercise) => ({
          exerciseId: exercise.id,
          name: exercise.name,
          sets: exercise.sets.map((set) => ({
            weightKg: set.weightKg || null,
            reps: set.reps || null,
          })),
        })),
        trainingMinutes: duration,
        condition,
        memo: memo.trim() || null,
      });
      setSuccessMessage(`${response.message} カレンダーへ反映しました。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '記録の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
          <Text style={styles.lead}>今日取り組んだ種目を記録します。種目以外の項目は空欄でも保存できます。</Text>

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
              onUsePrevious={() => applyPreviousSets(index, getPreviousSets(exercise.id) ?? [])}
              previousSets={getPreviousSets(exercise.id)}
            />
          ))}

          <Pressable onPress={() => setPickerVisible(true)} style={styles.addButton}>
            <Text style={styles.addButtonIcon}>＋</Text>
            <Text style={styles.addButtonText}>種目を検索して追加</Text>
          </Pressable>

          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>トレーニング詳細</Text>
            <Text style={styles.fieldLabel}>トレーニング時間 <Text style={styles.optionalText}>任意</Text></Text>
            <View style={styles.timeInputWrap}>
              <TextInput
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(text) => setTrainingMinutes(text.replace(/\D/g, ''))}
                placeholder="60"
                placeholderTextColor="#556772"
                style={styles.timeInput}
                value={trainingMinutes}
              />
              <Text style={styles.timeUnit}>分</Text>
            </View>

            <Text style={styles.conditionLabel}>今日の調子 <Text style={styles.optionalText}>任意</Text> <Text style={styles.conditionValue}>{condition ?? '—'} / 10</Text></Text>
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
              maxLength={500}
              onChangeText={setMemo}
              placeholder="フォーム、疲労、気づいたことなど"
              placeholderTextColor="#556772"
              style={styles.memoInput}
              textAlignVertical="top"
              value={memo}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable disabled={isSaving} onPress={saveRecord} style={[styles.saveButton, isSaving && styles.disabledButton]}>
            {isSaving ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.saveButtonText}>記録を保存</Text>}
          </Pressable>
          <Text style={styles.previewNote}>保存した記録は履歴とカレンダーへ反映されます。</Text>
        </ScrollView>
        </KeyboardAvoidingView>
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
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 5, color: '#F4F6F3', fontSize: 27, fontWeight: '700' },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#203441', borderRadius: 13, backgroundColor: '#0C151D' },
  dateLabel: { color: '#657681', fontSize: 7, fontWeight: '700', letterSpacing: 1.1 },
  dateValue: { marginTop: 3, color: '#DDE1DD', fontSize: 10, fontWeight: '600' },
  lead: { marginTop: 11, color: '#8798A3', fontSize: 12, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 11 },
  sectionTitle: { color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  exerciseCount: { color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  addButton: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 15 },
  addButtonIcon: { color: '#73E7FF', fontSize: 19, fontWeight: '700' },
  addButtonText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
  detailsCard: { marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' },
  cardTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  fieldLabel: { marginTop: 19, marginBottom: 8, color: '#AAB7BF', fontSize: 11, fontWeight: '600' },
  timeInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F' },
  timeInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '600' },
  timeUnit: { paddingRight: 13, color: '#72828D', fontSize: 11 },
  conditionLabel: { marginTop: 20, color: '#AAB7BF', fontSize: 11, fontWeight: '600' },
  conditionValue: { color: '#73E7FF' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  ratingButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 10, backgroundColor: '#050A0F' },
  selectedRating: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  ratingText: { color: '#8798A3', fontSize: 11, fontWeight: '700' },
  selectedRatingText: { color: '#050A0F' },
  optionalText: { color: '#657681', fontSize: 9 },
  memoInput: { minHeight: 100, padding: 13, borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F', color: '#F4F6F3', fontSize: 13, lineHeight: 20 },
  error: { marginTop: 13, color: '#FF7676', fontSize: 12, lineHeight: 18 },
  success: { marginTop: 13, color: '#73E7FF', fontSize: 12, lineHeight: 18 },
  saveButton: { minHeight: 55, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 15, backgroundColor: '#00D4FF' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { color: '#050A0F', fontSize: 15, fontWeight: '700' },
  previewNote: { marginTop: 12, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
