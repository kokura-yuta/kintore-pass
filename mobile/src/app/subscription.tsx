import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PREMIUM PLAN</Text>
        <Text style={styles.title}>食事管理＋身体分析</Text>
        <Text style={styles.price}>月額 1,000円</Text>
        <Text style={styles.description}>毎日の食事記録と、身体の変化を継続して確認するためのプランです。</Text>

        <View style={styles.card}>
          <Text style={styles.item}>・食事の追加、編集、削除、日付別履歴</Text>
          <Text style={styles.item}>・カロリーとPFCの管理</Text>
          <Text style={styles.item}>・よく食べるもの、食事コピー</Text>
          <Text style={styles.item}>・身体分析を契約更新日ごとに4回</Text>
          <Text style={styles.note}>身体分析は初回設定時の1回だけ無料です。</Text>
        </View>

        <View style={styles.preparationCard}>
          <Text style={styles.preparationTitle}>購入機能は準備中です</Text>
          <Text style={styles.preparationText}>Appleの月額課金と購入復元を接続後、この画面から登録できるようになります。</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>戻る</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  content: { flexGrow: 1, padding: 22, paddingBottom: 40 },
  eyebrow: { marginTop: 18, color: '#73E7FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 29, fontWeight: '700' },
  price: { marginTop: 18, color: '#00D4FF', fontSize: 26, fontWeight: '800' },
  description: { marginTop: 12, color: '#A7B5BD', fontSize: 13, lineHeight: 22 },
  card: { marginTop: 24, padding: 19, gap: 13, borderWidth: 1, borderColor: '#1E6076', borderRadius: 18, backgroundColor: '#081821' },
  item: { color: '#E9F1F4', fontSize: 13, lineHeight: 21 },
  note: { marginTop: 4, color: '#80929C', fontSize: 10, lineHeight: 17 },
  preparationCard: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#294653', borderRadius: 15, backgroundColor: '#0A1219' },
  preparationTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  preparationText: { marginTop: 8, color: '#80929C', fontSize: 11, lineHeight: 18 },
  backButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  backText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
});
