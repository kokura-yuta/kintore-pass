// スマホ版AIチャットとTypeScriptバックエンドの通信処理をまとめるファイル
import { apiRequest } from '@/lib/api';

// バックエンドから返ってくるチャット結果の形
export type ChatResponse = {
  conversationId: string;
  reply: string;
};

// Neonから取得するチャット一覧1件分の形
export type ChatConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

// Neonから取得するメッセージ1件分の形
export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

// GET /api/chatから返ってくる履歴全体の形
export type ChatHistoryResponse = {
  conversations: ChatConversationSummary[];
  messages: StoredChatMessage[];
};

// チャット削除APIから返ってくる結果の形
export type DeleteChatResponse = {
  deletedConversationId: string;
};

// 利用者の質問を認証付きでバックエンドへ送る
export async function sendChatMessage(
  token: string,
  message: string,
  requestId: string,
  conversationId?: string | null,
) {
  return apiRequest<ChatResponse>(
    '/api/chat',
    {
      method: 'POST',
      token,
      body: JSON.stringify({
        message,
        conversationId,
        requestId,
      }),
    },
  );
}

// 本人のチャット一覧と、指定したチャットのメッセージを取得する
export async function fetchChatHistory(
  token: string,
  conversationId?: string | null,
) {
  const query = conversationId
    ? `?conversationId=${encodeURIComponent(
        conversationId,
      )}`
    : '';

  return apiRequest<ChatHistoryResponse>(
    `/api/chat${query}`,
    {
      method: 'GET',
      token,
    },
  );
}

// 指定した本人のチャットをNeonから削除する
export async function deleteChatConversation(
  token: string,
  conversationId: string,
) {
  return apiRequest<DeleteChatResponse>(
    '/api/chat',
    {
      method: 'DELETE',
      token,
      body: JSON.stringify({
        conversationId,
      }),
    },
  );
}
