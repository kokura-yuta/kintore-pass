import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type ChatConversation = {
  id: string;
  // Neonに保存されたチャットルームのID
  serverConversationId: string | null;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type ChatHistoryContextValue = {
  conversations: ChatConversation[];
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setServerConversationId: (localId: string, serverId: string) => void;
  replaceConversations: (loadedConversations: ChatConversation[]) => void;
  setConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
};

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

export function ChatHistoryProvider({ children }: PropsWithChildren) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);

  // 画面上へ空の新規チャットを追加する
  const createConversation = useCallback(() => {
    const id = `chat-${Date.now()}`;
    setConversations((current) => [
      {
        id,
        serverConversationId: null,
        title: '新しい相談',
        messages: [],
        updatedAt: Date.now(),
      },
      ...current,
    ]);
    return id;
  }, []);

  // 指定したチャットを画面上のStateから削除する
  const deleteConversation = useCallback((id: string) => {
    setConversations((current) => current.filter((chat) => chat.id !== id));
  }, []);

  // 指定したチャットへ利用者またはAIのメッセージを追加する
  const addMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((current) => current.map((chat) => {
      if (chat.id !== conversationId) return chat;
      const isFirstUserMessage = message.role === 'user' && !chat.messages.some((item) => item.role === 'user');
      return {
        ...chat,
        title: isFirstUserMessage ? message.content.trim().slice(0, 22) || '新しい相談' : chat.title,
        messages: [...chat.messages, message],
        updatedAt: Date.now(),
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  // スマホ内のチャットへNeon側のチャットIDを保存する
  const setServerConversationId = useCallback((localId: string, serverId: string) => {
    setConversations((current) => current.map((chat) => (
      chat.id === localId
        ? { ...chat, serverConversationId: serverId }
        : chat
    )));
  }, []);

  // Neonから取得したチャット一覧で現在のStateを置き換える
  const replaceConversations = useCallback((loadedConversations: ChatConversation[]) => {
    setConversations(loadedConversations);
  }, []);

  // 選択したチャットへNeonから取得したメッセージを保存する
  const setConversationMessages = useCallback((conversationId: string, messages: ChatMessage[]) => {
    setConversations((current) => current.map((chat) => (
      chat.id === conversationId
        ? { ...chat, messages }
        : chat
    )));
  }, []);

  const value = useMemo(() => ({
    conversations,
    createConversation,
    deleteConversation,
    addMessage,
    setServerConversationId,
    replaceConversations,
    setConversationMessages,
  }), [
    conversations,
    createConversation,
    deleteConversation,
    addMessage,
    setServerConversationId,
    replaceConversations,
    setConversationMessages,
  ]);

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (!context) throw new Error('useChatHistory must be used inside ChatHistoryProvider.');
  return context;
}
