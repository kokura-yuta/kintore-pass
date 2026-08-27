import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-native-markdown-display';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ApiError, apiRequest } from '@/lib/api';

const MAX_MESSAGE_LENGTH = 2000;
type ChatRole = 'user' | 'assistant';
type ChatMessage = { id: string; role: ChatRole; content: string; createdAt: number };
type ChatConversation = { id: string; title: string; messageCount: number; updatedAt: number };
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string;
  }
  return '';
}

function readTimestamp(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function normalizeMessage(value: unknown, index: number): ChatMessage | null {
  if (!isRecord(value)) return null;
  const role: ChatRole = readString(value, ['role', 'sender', 'author']).toLowerCase() === 'user' ? 'user' : 'assistant';
  const content = readString(value, ['content', 'message', 'text', 'reply']);
  if (!content) return null;
  return {
    id: readString(value, ['id', 'messageId']) || `${role}-${index}-${Date.now()}`,
    role,
    content,
    createdAt: readTimestamp(value.createdAt ?? value.created_at),
  };
}

function normalizeMessages(payload: unknown) {
  let source: unknown = payload;
  if (isRecord(payload)) {
    const conversation = isRecord(payload.conversation) ? payload.conversation : null;
    source = payload.messages ?? conversation?.messages ?? payload.data;
  }
  if (!Array.isArray(source)) return [];
  return source.map(normalizeMessage).filter((message): message is ChatMessage => Boolean(message));
}

function normalizeConversation(value: unknown): ChatConversation | null {
  if (!isRecord(value)) return null;
  const id = readString(value, ['id', 'conversationId']);
  if (!id) return null;
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const countValue = value.messageCount ?? value.messagesCount ?? messages.length;
  return {
    id,
    title: readString(value, ['title', 'name']) || '新しい相談',
    messageCount: typeof countValue === 'number' ? countValue : Number(countValue) || 0,
    updatedAt: readTimestamp(value.updatedAt ?? value.updated_at ?? value.createdAt ?? value.created_at),
  };
}

function normalizeConversations(payload: unknown) {
  let source: unknown = payload;
  if (isRecord(payload)) source = payload.conversations ?? payload.chats ?? payload.data;
  if (!Array.isArray(source)) return [];
  return source
    .map(normalizeConversation)
    .filter((conversation): conversation is ChatConversation => Boolean(conversation))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '通信に失敗しました。もう一度お試しください。';
}

export default function ChatScreen() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [conversationError, setConversationError] = useState('');
  const [sendError, setSendError] = useState('');
  const [failedMessage, setFailedMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const activeConversation = conversations.find((chat) => chat.id === activeId) ?? null;
  const isTooLong = input.length > MAX_MESSAGE_LENGTH;
  const canSend = Boolean(input.trim()) && !isTooLong && !isSending;
  const authError = isLoaded && !isSignedIn ? 'チャットを利用するにはログインしてください。' : '';
  const visibleHistoryError = authError || historyError;

  const getAuthToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new ApiError('ログイン情報を確認できませんでした。', 401);
    return token;
  }, [getToken]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsConversationLoading(true);
    setConversationError('');
    try {
      const token = await getAuthToken();
      const response = await apiRequest<unknown>(
        `/api/chat?conversationId=${encodeURIComponent(conversationId)}`,
        { method: 'GET', token },
      );
      setMessages(normalizeMessages(response));
    } catch (error) {
      setConversationError(getErrorMessage(error));
    } finally {
      setIsConversationLoading(false);
    }
  }, [getAuthToken]);

  const loadHistory = useCallback(async (preferredId?: string | null) => {
    setIsHistoryLoading(true);
    setHistoryError('');
    try {
      const token = await getAuthToken();
      const response = await apiRequest<unknown>('/api/chat', { method: 'GET', token });
      const nextConversations = normalizeConversations(response);
      setConversations(nextConversations);
      const nextId = preferredId && nextConversations.some((chat) => chat.id === preferredId)
        ? preferredId
        : nextConversations[0]?.id ?? null;
      setActiveId(nextId);
      if (nextId) await loadMessages(nextId);
      else setMessages([]);
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setIsHistoryLoading(false);
    }
  }, [getAuthToken, loadMessages]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const timer = setTimeout(() => void loadHistory(), 0);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, loadHistory]);

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setFailedMessage('');
    setSendError('');
    setConversationError('');
    setDrawerVisible(false);
  }

  async function selectConversation(id: string) {
    if (isSending || deletingId) return;
    setActiveId(id);
    setDrawerVisible(false);
    await loadMessages(id);
  }

  async function submitMessage(content: string, addUserMessage: boolean) {
    if (isSending) return;
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > MAX_MESSAGE_LENGTH) return;
    if (addUserMessage) {
      setMessages((current) => [...current, {
        id: `local-user-${Date.now()}`, role: 'user', content: cleanContent, createdAt: Date.now(),
      }]);
      setInput('');
    }
    setIsSending(true);
    setSendError('');
    setFailedMessage('');

    try {
      const token = await getAuthToken();
      const response = await apiRequest<unknown>('/api/chat', {
        method: 'POST',
        token,
        body: JSON.stringify({ message: cleanContent, ...(activeId ? { conversationId: activeId } : {}) }),
      });
      const record = isRecord(response) ? response : {};
      const responseConversation = isRecord(record.conversation) ? record.conversation : null;
      const nextId = readString(record, ['conversationId'])
        || (responseConversation ? readString(responseConversation, ['id', 'conversationId']) : '')
        || activeId;
      const reply = readString(record, ['reply', 'content', 'answer'])
        || (isRecord(record.message) ? readString(record.message, ['content', 'text']) : '')
        || (isRecord(record.assistantMessage) ? readString(record.assistantMessage, ['content', 'text']) : '');
      if (!reply) throw new ApiError('AIの回答を読み取れませんでした。');

      setMessages((current) => [...current, {
        id: readString(record, ['messageId', 'id']) || `local-assistant-${Date.now()}`,
        role: 'assistant', content: reply, createdAt: Date.now(),
      }]);
      if (nextId) {
        setActiveId(nextId);
        const title = readString(record, ['title']) || cleanContent.slice(0, 24);
        setConversations((current) => {
          const existing = current.find((chat) => chat.id === nextId);
          const summary: ChatConversation = {
            id: nextId,
            title: title || existing?.title || '新しい相談',
            messageCount: (existing?.messageCount ?? 0) + 2,
            updatedAt: Date.now(),
          };
          return [summary, ...current.filter((chat) => chat.id !== nextId)];
        });
      }
    } catch (error) {
      setSendError(getErrorMessage(error));
      setFailedMessage(cleanContent);
    } finally {
      setIsSending(false);
    }
  }

  function sendMessage() {
    if (canSend) void submitMessage(input, true);
  }

  async function removeChat(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setHistoryError('');
    try {
      const token = await getAuthToken();
      await apiRequest<unknown>('/api/chat', {
        method: 'DELETE', token, body: JSON.stringify({ conversationId: id }),
      });
      const remaining = conversations.filter((chat) => chat.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        const nextId = remaining[0]?.id ?? null;
        setActiveId(nextId);
        if (nextId) await loadMessages(nextId);
        else setMessages([]);
      }
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  function confirmRemoveChat(id: string, title: string) {
    const message = `「${title}」を削除します。この操作は取り消せません。`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) void removeChat(id);
      return;
    }
    Alert.alert('チャットを削除しますか？', message, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => void removeChat(id) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.safeArea}
        >
          <View style={styles.header}>
            <Pressable accessibilityLabel="チャット履歴を開く" onPress={() => setDrawerVisible(true)} style={styles.menuButton}><Text style={styles.menuIcon}>☰</Text></Pressable>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>AI TRAINING CHAT</Text><Text numberOfLines={1} style={styles.title}>{activeConversation?.title ?? 'AIコーチに相談'}</Text></View>
            <Pressable accessibilityLabel="新しいチャット" disabled={isSending} onPress={startNewChat} style={styles.newButton}><Text style={styles.newButtonText}>＋</Text></Pressable>
          </View>

          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.messages}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
          >
            {!isLoaded || (isSignedIn && isHistoryLoading) || isConversationLoading ? <StatusPanel label="チャット履歴を読み込んでいます…" />
              : visibleHistoryError ? <ErrorPanel message={visibleHistoryError} onRetry={() => void loadHistory(activeId)} />
                : conversationError ? <ErrorPanel message={conversationError} onRetry={() => activeId && void loadMessages(activeId)} />
                  : messages.length === 0 ? <Welcome onSelectSuggestion={setInput} />
                    : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending ? <View style={[styles.bubbleRow, styles.assistantRow]}><View style={styles.assistantBubbleLoading}><ActivityIndicator color="#F6D365" size="small" /><Text style={styles.thinkingText}>回答を生成しています…</Text></View></View> : null}
          </ScrollView>

          {sendError ? <View style={styles.sendErrorRow}><Text style={styles.error}>{sendError}</Text>{failedMessage ? <Pressable disabled={isSending} onPress={() => void submitMessage(failedMessage, false)} style={styles.retryInline}><Text style={styles.retryInlineText}>再送する</Text></Pressable> : null}</View> : null}
          <View style={styles.inputArea}>
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel="AIコーチへの質問"
                multiline
                onChangeText={(value) => { setInput(value); setSendError(''); setFailedMessage(''); }}
                placeholder="筋トレについて相談する"
                placeholderTextColor="#697169"
                style={[styles.input, isTooLong && styles.inputError]}
                textAlignVertical="top"
                value={input}
              />
              <Text style={[styles.characterCount, isTooLong && styles.characterCountError]}>{input.length}/{MAX_MESSAGE_LENGTH}</Text>
            </View>
            <Pressable disabled={!canSend} onPress={sendMessage} style={[styles.sendButton, !canSend && styles.disabledSend]}>
              {isSending ? <ActivityIndicator color="#0A0A0A" size="small" /> : <Text style={styles.sendText}>↑</Text>}
            </Pressable>
          </View>
          {isTooLong ? <Text style={styles.lengthError}>2000文字以内で入力してください。</Text> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />

      <Modal animationType="slide" onRequestClose={() => setDrawerVisible(false)} transparent visible={drawerVisible}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="履歴メニューを閉じる" onPress={() => setDrawerVisible(false)} style={styles.modalDismiss} />
          <SafeAreaView edges={['top', 'bottom']} style={styles.drawer}>
            <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>チャット履歴</Text><Pressable accessibilityLabel="閉じる" onPress={() => setDrawerVisible(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
            <Pressable disabled={isSending || Boolean(deletingId)} onPress={startNewChat} style={styles.drawerNewButton}><Text style={styles.drawerNewText}>＋ 新しいチャット</Text></Pressable>
            {visibleHistoryError ? <View style={styles.drawerError}><Text style={styles.error}>{visibleHistoryError}</Text>{isSignedIn ? <Pressable onPress={() => void loadHistory(activeId)}><Text style={styles.retryInlineText}>再読み込み</Text></Pressable> : null}</View> : null}
            <ScrollView contentContainerStyle={styles.chatList}>
              {!isLoaded || (isSignedIn && isHistoryLoading) ? <StatusPanel label="履歴を読み込んでいます…" />
                : conversations.length === 0 ? <Text style={styles.emptyHistory}>保存済みのチャットはありません。新しい相談を始めてみましょう。</Text>
                  : conversations.map((chat) => <View key={chat.id} style={[styles.chatRow, activeId === chat.id && styles.activeChatRow]}>
                    <Pressable disabled={Boolean(deletingId)} onPress={() => void selectConversation(chat.id)} style={styles.chatSelect}><Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text><Text style={styles.chatMeta}>{chat.messageCount ? `${chat.messageCount}メッセージ` : '保存済みチャット'}</Text></Pressable>
                    <Pressable accessibilityLabel={`${chat.title}を削除`} disabled={Boolean(deletingId)} onPress={() => confirmRemoveChat(chat.id, chat.title)} style={styles.deleteButton}>{deletingId === chat.id ? <ActivityIndicator color="#FF8D98" size="small" /> : <Text style={styles.deleteText}>削除</Text>}</Pressable>
                  </View>)}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function Welcome({ onSelectSuggestion }: { onSelectSuggestion: (value: string) => void }) {
  return <View style={styles.welcome}><View style={styles.aiMark}><Text style={styles.aiMarkText}>AI</Text></View><Text style={styles.welcomeTitle}>筋トレについて相談してください</Text><Text style={styles.welcomeText}>あなたの目標・身体情報・トレーニング履歴を参考に回答します。</Text><View style={styles.suggestions}>{['最近、胸の重量が伸びない', '疲れている日は休んでもいい？', '今日のメニューについて教えて'].map((suggestion) => <Pressable key={suggestion} onPress={() => onSelectSuggestion(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View></View>;
}

function StatusPanel({ label }: { label: string }) {
  return <View style={styles.statusPanel}><ActivityIndicator color="#F6D365" size="small" /><Text style={styles.statusText}>{label}</Text></View>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.errorPanel}><Text style={styles.errorPanelTitle}>読み込めませんでした</Text><Text style={styles.errorPanelText}>{message}</Text><Pressable onPress={onRetry} style={styles.retryButton}><Text style={styles.retryButtonText}>もう一度試す</Text></Pressable></View>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.assistantRow]}>{!isUser ? <View style={styles.smallAiMark}><Text style={styles.smallAiText}>AI</Text></View> : null}<View style={isUser ? styles.userBubble : styles.assistantBubble}>{isUser ? <Text style={styles.userMessageText}>{message.content}</Text> : <Markdown mergeStyle style={markdownStyles}>{message.content}</Markdown>}</View></View>;
}

const markdownStyles = StyleSheet.create({
  body: { color: '#E8EBE8', fontSize: 13, lineHeight: 22, flexShrink: 1 }, text: { color: '#E8EBE8' },
  paragraph: { marginTop: 0, marginBottom: 10, flexShrink: 1 },
  heading1: { color: '#FFF1B8', fontSize: 20, lineHeight: 27, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  heading2: { color: '#FFF1B8', fontSize: 18, lineHeight: 25, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  heading3: { color: '#F6D365', fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: 6, marginBottom: 7 },
  heading4: { color: '#F6D365', fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 5, marginBottom: 6 },
  heading5: { color: '#F6D365', fontSize: 13, lineHeight: 20, fontWeight: '700' }, heading6: { color: '#F6D365', fontSize: 12, lineHeight: 19, fontWeight: '700' },
  strong: { color: '#FFF1B8', fontWeight: '800' }, bullet_list: { marginTop: 2, marginBottom: 10 }, ordered_list: { marginTop: 2, marginBottom: 10 },
  list_item: { marginBottom: 5, flexShrink: 1 }, bullet_list_icon: { color: '#F6D365', marginRight: 8 }, bullet_list_content: { flex: 1 }, ordered_list_icon: { color: '#F6D365', marginRight: 8 }, ordered_list_content: { flex: 1 },
  table: { width: '100%', maxWidth: '100%', marginVertical: 10, borderWidth: 1, borderColor: '#5A5131', borderRadius: 5 }, thead: { backgroundColor: '#302A12' },
  th: { flex: 1, padding: 7, color: '#FFF1B8', borderColor: '#5A5131' }, tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#403A27' }, td: { flex: 1, padding: 7, color: '#E8EBE8', borderColor: '#403A27', flexShrink: 1 },
  code_inline: { color: '#FFE699', backgroundColor: '#101210', borderColor: '#3B403B', borderWidth: 1, borderRadius: 4, paddingHorizontal: 5 },
  fence: { maxWidth: '100%', color: '#E8EBE8', backgroundColor: '#0C0E0C', borderColor: '#353A35', borderWidth: 1, borderRadius: 7, padding: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 18 },
  code_block: { maxWidth: '100%', color: '#E8EBE8', backgroundColor: '#0C0E0C', borderColor: '#353A35', borderWidth: 1, borderRadius: 7, padding: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 18 },
  blockquote: { backgroundColor: '#161A17', borderLeftColor: '#F6D365', borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 6 }, link: { color: '#FFE699', textDecorationLine: 'underline' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#2C2924' },
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, menuIcon: { color: '#F4F6F3', fontSize: 20 }, headerCopy: { flex: 1, marginHorizontal: 7 }, eyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, newButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 12 }, newButtonText: { color: '#FFF1B8', fontSize: 20 },
  messages: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 17 }, welcome: { alignItems: 'center', paddingTop: 42 }, aiMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#F6D365' }, aiMarkText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, welcomeTitle: { marginTop: 17, color: '#F4F6F3', fontSize: 18, fontWeight: '700', textAlign: 'center' }, welcomeText: { marginTop: 8, maxWidth: 290, color: '#8A928B', fontSize: 11, lineHeight: 18, textAlign: 'center' }, suggestions: { width: '100%', gap: 8, marginTop: 22 }, suggestion: { padding: 13, borderWidth: 1, borderColor: '#303030', borderRadius: 13, backgroundColor: '#151515' }, suggestionText: { color: '#C9CECA', fontSize: 12, fontWeight: '700' },
  statusPanel: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 }, statusText: { color: '#8E978F', fontSize: 12 }, errorPanel: { marginTop: 24, padding: 18, borderWidth: 1, borderColor: '#713E43', borderRadius: 14, backgroundColor: '#201516' }, errorPanelTitle: { color: '#FF9BA4', fontSize: 15, fontWeight: '700' }, errorPanelText: { marginTop: 7, color: '#C6AAA9', fontSize: 12, lineHeight: 19 }, retryButton: { marginTop: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F6D365' }, retryButtonText: { color: '#0A0A0A', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, maxWidth: '100%' }, userRow: { justifyContent: 'flex-end', paddingLeft: 45 }, assistantRow: { justifyContent: 'flex-start', paddingRight: 18 }, smallAiMark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', marginRight: 7, borderRadius: 13, backgroundColor: '#F6D365' }, smallAiText: { color: '#0A0A0A', fontSize: 7, fontWeight: '700' }, userBubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: '#F6D365' }, assistantBubble: { flex: 1, maxWidth: '100%', minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: '#1C201D', overflow: 'hidden' }, assistantBubbleLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: '#1C201D' }, userMessageText: { color: '#0A0A0A', fontSize: 13, fontWeight: '700', lineHeight: 20 }, thinkingText: { color: '#8E978F', fontSize: 11 },
  sendErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#201516' }, error: { flex: 1, color: '#FF8D98', fontSize: 11, lineHeight: 16 }, retryInline: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#F6D365', borderRadius: 8 }, retryInlineText: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#2C2924', backgroundColor: '#111111' }, inputWrap: { flex: 1 }, input: { maxHeight: 130, minHeight: 48, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 19, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 15, backgroundColor: '#0A0A0A', color: '#F4F6F3', fontSize: 13, lineHeight: 19 }, inputError: { borderColor: '#FF7676' }, characterCount: { position: 'absolute', right: 10, bottom: 5, color: '#697169', fontSize: 9 }, characterCountError: { color: '#FF7676' }, sendButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F6D365' }, disabledSend: { opacity: 0.35 }, sendText: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' }, lengthError: { paddingHorizontal: 14, paddingBottom: 7, color: '#FF7676', backgroundColor: '#111111', fontSize: 10 },
  modalBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.68)' }, modalDismiss: { flex: 1 }, drawer: { width: '86%', maxWidth: 380, backgroundColor: '#111111' }, drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#2C2924' }, drawerTitle: { color: '#F4F6F3', fontSize: 20, fontWeight: '700' }, closeText: { color: '#8E978F', fontSize: 26 }, drawerNewButton: { margin: 14, padding: 13, borderWidth: 1, borderColor: '#F6D365', borderRadius: 13 }, drawerNewText: { color: '#FFF1B8', fontSize: 12, fontWeight: '700', textAlign: 'center' }, drawerError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 9, backgroundColor: '#201516' }, chatList: { flexGrow: 1, paddingHorizontal: 12, paddingBottom: 20 }, emptyHistory: { padding: 16, color: '#8E978F', fontSize: 11, lineHeight: 18, textAlign: 'center' }, chatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, borderRadius: 12, backgroundColor: '#181C19' }, activeChatRow: { backgroundColor: '#302A12' }, chatSelect: { flex: 1, padding: 12 }, chatTitle: { color: '#E8EBE8', fontSize: 12, fontWeight: '600' }, chatMeta: { marginTop: 4, color: '#818982', fontSize: 9 }, deleteButton: { minWidth: 52, minHeight: 46, alignItems: 'center', justifyContent: 'center', padding: 9 }, deleteText: { color: '#FF8D98', fontSize: 10, fontWeight: '600' },
});
