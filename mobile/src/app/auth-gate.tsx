import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BrandSplash } from '@/components/BrandSplash';

import { isApiBypassEnabled, isScreenshotMode } from '@/lib/api';

export default function AuthGateScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const router = useRouter();
  useEffect(() => {
    // Keep the brand rendered until the next route actually replaces it.
    // A Redirect renders null while navigation is pending.
    if (!isLoaded && !isScreenshotMode) return;
    router.replace(isScreenshotMode || isSignedIn || isApiBypassEnabled ? '/bootstrap' : '/sign-in');
  }, [isLoaded, isSignedIn, router]);
  return <BrandSplash />;
}
