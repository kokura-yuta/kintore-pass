import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  note: string;
  value: string;
};

export function AnalysisMetricCard({ label, note, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    minHeight: 122,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 14,
    backgroundColor: '#151816',
  },
  label: { color: '#7F8881', fontSize: 10, fontWeight: '700' },
  value: { marginTop: 10, color: '#B6F24B', fontSize: 20, fontWeight: '900' },
  note: { marginTop: 8, color: '#737B75', fontSize: 9, lineHeight: 14 },
});
