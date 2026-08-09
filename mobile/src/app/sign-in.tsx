import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'email' | 'code';
type AuthMode = 'sign-in' | 'sign-up';

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
  const [step, setStep] = useState<Step>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (isAuthLoaded && isSignedIn) {
    return <Redirect href="/bootstrap" />;
  }

  const isReady = isAuthLoaded && Boolean(signIn) && Boolean(signUp);

  async function sendCode() {
    if (!isReady || !signIn || !signUp) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setErrorMessage('正しいメールアドレスを入力してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const createResult = await signIn.create({ identifier: normalizedEmail });

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
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!isReady || !signIn || !signUp) return;

    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
      setErrorMessage('6桁の認証コードを入力してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (authMode === 'sign-up') {
        const verifyResult = await signUp.verifications.verifyEmailCode({ code: normalizedCode });
        if (verifyResult.error) throw verifyResult.error;
        if (signUp.status !== 'complete') throw new Error('新規登録を完了できませんでした。');

        const finalizeResult = await signUp.finalize();
        if (finalizeResult.error) throw finalizeResult.error;
      } else {
        const verifyResult = await signIn.emailCode.verifyCode({ code: normalizedCode });
        if (verifyResult.error) {
          if (getErrorCode(verifyResult.error) !== 'sign_up_if_missing_transfer') {
            throw verifyResult.error;
          }

          const transferResult = await signUp.create({ transfer: true });
          if (transferResult.error) throw transferResult.error;

          const finalizeSignUpResult = await signUp.finalize();
          if (finalizeSignUpResult.error) throw finalizeSignUpResult.error;
        } else {
          if (signIn.status !== 'complete') {
            throw new Error('ログインを完了できませんでした。もう一度お試しください。');
          }

          const finalizeResult = await signIn.finalize();
          if (finalizeResult.error) throw finalizeResult.error;
        }
      }

      router.replace('/bootstrap');
    } catch (error) {
      setErrorMessage(getErrorMessage(error as ClerkErrorLike));
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeEmail() {
    setStep('email');
    setAuthMode('sign-in');
    setCode('');
    setErrorMessage('');
    void signIn?.reset();
    void signUp?.reset();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}
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
                <ActivityIndicator color="#0B0D0C" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 'email' ? '認証コードを送る' : 'ログインする'}
                </Text>
              )}
            </Pressable>

            {step === 'code' ? (
              <Pressable disabled={isSubmitting} onPress={changeEmail} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>メールアドレスを変更</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.note}>初めての方は認証後にアカウントが作成されます。</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 38, fontWeight: '900' },
  description: { marginTop: 12, color: '#A5ADA7', fontSize: 14, lineHeight: 22 },
  form: { marginTop: 30 },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#343A35',
    borderRadius: 14,
    backgroundColor: '#151816',
    color: '#F4F6F3',
    fontSize: 16,
  },
  codeInput: { fontSize: 25, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  error: { marginTop: 12, color: '#FF7676', fontSize: 13, lineHeight: 19 },
  captcha: { minHeight: 1, marginTop: 8 },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#B6F24B',
  },
  disabledButton: { opacity: 0.45 },
  pressedButton: { opacity: 0.8 },
  primaryButtonText: { color: '#0B0D0C', fontSize: 15, fontWeight: '900' },
  textButton: { alignItems: 'center', paddingVertical: 16 },
  textButtonLabel: { color: '#B6F24B', fontSize: 14, fontWeight: '700' },
  note: { marginTop: 24, color: '#697169', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
