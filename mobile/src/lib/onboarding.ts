// 初回分析後に初回設定全体の完了状態をNeonへ保存する通信処理
import { apiRequest } from '@/lib/api';

type CompleteOnboardingResponse = {
  userId: string;
  onboardingCompleted: boolean;
  initialAnalysisCompleted: boolean;
};

export function completeOnboarding(
  token: string,
) {
  return apiRequest<CompleteOnboardingResponse>(
    '/api/users/onboarding-complete',
    {
      method: 'POST',
      token,
    },
  );
}
