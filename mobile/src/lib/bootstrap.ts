import { apiRequest } from '@/lib/api';

// bootstrap APIから返されるユーザーと初回設定の進行状態
export type BootstrapResponse = {
  userId: string;
  onboardingCompleted: boolean;
  goalBodyType: string | null;
  profileCompleted: boolean;
  initialAnalysisCompleted: boolean;
};

export function fetchBootstrap(token: string) {
  return apiRequest<BootstrapResponse>('/api/users/bootstrap', {
    method: 'POST',
    token,
  });
}
