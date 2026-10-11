import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isApiBypassEnabled, isScreenshotMode } from '@/lib/api';

export default function AuthGateScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  // 撮影用サンプルは認証サーバーへの接続を待たない。本番では必ずfalse。
  if (isScreenshotMode) return <Redirect href="/bootstrap" />;

  if (!isLoaded) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text style={styles.message}>ログイン状態を確認しています…</Text>
      </View>
    );
  }

  // API未接続中の画面開発では、未ログインでも開発用の入口を表示する。
  return <Redirect href={isSignedIn || isApiBypassEnabled ? '/bootstrap' : '/sign-in'} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: '#050A0F',
  },
  message: { color: '#99AAB4', fontSize: 13 },
});
