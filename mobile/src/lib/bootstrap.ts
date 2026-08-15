import { apiRequest } from '@/lib/api';

export type BootstrapResponse = {
  userId: string;
  onboardingCompleted: boolean;
};

export function fetchBootstrap(token: string) {
  return apiRequest<BootstrapResponse>('/api/users/bootstrap', {
    method: 'POST',
    token,
  });
}
