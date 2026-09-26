import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Metroは実行端末に合わせて.native.tsxまたは.web.tsxを選択します。
import { SubscriptionPurchasePanel } from '@/components/SubscriptionPurchasePanel';
import { fetchSubscriptionStatus, type SubscriptionStatus, updateTrialChoice } from '@/lib/subscription';

const appleProductId = process.env.EXPO_PUBLIC_APPLE_PREMIUM_PRODUCT_ID?.trim() ?? '';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const getTokenRef = useRef(getToken);
  const [token, setToken] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState('');
  const [isUpdatingTrial, setIsUpdatingTrial] = useState(false);

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

  const chooseTrial = useCallback(async (action: 'start' | 'skip') => {
    if (!token || isUpdatingTrial) return;
    setError('');
    setIsUpdatingTrial(true);
    try {
      await updateTrialChoice(token, action);
      if (onboarding === '1') {
        router.replace('/bootstrap');
        return;
      }
      await loadSubscription();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'プランを変更できませんでした。');
    } finally {
      setIsUpdatingTrial(false);
    }
  }, [isUpdatingTrial, loadSubscription, onboarding, router, token]);

  useEffect(() => {
    const timerId = setTimeout(() => { void loadSubscription(); }, 0);
    return () => clearTimeout(timerId);
  }, [loadSubscription]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PREMIUM PLAN</Text>
        <Text style={styles.title}>筋トレPAS プレミアム</Text>
        <Text style={styles.price}>月額 1,000円</Text>
        <Text style={styles.description}>記録機能はずっと無料。AIコーチを使いたい場合だけPremiumを選べます。</Text>
        <Text style={styles.renewalNote}>1か月ごとに自動更新されます。解約はiPhoneのサブスクリプション管理からいつでも行えます。</Text>

        <View style={styles.card}>
          <Text style={styles.item}>・AIチャットを1日30回まで</Text>
          <Text style={styles.item}>・AIメニュー生成を1日3回まで</Text>
          <Text style={styles.item}>・身体分析を毎月4回まで</Text>
          <Text style={styles.item}>・AIを使った食事・カロリー分析</Text>
          <Text style={styles.item}>・保存データを使ったホームとAIアドバイス</Text>
          <Text style={styles.note}>7日間の無料体験後に自動課金はされません。継続する場合だけ、この画面から契約します。</Text>
        </View>

        {subscription?.trial.eligibleToStart ? (
          <View style={styles.choiceCard}>
            <Text style={styles.activeTitle}>利用方法を選んでください</Text>
            <Text style={styles.preparationText}>無料体験は任意で、開始しても7日後に自動課金されません。</Text>
            <Pressable accessibilityRole="button" disabled={isUpdatingTrial} onPress={() => { void chooseTrial('start'); }} style={styles.trialButton}>
              {isUpdatingTrial ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.trialButtonText}>7日間無料でPremiumを試す</Text>}
            </Pressable>
            {onboarding === '1' ? (
              <Pressable accessibilityRole="button" disabled={isUpdatingTrial} onPress={() => { void chooseTrial('skip'); }} style={styles.freeButton}>
                <Text style={styles.backText}>無料プランで始める</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {subscription?.plan === 'premium' ? (
          <View style={styles.activeCard}><Text style={styles.activeTitle}>プレミアムプラン利用中</Text><Text style={styles.preparationText}>有効期限：{subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ja-JP') : '確認中'}</Text></View>
        ) : subscription?.accessLevel === 'trial' && subscription.trial.endsAt ? (
          <View style={styles.activeCard}><Text style={styles.activeTitle}>7日間の無料体験中</Text><Text style={styles.preparationText}>体験終了日：{new Date(subscription.trial.endsAt).toLocaleDateString('ja-JP')}</Text><Text style={styles.preparationText}>終了後はFreeへ戻り、自動課金はされません。記録データはそのまま残ります。</Text></View>
        ) : subscription?.trial.eligibleToStart ? null : token && subscription && appleProductId ? (
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
  choiceCard: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 15, backgroundColor: '#081821' },
  trialButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 14, backgroundColor: '#00D4FF' },
  trialButtonText: { color: '#050A0F', fontSize: 13, fontWeight: '800' },
  freeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  retryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 12 },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
  legalText: { color: '#73E7FF', fontSize: 11, textDecorationLine: 'underline' },
  legalSeparator: { color: '#657681', fontSize: 11 },
  backButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  backText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
});
