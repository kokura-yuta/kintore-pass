import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { BrandSplash } from '@/components/BrandSplash';

import { isApiBypassEnabled, isScreenshotMode } from '@/lib/api';

export default function AuthGateScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  // 撮影用サンプルは認証サーバーへの接続を待たない。本番では必ずfalse。
  if (isScreenshotMode) return <Redirect href="/bootstrap" />;

  if (!isLoaded) {
    return <BrandSplash />;
  }

  // API未接続中の画面開発では、未ログインでも開発用の入口を表示する。
  return <Redirect href={isSignedIn || isApiBypassEnabled ? '/bootstrap' : '/sign-in'} />;
}
