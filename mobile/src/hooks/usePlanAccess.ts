import { useLocalSearchParams } from 'expo-router';
import { useVerifiedPlan } from '@/contexts/PlanAccessContext';
import { isApiBypassEnabled } from '@/lib/api';
import { canAccessPaidScreen } from '@/lib/planPresentation';

export function usePlanAccess() {
  const { previewPlan } = useLocalSearchParams<{ previewPlan?: string }>();
  const isFreePreview = __DEV__ && previewPlan === 'free';
  const state = useVerifiedPlan();
  return { ...state, isFreePreview, error: isFreePreview ? '' : state.error,
    allowed: !isFreePreview && (isApiBypassEnabled || canAccessPaidScreen(state.data)) };
}
