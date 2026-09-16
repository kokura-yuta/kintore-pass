import { StyleSheet, Text, View } from 'react-native';

export function SubscriptionPurchasePanel() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>購入はiPhoneアプリから行います</Text>
      <Text style={styles.text}>App Store課金はWeb版とExpo Goでは利用できません。開発用アプリまたは配布版で購入・復元できます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#294653', borderRadius: 15, backgroundColor: '#0A1219' },
  title: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  text: { marginTop: 8, color: '#80929C', fontSize: 11, lineHeight: 18 },
});
