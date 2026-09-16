import {
  finishTransaction,
  type Purchase,
  useIAP,
} from 'expo-iap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { verifyAppleSubscription } from '@/lib/subscription';

type Props = {
  appAccountToken: string;
  productId: string;
  token: string;
  onVerified: () => Promise<void> | void;
};

export function SubscriptionPurchasePanel({ appAccountToken, productId, token, onVerified }: Props) {
  const processedTransactions = useRef(new Set<string>());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState('');

  const processPurchase = useCallback(async (purchase: Purchase) => {
    const transactionKey = purchase.id || purchase.purchaseToken || '';
    if (!purchase.purchaseToken || purchase.productId !== productId || processedTransactions.current.has(transactionKey)) return;
    processedTransactions.current.add(transactionKey);
    setIsProcessing(true);
    setMessage('Appleの購入情報を確認しています。');
    try {
      const result = await verifyAppleSubscription(token, purchase.purchaseToken);
      if (result.plan !== 'premium') throw new Error('有効な購入を確認できませんでした。');
      await finishTransaction({ purchase, isConsumable: false });
      await onVerified();
      setMessage('プレミアムプランを利用できるようになりました。');
    } catch (error) {
      processedTransactions.current.delete(transactionKey);
      setMessage(error instanceof Error ? error.message : '購入情報を確認できませんでした。');
    } finally {
      setIsProcessing(false);
      setIsRestoring(false);
    }
  }, [onVerified, productId, token]);

  const { connected, subscriptions, availablePurchases, fetchProducts, getAvailablePurchases, requestPurchase } = useIAP({
    onPurchaseSuccess: (purchase) => { void processPurchase(purchase); },
    onPurchaseError: (error) => {
      setIsProcessing(false);
      setMessage(error.message || '購入を完了できませんでした。');
    },
    onError: (error) => setMessage(error.message || 'App Storeへ接続できませんでした。'),
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [productId], type: 'subs' });
  }, [connected, fetchProducts, productId]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      for (const purchase of availablePurchases) void processPurchase(purchase);
    }, 0);
    return () => clearTimeout(timerId);
  }, [availablePurchases, processPurchase]);

  const product = subscriptions.find((item) => item.id === productId);

  async function purchase() {
    if (!connected || isProcessing) return;
    setIsProcessing(true);
    setMessage('App Storeを開いています。');
    try {
      await requestPurchase({
        request: {
          apple: { sku: productId, appAccountToken },
        },
        type: 'subs',
      });
    } catch (error) {
      setIsProcessing(false);
      setMessage(error instanceof Error ? error.message : '購入を開始できませんでした。');
    }
  }

  async function restore() {
    if (!connected || isRestoring) return;
    setIsRestoring(true);
    setMessage('過去の購入を確認しています。');
    try {
      await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      setMessage('購入履歴の確認が完了しました。');
      setIsRestoring(false);
    } catch (error) {
      setIsRestoring(false);
      setMessage(error instanceof Error ? error.message : '購入を復元できませんでした。');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{product?.displayPrice ? `${product.displayPrice}／月` : '月額1,000円'}</Text>
      <Text style={styles.note}>{connected ? 'App Storeに接続済みです。' : 'App Storeへ接続しています。'}</Text>
      <Pressable accessibilityRole="button" disabled={!connected || isProcessing || isRestoring} onPress={() => { void purchase(); }} style={[styles.primary, (!connected || isProcessing || isRestoring) && styles.disabled]}>
        {isProcessing ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.primaryText}>月額プランを購入する</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" disabled={!connected || isProcessing || isRestoring} onPress={() => { void restore(); }} style={[styles.secondary, (!connected || isProcessing || isRestoring) && styles.disabled]}>
        {isRestoring ? <ActivityIndicator color="#73E7FF" /> : <Text style={styles.secondaryText}>購入を復元する</Text>}
      </Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 17, borderWidth: 1, borderColor: '#1E6076', borderRadius: 15, backgroundColor: '#081821' },
  title: { color: '#00D4FF', fontSize: 20, fontWeight: '800' },
  note: { marginTop: 7, color: '#80929C', fontSize: 10 },
  primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 14, backgroundColor: '#00D4FF' },
  primaryText: { color: '#050A0F', fontSize: 13, fontWeight: '800' },
  secondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  secondaryText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  message: { marginTop: 12, color: '#A7B5BD', fontSize: 11, lineHeight: 18 },
});
