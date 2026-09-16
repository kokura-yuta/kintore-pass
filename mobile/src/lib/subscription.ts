import { apiRequest } from '@/lib/api';

export type SubscriptionStatus = {
  appAccountToken: string;
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

export type ApplePurchaseVerification = {
  plan: 'free' | 'premium';
  status: string;
  productId: string;
  expiresAt: string;
};

export function fetchSubscriptionStatus(token: string) {
  return apiRequest<SubscriptionStatus>('/api/subscription', {
    method: 'GET',
    token,
  });
}

export function verifyAppleSubscription(
  token: string,
  signedTransactionInfo: string,
) {
  return apiRequest<ApplePurchaseVerification>(
    '/api/subscription/apple/verify',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ signedTransactionInfo }),
    },
  );
}
