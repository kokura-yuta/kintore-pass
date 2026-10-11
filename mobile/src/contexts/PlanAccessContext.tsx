import { useAuth } from '@clerk/expo';
import { usePathname } from 'expo-router';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isApiBypassEnabled } from '@/lib/api';
import { createRequestGate } from '@/lib/requestGate';
import { canAccessPaidScreen } from '@/lib/planPresentation';
import { fetchSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';

type State = { data: SubscriptionStatus | null; error: string };
const PlanAccessContext = createContext<(State & { refresh: () => void }) | null>(null);

// Inside userId-keyed providers: verified state never crosses accounts.
// Every route change, resume and expiry still rechecks the server.
export function PlanAccessProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded, userId } = useAuth({ treatPendingAsSignedOut: false });
  const pathname = usePathname();
  const tokenRef = useRef(getToken);
  const [gate] = useState(createRequestGate);
  const [state, setState] = useState<State>({ data: null, error: '' });
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const refresh = useCallback(function recheck() {
    if (isApiBypassEnabled || !isLoaded || !userId) return;
    // Expired paid access closes before the refresh response arrives.
    setState(current => current.data && current.data.accessLevel !== 'free' && !canAccessPaidScreen(current.data)
      ? { data: null, error: '' } : current);
    void gate.run(async () => {
      const token = await tokenRef.current();
      if (!token) throw new Error('ログイン状態を確認してください。');
      return fetchSubscriptionStatus(token);
    }, data => {
      clearTimeout(expiryTimer.current);
      setState({ data, error: '' });
      const end = data.accessLevel === 'trial' ? data.trial.endsAt : data.expiresAt;
      const remaining = end ? Date.parse(end) - Date.now() : NaN;
      if (remaining > 0) expiryTimer.current = setTimeout(recheck, Math.min(remaining + 100, 2147483647));
    }, error => {
      clearTimeout(expiryTimer.current);
      // A failure closes paid access for every consumer, not only one screen.
      setState({ data: null, error: error instanceof Error ? error.message : 'プランを確認できませんでした。' });
    });
  }, [gate, isLoaded, userId]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [pathname, refresh]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', value => {
      if (value === 'active') refresh();
      // Invalidate late network results, but don't unmount an unexpired paid
      // form when the photo picker makes the application temporarily inactive.
      else gate.invalidate();
    });
    return () => { listener.remove(); gate.invalidate(); clearTimeout(expiryTimer.current); };
  }, [gate, refresh]);

  return <PlanAccessContext.Provider value={{ ...state, refresh }}>{children}</PlanAccessContext.Provider>;
}

export function useVerifiedPlan() {
  const value = useContext(PlanAccessContext);
  if (!value) throw new Error('useVerifiedPlan must be used inside PlanAccessProvider.');
  return value;
}
