import { useAuth, useClerk } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, isApiBypassEnabled } from '@/lib/api';
import { fetchBootstrap } from '@/lib/bootstrap';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { goalBodyTypeToSelection } from '@/lib/goals';
import {
  fetchUserProfile,
  userProfileToDraft,
} from '@/lib/profiles';

type Status = 'loading' | 'error' | 'onboarding-required';

export default function BootstrapScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth({ treatPendingAsSignedOut: false });
  const { signOut } = useClerk();
  const { setGoalBody, setProfile } =
    useOnboarding();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [canUseDevelopmentBypass, setCanUseDevelopmentBypass] = useState(false);

  const loadBootstrap = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      const token = await getToken();
      if (!token) {
        await signOut();
        router.replace('/sign-in');
        return;
      }

            // Neonに保存された進行状態に応じて、次に必要な画面へ移動する
      const data =
        await fetchBootstrap(token);

      // Neonの理想体型をReact Contextへ戻し、各画面で再表示できるようにする
      if (data.goalBodyType !== null) {
        const restoredGoal =
          goalBodyTypeToSelection(
            data.goalBodyType,
          );

        if (restoredGoal) {
          setGoalBody(restoredGoal);
        }
      }

      // 保存済みプロフィールを取得し、入力フォーム用の文字列へ戻す
      if (data.profileCompleted) {
        const profileResponse =
          await fetchUserProfile(token);

        if (profileResponse.profile) {
          setProfile(
            userProfileToDraft(
              profileResponse.profile,
            ),
          );
        }
      }

      // 初回設定全体が完了済みならホームへ移動する
      if (data.onboardingCompleted) {
        router.replace('/home');
        return;
      }

      // 理想体型が未設定なら理想体型選択画面へ移動する
      if (data.goalBodyType === null) {
        router.replace('/ideal-body');
        return;
      }

      // 身長・体重が未保存なら身体情報入力画面へ移動する
      if (!data.profileCompleted) {
        router.replace('/profile-setup');
        return;
      }

      // 理想体型と身体情報が保存済みなら初回分析画面へ移動する
      router.replace('/initial-analysis');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        router.replace('/sign-in');
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました。',
      );
      setCanUseDevelopmentBypass(
        isApiBypassEnabled,
      );
      setStatus('error');
    }
  }, [
    getToken,
    isLoaded,
    isSignedIn,
    router,
    setGoalBody,
    setProfile,
    signOut,
  ]);

  useEffect(() => {
    const timerId = setTimeout(() => void loadBootstrap(), 0);
    return () => clearTimeout(timerId);
  }, [loadBootstrap]);

  function retryBootstrap() {
    setStatus('loading');
    setErrorMessage('');
    setCanUseDevelopmentBypass(false);
    // 即座に同じエラーへ戻る場合でも、再試行したことが画面で分かるようにする。
    setTimeout(() => void loadBootstrap(), 350);
  }

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {status === 'loading' ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#F6D365" />
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
            {canUseDevelopmentBypass ? (
              <>
                <Pressable
                  onPress={() => router.replace('/ideal-body')}
                  style={styles.developmentButton}
                >
                  <Text style={styles.developmentButtonText}>開発用に初回設定へ進む</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace('/home')}
                  style={styles.developmentHomeButton}
                >
                  <Text style={styles.developmentHomeButtonText}>開発用にホームを確認する</Text>
                </Pressable>
                <Text style={styles.developmentNote}>
                  API接続先を設定した場合はExpoを再起動してから再試行してください。
                  開発中は初回設定またはホーム画面を直接確認できます。
                </Text>
              </>
            ) : null}
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
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  description: { marginTop: 14, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#F6D365',
  },
  primaryButtonText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  developmentButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F6D365',
    borderRadius: 14,
  },
  developmentButtonText: { color: '#FFF1B8', fontSize: 14, fontWeight: '700' },
  developmentHomeButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#242424',
  },
  developmentHomeButtonText: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  developmentNote: {
    marginTop: 12,
    color: '#697169',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
