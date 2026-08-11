import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExerciseOption } from '@/lib/exerciseCatalog';
import type { PreviousSetPreview } from '@/lib/previousRecordPreview';

export type SetRecord = {
  id: string;
  weightKg: string;
  reps: string;
};

export type ExerciseRecord = ExerciseOption & {
  sets: SetRecord[];
};

type Props = {
  exercise: ExerciseRecord;
  index: number;
  onAddSet: () => void;
  onChangeSet: (setId: string, field: 'weightKg' | 'reps', value: string) => void;
  onRemove: () => void;
  onRemoveSet: (setId: string) => void;
  onUsePrevious: () => void;
  previousSets?: PreviousSetPreview[];
};

export function ExerciseRecordCard({ exercise, index, onAddSet, onChangeSet, onRemove, onRemoveSet, onUsePrevious, previousSets }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.numberBadge}>
          <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>{exercise.category} ・ {exercise.equipment}</Text>
        </View>
        <Pressable accessibilityLabel={`${exercise.name}を削除`} onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>削除</Text>
        </Pressable>
      </View>

      {previousSets?.length ? (
        <View style={styles.previousBox}>
          <View style={styles.previousCopy}>
            <Text style={styles.previousLabel}>前回</Text>
            <Text numberOfLines={1} style={styles.previousValue}>
              {previousSets.map((set) => `${set.weightKg || '—'}kg × ${set.reps || '—'}回`).join(' / ')}
            </Text>
          </View>
          <Pressable onPress={onUsePrevious} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>前回をコピー</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.columnLabels}>
        <Text style={[styles.columnLabel, styles.setColumn]}>SET</Text>
        <Text style={styles.columnLabel}>重量（任意）</Text>
        <Text style={styles.columnLabel}>回数（任意）</Text>
        <View style={styles.deleteColumn} />
      </View>

      {exercise.sets.map((set, setIndex) => (
        <View key={set.id} style={styles.setRow}>
          <View style={styles.setColumn}>
            <Text style={styles.setNumber}>{setIndex + 1}</Text>
          </View>
          <RecordInput onChangeText={(value) => onChangeSet(set.id, 'weightKg', value)} unit="kg" value={set.weightKg} />
          <RecordInput onChangeText={(value) => onChangeSet(set.id, 'reps', value)} unit="回" value={set.reps} />
          <Pressable
            accessibilityLabel={`${setIndex + 1}セット目を削除`}
            disabled={exercise.sets.length === 1}
            onPress={() => onRemoveSet(set.id)}
            style={[styles.deleteSetButton, exercise.sets.length === 1 && styles.disabledDelete]}
          >
            <Text style={styles.deleteSetText}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={onAddSet} style={styles.addSetButton}>
        <Text style={styles.addSetText}>＋ セットを追加</Text>
      </Pressable>
    </View>
  );
}

function RecordInput({ onChangeText, unit, value }: { onChangeText: (value: string) => void; unit: string; value: string }) {
  return (
    <View style={styles.inputWrap}>
      <TextInput
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={(text) => onChangeText(text.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        placeholderTextColor="#59605A"
        style={styles.input}
        value={value}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, padding: 15, borderWidth: 1, borderColor: '#2C312D', borderRadius: 17, backgroundColor: '#151816' },
  heading: { flexDirection: 'row', alignItems: 'center' },
  numberBadge: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#252B25' },
  number: { color: '#B6F24B', fontSize: 9, fontWeight: '900' },
  headingCopy: { flex: 1, marginLeft: 10 },
  name: { color: '#F4F6F3', fontSize: 14, fontWeight: '900' },
  meta: { marginTop: 3, color: '#737B75', fontSize: 10 },
  removeButton: { paddingHorizontal: 7, paddingVertical: 8 },
  removeText: { color: '#FF8D98', fontSize: 11, fontWeight: '800' },
  previousBox: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, padding: 10, borderRadius: 11, backgroundColor: '#20251F' },
  previousCopy: { flex: 1 },
  previousLabel: { color: '#737B75', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  previousValue: { marginTop: 3, color: '#DDE1DD', fontSize: 10, fontWeight: '700' },
  copyButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#B6F24B', borderRadius: 9 },
  copyButtonText: { color: '#B6F24B', fontSize: 9, fontWeight: '900' },
  columnLabels: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 6 },
  columnLabel: { flex: 1, color: '#858E87', fontSize: 9, fontWeight: '800' },
  setColumn: { width: 30, flex: 0, textAlign: 'center' },
  deleteColumn: { width: 28 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setNumber: { color: '#B6F24B', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  inputWrap: { minHeight: 46, flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#343A35', borderRadius: 11, backgroundColor: '#0B0D0C' },
  input: { flex: 1, minWidth: 0, paddingLeft: 10, color: '#F4F6F3', fontSize: 14, fontWeight: '800' },
  unit: { paddingRight: 8, color: '#697169', fontSize: 8, fontWeight: '800' },
  deleteSetButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteSetText: { color: '#FF8D98', fontSize: 18, fontWeight: '500' },
  disabledDelete: { opacity: 0.2 },
  addSetButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 5, borderWidth: 1, borderColor: '#343A35', borderRadius: 11 },
  addSetText: { color: '#B6F24B', fontSize: 11, fontWeight: '900' },
});
