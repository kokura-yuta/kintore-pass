import { useAuth, useClerk } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { fetchBootstrap } from '@/lib/bootstrap';

type Status = 'loading' | 'error' | 'onboarding-required';

export default function BootstrapScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth({ treatPendingAsSignedOut: false });
  const { signOut } = useClerk();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const loadBootstrap = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      const token = await getToken();
      if (!token) {
        await signOut();
        router.replace('/sign-in');
        return;
      }

      const data = await fetchBootstrap(token);
      if (data.onboardingCompleted) {
        router.replace('/home');
      } else {
        setStatus('onboarding-required');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        router.replace('/sign-in');
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました。',
      );
      setStatus('error');
    }
  }, [getToken, isLoaded, isSignedIn, router, signOut]);

  useEffect(() => {
    const timerId = setTimeout(() => void loadBootstrap(), 0);
    return () => clearTimeout(timerId);
  }, [loadBootstrap]);

  function retryBootstrap() {
    setStatus('loading');
    setErrorMessage('');
    void loadBootstrap();
  }

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {status === 'loading' ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#B6F24B" />
            <Text style={styles.description}>ユーザー情報を読み込んでいます…</Text>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={styles.centerContent}>
            <Text style={styles.eyebrow}>CONNECTION ERROR</Text>
            <Text style={styles.title}>読み込めませんでした</Text>
            <Text style={styles.description}>{errorMessage}</Text>
            <Pressable onPress={retryBootstrap} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>もう一度試す</Text>
            </Pressable>
          </View>
        ) : null}

        {status === 'onboarding-required' ? (
          <View style={styles.centerContent}>
            <Text style={styles.eyebrow}>FIRST SETUP</Text>
            <Text style={styles.title}>初回設定を始めます</Text>
            <Text style={styles.description}>
              理想体型と身体情報を入力して、あなた専用の設定を作ります。
            </Text>
            <Pressable onPress={() => router.replace('/ideal-body')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>初回設定を始める</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 32, fontWeight: '900' },
  description: { marginTop: 14, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#B6F24B',
  },
  primaryButtonText: { color: '#0B0D0C', fontSize: 15, fontWeight: '900' },
});
