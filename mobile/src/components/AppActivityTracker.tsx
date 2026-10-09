import { useAuth } from '@clerk/expo';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { apiRequest, isApiBypassEnabled } from '@/lib/api';

// 起動・前面復帰・日付跨ぎを計測。失敗時はログインや通常操作を妨げない。
export function AppActivityTracker() {
  const { getToken, userId } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  useEffect(() => {
    if (!userId || isApiBypassEnabled) return;
    let recordedDay = ''; let busy = false; let disposed = false;
    const record = async () => {
      if (AppState.currentState !== 'active' || busy || disposed) return;
      const day = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
      if (day === recordedDay) return;
      busy = true;
      try {
        const token = await tokenRef.current();
        if (!token || disposed) return;
        await apiRequest('/api/activity', { method: 'POST', token });
        recordedDay = day;
      } catch { /* 初期化前・通信不良は次の周期で再試行。個人情報をログに出さない。 */ }
      finally { busy = false; }
    };
    void record();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void record(); });
    const timer = setInterval(() => void record(), 60_000);
    return () => { disposed = true; subscription.remove(); clearInterval(timer); };
  }, [userId]);
  return null;
}
