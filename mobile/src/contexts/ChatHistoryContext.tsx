import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type ChatHistoryContextValue = {
  conversations: ChatConversation[];
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
};

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

export function ChatHistoryProvider({ children }: PropsWithChildren) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const value = useMemo(() => ({
    conversations,
    createConversation: () => {
      const id = `chat-${Date.now()}`;
      setConversations((current) => [{ id, title: '新しい相談', messages: [], updatedAt: Date.now() }, ...current]);
      return id;
    },
    deleteConversation: (id: string) => setConversations((current) => current.filter((chat) => chat.id !== id)),
    addMessage: (conversationId: string, message: ChatMessage) => setConversations((current) => current.map((chat) => {
      if (chat.id !== conversationId) return chat;
      const isFirstUserMessage = message.role === 'user' && !chat.messages.some((item) => item.role === 'user');
      return {
        ...chat,
        title: isFirstUserMessage ? message.content.trim().slice(0, 22) || '新しい相談' : chat.title,
        messages: [...chat.messages, message],
        updatedAt: Date.now(),
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt)),
  }), [conversations]);

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (!context) throw new Error('useChatHistory must be used inside ChatHistoryProvider.');
  return context;
}
