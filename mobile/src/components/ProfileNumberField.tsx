import { StyleSheet, Text, TextInput, View } from 'react-native';

import { sanitizeDecimalInput } from '@/lib/numberInput';

type Props = {
  error?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  required?: boolean;
  unit: string;
  value: string;
};

export function ProfileNumberField({
  error,
  label,
  onChangeText,
  placeholder,
  required = false,
  unit,
  value,
}: Props) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={required ? styles.required : styles.optional}>{required ? '必須' : '任意'}</Text>
      </View>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={(text) => onChangeText(sanitizeDecimalInput(text))}
          placeholder={placeholder}
          placeholderTextColor="#657681"
          style={styles.input}
          value={value}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 130 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  label: { color: '#E8EBE8', fontSize: 13, fontWeight: '600' },
  required: { color: '#73E7FF', fontSize: 10, fontWeight: '700' },
  optional: { color: '#72828D', fontSize: 10, fontWeight: '600' },
  inputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#294653',
    borderRadius: 13,
    backgroundColor: '#050A0F',
  },
  inputError: { borderColor: '#FF7676' },
  input: { flex: 1, paddingHorizontal: 14, color: '#F4F6F3', fontSize: 16 },
  unit: { paddingRight: 14, color: '#8B9CA6', fontSize: 12, fontWeight: '700' },
  error: { marginTop: 6, color: '#FF7676', fontSize: 11, lineHeight: 16 },
});
