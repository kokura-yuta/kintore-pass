const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

// 公開APIが未用意の間だけ初回設定を端末内Stateで確認するための明示的な開発フラグ。
// __DEV__も必須にすることで、本番ビルドでは環境変数が残っていても無効になる。
export const isApiBypassEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_API_BYPASS === 'true';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  token: string;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('APIの接続先がまだ設定されていません。');
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const fallbackMessage =
        response.status === 400
          ? '送信内容を確認してください。'
          : response.status === 401
            ? 'ログインの有効期限が切れました。'
            : 'サーバーとの通信に失敗しました。';

      let message = fallbackMessage;
      try {
        const body = (await response.json()) as {
          error?: string;
          message?: string;
        };
        message =
          body.error ??
          body.message ??
          fallbackMessage;
      } catch {
        // JSON以外のエラー応答では、ステータス別のメッセージを使用します。
      }

      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('インターネット接続を確認して、もう一度お試しください。');
  }
}
// 画像などのFormDataを認証付きでバックエンドへ送信する
export async function apiUploadRequest<T>(
  path: string,
  token: string,
  body: FormData,
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError(
      'APIの接続先がまだ設定されていません。',
    );
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      },
    );

    if (!response.ok) {
      let message =
        `画像の送信に失敗しました。（HTTP ${response.status}）`;

      try {
        const errorBody =
          (await response.json()) as {
            error?: string;
            message?: string;
            detail?: string;
          };

        message =
          errorBody.error ??
          errorBody.message ??
          errorBody.detail ??
          message;
      } catch {
        // JSON以外のエラーでは共通メッセージを使用する
      }

      throw new ApiError(
        message,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      'インターネット接続を確認してください。',
    );
  }
}
