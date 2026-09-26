import { apiRequest } from '@/lib/api';

export type SubscriptionStatus = {
  appAccountToken: string;
  plan: 'free' | 'premium';
  accessLevel: 'free' | 'trial' | 'premium';
  canUseAiFeatures: boolean;
  status: string;
  productId: string | null;
  expiresAt: string | null;
  trial: {
    startedAt: string | null;
    endsAt: string | null;
    durationDays: number;
    used: boolean;
    choiceCompleted: boolean;
    eligibleToStart: boolean;
  };
  price: {
    amount: number;
    currency: 'JPY';
    interval: 'month';
  };
  features: {
    manualFoodTracking: boolean;
    aiFoodAnalysis: boolean;
    chat: {
      dailyLimit: number;
    };
    aiMenu: {
      dailyLimit: number;
    };
    bodyAnalysis: {
      firstAnalysisFree: boolean;
      currentLimit: number;
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

export function updateTrialChoice(
  token: string,
  action: 'start' | 'skip',
) {
  return apiRequest<{
    accessLevel: 'free' | 'trial';
    trialStarted: boolean;
    startedAt?: string;
    endsAt?: string;
  }>('/api/subscription/trial', {
    method: 'POST',
    token,
    body: JSON.stringify({ action }),
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
