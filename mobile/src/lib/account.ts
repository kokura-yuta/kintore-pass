// マイページと本人確認付きアカウント削除APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';

export type DeleteAccountResponse = {
  message: string;
  neonUserDeleted: boolean;
};

// 確認文字DELETEを送り、ClerkアカウントとNeonの本人データを削除する
export function deleteAccount(token: string) {
  return apiRequest<DeleteAccountResponse>(
    '/api/users/account',
    {
      method: 'DELETE',
      token,
      body: JSON.stringify({
        confirmation: 'DELETE',
      }),
    },
  );
}
