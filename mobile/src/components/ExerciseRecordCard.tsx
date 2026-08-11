import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExerciseOption } from '@/lib/exerciseCatalog';

export type ExerciseRecord = ExerciseOption & {
  weightKg: string;
  reps: string;
  sets: string;
};

type NumericField = 'weightKg' | 'reps' | 'sets';

type Props = {
  exercise: ExerciseRecord;
  index: number;
  onChange: (field: NumericField, value: string) => void;
  onRemove: () => void;
};

export function ExerciseRecordCard({ exercise, index, onChange, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.numberBadge}>
          <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>{exercise.category} · {exercise.equipment}</Text>
        </View>
        <Pressable accessibilityLabel={`${exercise.name}を削除`} onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>削除</Text>
        </Pressable>
      </View>

      <View style={styles.fieldRow}>
        <RecordInput label="重量" onChangeText={(value) => onChange('weightKg', value)} unit="kg" value={exercise.weightKg} />
        <RecordInput label="回数" onChangeText={(value) => onChange('reps', value)} unit="回" value={exercise.reps} />
        <RecordInput label="セット" onChangeText={(value) => onChange('sets', value)} unit="set" value={exercise.sets} />
      </View>
    </View>
  );
}

function RecordInput({ label, onChangeText, unit, value }: { label: string; onChangeText: (value: string) => void; unit: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
  fieldRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  field: { flex: 1 },
  fieldLabel: { marginBottom: 6, color: '#858E87', fontSize: 9, fontWeight: '800' },
  inputWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#343A35', borderRadius: 11, backgroundColor: '#0B0D0C' },
  input: { flex: 1, minWidth: 0, paddingLeft: 10, color: '#F4F6F3', fontSize: 14, fontWeight: '800' },
  unit: { paddingRight: 8, color: '#697169', fontSize: 8, fontWeight: '800' },
});
