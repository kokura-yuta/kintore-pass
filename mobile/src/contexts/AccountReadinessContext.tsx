import { useAuth } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { apiRequest, isApiBypassEnabled } from '@/lib/api';
import { fetchBodyAnalysisHistory, type BodyAnalysisHistoryItem } from '@/lib/bodyAnalyses';
import { createRequestGate } from '@/lib/requestGate';

export type FriendRelation = { id: string; name: string; status: 'pending' | 'accepted'; outgoing: boolean };
export type FriendSettings = { id: string; alias: string | null; emailSearchEnabled: boolean; shareTraining: boolean; socialSuspended?: boolean };
type FriendsSnapshot = { settings: FriendSettings; relations: FriendRelation[]; blocked?: { id: string }[] };
type State = { friends: FriendsSnapshot | null; analyses: BodyAnalysisHistoryItem[] | null; friendError: string; analysisError: string };
type Value = State & { refreshFriends: () => Promise<void>; refreshAnalyses: () => Promise<void>; invalidateFriends: () => void };
const Context = createContext<Value | null>(null);

// Memory only, below the userId key. This is the owner's list/history, never
// cached permission to read somebody else's training or sensitive photos.
export function AccountReadinessProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded, userId } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  const [friendGate] = useState(createRequestGate);
  const [analysisGate] = useState(createRequestGate);
  const [state, setState] = useState<State>({ friends: null, analyses: null, friendError: '', analysisError: '' });
  const refreshFriends = useCallback(async () => {
    if (isApiBypassEnabled || !isLoaded || !userId) return;
    await friendGate.run(async () => {
      const token = await tokenRef.current();
      if (!token) throw new Error('ログインしてください。');
      return apiRequest<FriendsSnapshot>('/api/friends', { token, method: 'GET' });
    }, friends => setState(current => ({ ...current, friends, friendError: '' })),
    error => setState(current => ({ ...current, friends: null, friendError: error instanceof Error ? error.message : '友達を読み込めませんでした。' })));
  }, [friendGate, isLoaded, userId]);
  const refreshAnalyses = useCallback(async () => {
    if (isApiBypassEnabled || !isLoaded || !userId) return;
    await analysisGate.run(async () => {
      const token = await tokenRef.current();
      if (!token) throw new Error('ログインしてください。');
      return fetchBodyAnalysisHistory(token);
    }, response => setState(current => ({ ...current, analyses: response.analyses, analysisError: '' })),
    error => setState(current => ({ ...current, analyses: null, analysisError: error instanceof Error ? error.message : '分析履歴を読み込めませんでした。' })));
  }, [analysisGate, isLoaded, userId]);
  const invalidateFriends = useCallback(() => { friendGate.invalidate(); }, [friendGate]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') { void refreshFriends(); void refreshAnalyses(); }
      else { friendGate.invalidate(); analysisGate.invalidate(); }
    });
    return () => { listener.remove(); friendGate.invalidate(); analysisGate.invalidate(); };
  }, [friendGate, analysisGate, refreshFriends, refreshAnalyses]);
  return <Context.Provider value={{ ...state, refreshFriends, refreshAnalyses, invalidateFriends }}>{children}</Context.Provider>;
}
export function useAccountReadiness() {
  const value = useContext(Context);
  if (!value) throw new Error('useAccountReadiness must be used inside AccountReadinessProvider.');
  return value;
}
