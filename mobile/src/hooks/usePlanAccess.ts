import { useAuth } from '@clerk/expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';
import { isApiBypassEnabled } from '@/lib/api';
import { canAccessPaidScreen } from '@/lib/planPresentation';

// A failed check never grants access. Recheck after purchase/restore, app resume and expiry.
export function usePlanAccess() {
  const { getToken, userId, isLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ owner: string | null | undefined; data: SubscriptionStatus | null; error: string }>({ owner: null, data: null, error: '' });
  useFocusEffect(useCallback(() => {
    // Changing this value explicitly restarts the focused check after an error.
    void retry;
    let active = true;
    let sequence = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      const request = ++sequence;
      clearTimeout(expiryTimer);
      // Keep an unexpired verified screen mounted during revalidation, so returning
      // from the photo picker does not discard selected photos or unsent text.
      setState((current) => ({ owner: userId, data: current.owner === userId && canAccessPaidScreen(current.data) ? current.data : null, error: '' }));
      if (isApiBypassEnabled || !isLoaded) return;
      try {
        const token = await tokenRef.current();
        if (!token) throw new Error('ログイン状態を確認してください。');
        const data = await fetchSubscriptionStatus(token);
        if (!active || request !== sequence) return;
        setState({ owner: userId, data, error: '' });
        const end = data.accessLevel === 'trial' ? data.trial.endsAt : data.expiresAt;
        const remaining = end ? Date.parse(end) - Date.now() : NaN;
        if (remaining > 0) expiryTimer = setTimeout(() => void check(), Math.min(remaining + 100, 2147483647));
      } catch (error) {
        if (active && request === sequence) setState({ owner: userId, data: null, error: error instanceof Error ? error.message : 'プランを確認できませんでした。' });
      }
    }
    void check();
    const listener = AppState.addEventListener('change', (value) => { if (value === 'active') void check(); });
    return () => { active = false; clearTimeout(expiryTimer); listener.remove(); };
  }, [userId, isLoaded, retry]));
  const data = state.owner === userId ? state.data : null;
  return { data, error: state.owner === userId ? state.error : '', allowed: isApiBypassEnabled || canAccessPaidScreen(data), refresh: () => setRetry((value) => value + 1) };
}
