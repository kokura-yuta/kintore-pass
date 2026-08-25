import { useAuth, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import { Redirect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'email' | 'code';
type AuthMode = 'sign-in' | 'sign-up';
type SocialProvider = 'google' | 'apple';

WebBrowser.maybeCompleteAuthSession();

type ClerkErrorLike = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
  message?: string;
  longMessage?: string;
};

function getErrorCode(error: ClerkErrorLike) {
  return error.errors?.[0]?.code;
}

function getErrorMessage(error: ClerkErrorLike) {
  return (
    error.errors?.[0]?.longMessage ??
    error.errors?.[0]?.message ??
    error.longMessage ??
    error.message ??
    '認証に失敗しました。もう一度お試しください。'
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [step, setStep] = useState<Step>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const submissionLock = useRef(false);

  const isReady = isAuthLoaded && Boolean(signIn) && Boolean(signUp);

  useEffect(() => {
    if (resendWaitSeconds <= 0) return;
    const timerId = setInterval(() => {
      setResendWaitSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [resendWaitSeconds]);

  if (isAuthLoaded && isSignedIn) {
    return <Redirect href="/bootstrap" />;
  }

  async function sendCode() {
    // 認証機能が未準備または別の送信処理中なら二重実行しない
    if (!isReady || !signIn || !signUp || submissionLock.current) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setErrorMessage('正しいメールアドレスを入力してください。');
      return;
    }

    // Reactの画面更新より先にロックし、Enterとボタンの同時送信を防ぐ
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 前回途中で止まったClerkのログイン・登録状態を消して新しく始める
      await signIn.reset();
      await signUp.reset();

      // まず入力されたメールアドレスが登録済みユーザーか確認する
      const createResult = await signIn.create({ identifier: normalizedEmail });

      // 未登録なら新規登録用、登録済みならログイン用の認証コードを送る
      if (createResult.error) {
        if (getErrorCode(createResult.error) !== 'form_identifier_not_found') {
          throw createResult.error;
        }

        const signUpResult = await signUp.create({ emailAddress: normalizedEmail });
        if (signUpResult.error) throw signUpResult.error;

        const sendSignUpCodeResult = await signUp.verifications.sendEmailCode();
        if (sendSignUpCodeResult.error) throw sendSignUpCodeResult.error;
        setAuthMode('sign-up');
      } else {
        const sendSignInCodeResult = await signIn.emailCode.sendCode();
        if (sendSignInCodeResult.error) throw sendSignInCodeResult.error;
        setAuthMode('sign-in');
      }

      setEmail(normalizedEmail);
      setStep('code');
      setResendWaitSeconds(30);
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  async function signInWithSocial(provider: SocialProvider) {
    if (!isReady || submissionLock.current) return;

    submissionLock.current = true;
    setSocialProvider(provider);
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await startSSOFlow({
        strategy: provider === 'google' ? 'oauth_google' : 'oauth_apple',
        redirectUrl: Platform.OS === 'web'
          ? undefined
          : AuthSession.makeRedirectUri({ scheme: 'kintorepas', path: 'oauth-callback' }),
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace('/bootstrap');
        return;
      }

      const resultType = result.authSessionResult?.type;
      if (resultType !== 'cancel' && resultType !== 'dismiss') {
        setErrorMessage('ログインを完了できませんでした。Clerkのログイン設定を確認してください。');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      submissionLock.current = false;
      setSocialProvider(null);
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (!isReady || !signIn || !signUp || submissionLock.current || resendWaitSeconds > 0) return;

    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (authMode === 'sign-up') {
        const result = await signUp.verifications.sendEmailCode();
        if (result.error) throw result.error;
      } else {
        const result = await signIn.emailCode.sendCode();
        if (result.error) throw result.error;
      }
      setCode('');
      setResendWaitSeconds(30);
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  async function verifyCode() {
    // 認証機能が未準備または確認処理中ならコードを二重送信しない
    if (!isReady || !signIn || !signUp || submissionLock.current) return;

    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
      setErrorMessage('6桁の認証コードを入力してください。');
      return;
    }

    // コード確認を即座にロックして使用済みコードの再送信を防ぐ
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 新規登録ではsignUp側でコードを確認し、ユーザーとセッションを作成する
      if (authMode === 'sign-up') {
        const verifyResult = await signUp.verifications.verifyEmailCode({
          code: normalizedCode,
        });
        if (verifyResult.error) throw verifyResult.error;

        if (signUp.status !== 'complete' || !signUp.createdSessionId) {
          throw new Error('新規登録を完了できませんでした。もう一度お試しください。');
        }

        const finalizeResult = await signUp.finalize();
        if (finalizeResult.error) throw finalizeResult.error;
      } else {
        // 登録済みユーザーではsignIn側でコードを確認してセッションを作成する
        const verifyResult = await signIn.emailCode.verifyCode({ code: normalizedCode });
        if (verifyResult.error) throw verifyResult.error;

        if (signIn.status !== 'complete') {
          throw new Error('ログインを完了できませんでした。もう一度お試しください。');
        }

        // 確認済みログインを有効なClerkセッションとして確定する
        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error) throw finalizeResult.error;
      }

      router.replace('/bootstrap');
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  async function changeEmail() {
    if (!signIn || !signUp || submissionLock.current) return;

    submissionLock.current = true;
    setIsSubmitting(true);
    setStep('email');
    setCode('');
    setErrorMessage('');

    try {
      // メール入力へ戻る前に現在のClerk認証状態を完全に消す
      await signIn.reset();
      await signUp.reset();
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.eyebrow}>MUSCLE PAS</Text>
          <Text style={styles.title}>{step === 'email' ? 'ログイン' : '認証コード'}</Text>
          <Text style={styles.description}>
            {step === 'email'
              ? 'メールアドレスを入力すると、ログイン用の認証コードを送ります。'
              : `${email} に届いた6桁のコードを入力してください。`}
          </Text>

          <View style={styles.form}>
            {step === 'email' ? (
              <>
                <Pressable
                  disabled={!isReady || isSubmitting}
                  onPress={() => signInWithSocial('apple')}
                  style={[styles.socialButton, styles.appleButton, (!isReady || isSubmitting) && styles.disabledButton]}
                >
                  {socialProvider === 'apple' ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.appleButtonText}>Appleで続ける</Text>}
                </Pressable>
                <Pressable
                  disabled={!isReady || isSubmitting}
                  onPress={() => signInWithSocial('google')}
                  style={[styles.socialButton, styles.googleButton, (!isReady || isSubmitting) && styles.disabledButton]}
                >
                  {socialProvider === 'google' ? <ActivityIndicator color="#F4F6F3" /> : <Text style={styles.googleButtonText}>Googleで続ける</Text>}
                </Pressable>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>またはメール</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            ) : null}
            {step === 'email' ? (
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                editable={!isSubmitting}
                inputMode="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                onSubmitEditing={sendCode}
                placeholder="example@email.com"
                placeholderTextColor="#697169"
                returnKeyType="send"
                style={styles.input}
                value={email}
              />
            ) : (
              <TextInput
                autoComplete="one-time-code"
                editable={!isSubmitting}
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                onSubmitEditing={verifyCode}
                placeholder="000000"
                placeholderTextColor="#697169"
                style={[styles.input, styles.codeInput]}
                textContentType="oneTimeCode"
                value={code}
              />
            )}

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            {Platform.OS === 'web' ? (
              <View
                accessibilityLabel="不正登録防止の確認"
                nativeID="clerk-captcha"
                style={styles.captcha}
              />
            ) : null}

            <Pressable
              disabled={!isReady || isSubmitting}
              onPress={step === 'email' ? sendCode : verifyCode}
              style={({ pressed }) => [
                styles.primaryButton,
                (!isReady || isSubmitting) && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 'email' ? '認証コードを送る' : 'ログインする'}
                </Text>
              )}
            </Pressable>

            {step === 'code' ? (
              <View style={styles.codeActions}>
                <Pressable
                  disabled={isSubmitting || resendWaitSeconds > 0}
                  onPress={resendCode}
                  style={styles.textButton}
                >
                  <Text style={[styles.textButtonLabel, resendWaitSeconds > 0 && styles.disabledText]}>
                    {resendWaitSeconds > 0 ? `認証コードを再送（${resendWaitSeconds}秒）` : '認証コードを再送'}
                  </Text>
                </Pressable>
                <Pressable disabled={isSubmitting} onPress={changeEmail} style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>メールアドレスを変更</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

            <Text style={styles.note}>初めての方は認証後にアカウントが作成されます。</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.8 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 38, fontWeight: '700' },
  description: { marginTop: 12, color: '#A5ADA7', fontSize: 14, lineHeight: 22 },
  form: { marginTop: 30 },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 14,
    backgroundColor: '#151515',
    color: '#F4F6F3',
    fontSize: 16,
  },
  socialButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderRadius: 14 },
  appleButton: { backgroundColor: '#F4F6F3' },
  appleButtonText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' },
  googleButton: { borderWidth: 1, borderColor: '#3A3A3A', backgroundColor: '#151515' },
  googleButtonText: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#303030' },
  dividerText: { color: '#697169', fontSize: 10 },
  codeInput: { fontSize: 25, fontWeight: '600', letterSpacing: 8, textAlign: 'center' },
  error: { marginTop: 12, color: '#FF7676', fontSize: 13, lineHeight: 19 },
  captcha: { minHeight: 1, marginTop: 8 },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#F6D365',
  },
  disabledButton: { opacity: 0.45 },
  pressedButton: { opacity: 0.8 },
  primaryButtonText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  textButton: { alignItems: 'center', paddingVertical: 16 },
  textButtonLabel: { color: '#FFF1B8', fontSize: 14, fontWeight: '700' },
  codeActions: { marginTop: 2 },
  disabledText: { color: '#697169' },
  note: { marginTop: 24, color: '#697169', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
