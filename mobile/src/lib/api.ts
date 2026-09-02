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
  timeoutMs?: number;
};

// レスポンス本文の読み込みも期限内に含める。タイムアウトはサーバー処理の取消を保証しない。
async function withRequestTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  isRead: boolean,
  callerSignal?: AbortSignal | null,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => {
      reject(new ApiError('通信を中止しました。'));
      controller.abort();
    };
    if (callerSignal?.aborted) {
      onAbort();
      return;
    }
    callerSignal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      reject(new ApiError(isRead
        ? '通信が時間内に完了しませんでした。接続を確認して、もう一度お試しください。'
        : '処理結果を確認できませんでした。処理が完了している可能性があります。履歴や最新情報を確認してから再度お試しください。'));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      interrupted,
      callerSignal?.aborted ? interrupted : work(controller.signal),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) callerSignal?.removeEventListener('abort', onAbort);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('APIの接続先がまだ設定されていません。');
  }

  const { token, timeoutMs, signal, ...requestOptions } = options;
  const isRead = ['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase());

  try {
    return await withRequestTimeout(async (requestSignal) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestOptions,
      signal: requestSignal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
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
    }, timeoutMs ?? (isRead ? 30_000 : 120_000), isRead, signal);
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
  timeoutMs = 120_000,
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError(
      'APIの接続先がまだ設定されていません。',
    );
  }

  try {
    return await withRequestTimeout(async (signal) => {
    const response = await fetch(
      `${apiBaseUrl}${path}`,
      {
        method: 'POST',
        signal,
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
    }, timeoutMs, false);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      'インターネット接続を確認してください。',
    );
  }
}
