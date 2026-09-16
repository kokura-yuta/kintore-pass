import { apiRequest } from '@/lib/api';

export type SubscriptionStatus = {
  plan: 'free' | 'premium';
  status: string;
  productId: string | null;
  expiresAt: string | null;
  price: {
    amount: number;
    currency: 'JPY';
    interval: 'month';
  };
  features: {
    calorieTracking: boolean;
    bodyAnalysis: {
      firstAnalysisFree: boolean;
      monthlyLimitForPremium: number;
    };
  };
};

export function fetchSubscriptionStatus(token: string) {
  return apiRequest<SubscriptionStatus>('/api/subscription', {
    method: 'GET',
    token,
  });
}
