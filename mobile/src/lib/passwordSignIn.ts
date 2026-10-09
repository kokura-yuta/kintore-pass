type Result = { error: unknown | null };
type PasswordSignIn = {
  status: string | null;
  password: (params: { emailAddress: string; password: string }) => Promise<Result>;
  finalize: () => Promise<Result>;
  mfa: { sendEmailCode: () => Promise<Result> };
};

// 未完了の認証をセッションとして確定しない。Device Trustも迂回しない。
export async function loginWithPassword(
  signIn: PasswordSignIn, emailAddress: string, password: string,
): Promise<'complete' | 'verify-device'> {
  if (!/^\S+@\S+\.\S+$/.test(emailAddress) || !password) {
    throw new Error('メールアドレスとパスワードを入力してください。');
  }
  const result = await signIn.password({ emailAddress, password });
  if (result.error) throw result.error;
  if (signIn.status === 'needs_client_trust') {
    const verification = await signIn.mfa.sendEmailCode();
    if (verification.error) throw verification.error;
    return 'verify-device';
  }
  if (signIn.status !== 'complete') {
    throw new Error('追加の本人確認が必要です。メールコードでログインするか、アカウントの認証設定を確認してください。');
  }
  const finalized = await signIn.finalize();
  if (finalized.error) throw finalized.error;
  return 'complete';
}
