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
    borderColor: '#203441',
    borderRadius: 14,
    backgroundColor: '#0C151D',
  },
  label: { color: '#7B8D98', fontSize: 10, fontWeight: '700' },
  value: { marginTop: 10, color: '#73E7FF', fontSize: 20, fontWeight: '700' },
  note: { marginTop: 8, color: '#72828D', fontSize: 9, lineHeight: 14 },
});
