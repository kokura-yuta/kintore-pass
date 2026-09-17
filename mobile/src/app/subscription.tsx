import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Metroは実行端末に合わせて.native.tsxまたは.web.tsxを選択します。
import { SubscriptionPurchasePanel } from '@/components/SubscriptionPurchasePanel';
import { fetchSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';

const appleProductId = process.env.EXPO_PUBLIC_APPLE_PREMIUM_PRODUCT_ID?.trim() ?? '';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const getTokenRef = useRef(getToken);
  const [token, setToken] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const loadSubscription = useCallback(async () => {
    setError('');
    try {
      const nextToken = await getTokenRef.current();
      if (!nextToken) throw new Error('ログイン状態を確認できませんでした。');
      const result = await fetchSubscriptionStatus(nextToken);
      setToken(nextToken);
      setSubscription(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'プラン情報を取得できませんでした。');
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => { void loadSubscription(); }, 0);
    return () => clearTimeout(timerId);
  }, [loadSubscription]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PREMIUM PLAN</Text>
        <Text style={styles.title}>食事管理＋身体分析</Text>
        <Text style={styles.price}>月額 1,000円</Text>
        <Text style={styles.description}>毎日の食事記録と、身体の変化を継続して確認するためのプランです。</Text>
        <Text style={styles.renewalNote}>1か月ごとに自動更新されます。解約はiPhoneのサブスクリプション管理からいつでも行えます。</Text>

        <View style={styles.card}>
          <Text style={styles.item}>・食事の追加、編集、削除、日付別履歴</Text>
          <Text style={styles.item}>・カロリーとPFCの管理</Text>
          <Text style={styles.item}>・よく食べるもの、食事コピー</Text>
          <Text style={styles.item}>・身体分析を毎月4回まで</Text>
          <Text style={styles.note}>身体分析は初回設定時の1回だけ無料です。</Text>
        </View>

        {subscription?.plan === 'premium' ? (
          <View style={styles.activeCard}><Text style={styles.activeTitle}>プレミアムプラン利用中</Text><Text style={styles.preparationText}>有効期限：{subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ja-JP') : '確認中'}</Text></View>
        ) : token && subscription && appleProductId ? (
          <SubscriptionPurchasePanel appAccountToken={subscription.appAccountToken} onVerified={loadSubscription} productId={appleProductId} token={token} />
        ) : error ? (
          <View style={styles.preparationCard}><Text style={styles.preparationTitle}>プラン情報を読み込めませんでした</Text><Text style={styles.preparationText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { void loadSubscription(); }} style={styles.retryButton}><Text style={styles.backText}>もう一度試す</Text></Pressable></View>
        ) : !appleProductId ? (
          <View style={styles.preparationCard}><Text style={styles.preparationTitle}>App Storeの商品設定待ちです</Text><Text style={styles.preparationText}>商品IDを設定すると、この画面から購入・復元できるようになります。</Text></View>
        ) : (
          <View style={styles.preparationCard}><ActivityIndicator color="#00D4FF" /><Text style={styles.preparationText}>プラン情報を確認しています。</Text></View>
        )}

        <View style={styles.legalRow}>
          <Pressable accessibilityRole="link" onPress={() => router.push('/terms' as Href)}><Text style={styles.legalText}>利用規約</Text></Pressable>
          <Text style={styles.legalSeparator}>・</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/privacy' as Href)}><Text style={styles.legalText}>プライバシーポリシー</Text></Pressable>
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
  renewalNote: { marginTop: 8, color: '#80929C', fontSize: 10, lineHeight: 17 },
  card: { marginTop: 24, padding: 19, gap: 13, borderWidth: 1, borderColor: '#1E6076', borderRadius: 18, backgroundColor: '#081821' },
  item: { color: '#E9F1F4', fontSize: 13, lineHeight: 21 },
  note: { marginTop: 4, color: '#80929C', fontSize: 10, lineHeight: 17 },
  preparationCard: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#294653', borderRadius: 15, backgroundColor: '#0A1219' },
  preparationTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  preparationText: { marginTop: 8, color: '#80929C', fontSize: 11, lineHeight: 18 },
  activeCard: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 15, backgroundColor: '#081821' },
  activeTitle: { color: '#73E7FF', fontSize: 15, fontWeight: '800' },
  retryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 12 },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
  legalText: { color: '#73E7FF', fontSize: 11, textDecorationLine: 'underline' },
  legalSeparator: { color: '#657681', fontSize: 11 },
  backButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  backText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
});
