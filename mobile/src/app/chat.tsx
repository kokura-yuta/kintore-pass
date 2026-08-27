import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-native-markdown-display';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { type ChatMessage, useChatHistory } from '@/contexts/ChatHistoryContext';
import { deleteChatConversation, fetchChatHistory, sendChatMessage } from '@/lib/chatApi';

const MAX_MESSAGE_LENGTH = 2000;

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export default function ChatScreen() {
  const { getToken, isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const {
    conversations, createConversation, deleteConversation, addMessage,
    setServerConversationId, replaceConversations, setConversationMessages,
  } = useChatHistory();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [failedMessage, setFailedMessage] = useState('');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const getTokenRef = useRef(getToken);
  const loadedMessageConversationIds = useRef(new Set<string>());
  const messageRequestId = useRef(0);
  const resolvedActiveId = activeId ?? conversations[0]?.id ?? null;
  const activeConversation = conversations.find((chat) => chat.id === resolvedActiveId) ?? null;
  const isTooLong = input.length > MAX_MESSAGE_LENGTH;
  const canSend = Boolean(input.trim()) && !isTooLong && !isSending;

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;

    async function loadConversationList() {
      setIsLoadingHistory(true);
      setError('');
      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error('ログインを確認できませんでした。');
        const response = await fetchChatHistory(token);
        if (cancelled) return;
        const loadedConversations = response.conversations.map((conversation) => ({
          id: conversation.id,
          serverConversationId: conversation.id,
          title: conversation.title,
          messages: [],
          updatedAt: toTimestamp(conversation.updatedAt),
        }));
        loadedMessageConversationIds.current.clear();
        replaceConversations(loadedConversations);
        setActiveId((current) => loadedConversations.some((conversation) => conversation.id === current)
          ? current
          : loadedConversations[0]?.id ?? null);
      } catch (historyError) {
        if (!cancelled) setError(historyError instanceof Error ? historyError.message : 'チャット履歴を取得できませんでした。');
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    void loadConversationList();
    return () => { cancelled = true; };
  }, [historyReloadKey, isLoaded, isSignedIn, replaceConversations]);

  useEffect(() => {
    const localConversationId = activeConversation?.id ?? null;
    const serverConversationId = activeConversation?.serverConversationId ?? null;
    if (!isLoaded || !isSignedIn || !localConversationId || !serverConversationId) return;
    if ((activeConversation?.messages.length ?? 0) > 0) return;
    if (loadedMessageConversationIds.current.has(serverConversationId)) return;

    const selectedLocalConversationId: string = localConversationId;
    const selectedServerConversationId: string = serverConversationId;
    loadedMessageConversationIds.current.add(selectedServerConversationId);
    const currentRequestId = messageRequestId.current + 1;
    messageRequestId.current = currentRequestId;
    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setError('');
      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error('ログインを確認できませんでした。');
        const response = await fetchChatHistory(token, selectedServerConversationId);
        if (cancelled) return;
        setConversationMessages(selectedLocalConversationId, response.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: toTimestamp(message.createdAt),
        })));
      } catch (messageError) {
        loadedMessageConversationIds.current.delete(selectedServerConversationId);
        if (!cancelled) setError(messageError instanceof Error ? messageError.message : '過去のメッセージを取得できませんでした。');
      } finally {
        if (messageRequestId.current === currentRequestId) setIsLoadingMessages(false);
      }
    }

    void loadMessages();
    return () => { cancelled = true; };
  }, [
    activeConversation?.id, activeConversation?.messages.length,
    activeConversation?.serverConversationId, isLoaded, isSignedIn, setConversationMessages,
  ]);

  function startNewChat() {
    const id = createConversation();
    setActiveId(id);
    setDrawerVisible(false);
    setError('');
    setFailedMessage('');
  }

  async function submitMessage(content: string, appendUserMessage: boolean) {
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > MAX_MESSAGE_LENGTH || isSending) return;

    let localConversationId = resolvedActiveId;
    let serverConversationId = activeConversation?.serverConversationId ?? null;
    if (!localConversationId) {
      localConversationId = createConversation();
      serverConversationId = null;
      setActiveId(localConversationId);
    }
    if (appendUserMessage) {
      addMessage(localConversationId, {
        id: `user-${Date.now()}`, role: 'user', content: cleanContent, createdAt: Date.now(),
      });
      setInput('');
    }
    setError('');
    setFailedMessage('');
    setIsSending(true);

    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('ログインを確認できませんでした。');
      const response = await sendChatMessage(token, cleanContent, serverConversationId);
      setServerConversationId(localConversationId, response.conversationId);
      addMessage(localConversationId, {
        id: `assistant-${Date.now()}`, role: 'assistant', content: response.reply, createdAt: Date.now(),
      });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'AIからの返信を取得できませんでした。');
      setFailedMessage(cleanContent);
    } finally {
      setIsSending(false);
    }
  }

  async function removeChat(id: string) {
    if (deletingConversationId) return;
    const conversation = conversations.find((chat) => chat.id === id) ?? null;
    if (!conversation) return;
    setError('');
    if (!conversation.serverConversationId) {
      deleteConversation(id);
      if (resolvedActiveId === id) setActiveId(null);
      return;
    }

    setDeletingConversationId(id);
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('ログインを確認できませんでした。');
      await deleteChatConversation(token, conversation.serverConversationId);
      loadedMessageConversationIds.current.delete(conversation.serverConversationId);
      deleteConversation(id);
      if (resolvedActiveId === id) setActiveId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'チャットを削除できませんでした。');
    } finally {
      setDeletingConversationId(null);
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

  if (isLoaded && !isSignedIn) return <Redirect href="/sign-in" />;

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

          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.messages} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} ref={scrollRef} showsVerticalScrollIndicator={false}>
            {isLoadingHistory || isLoadingMessages ? <StatusPanel label="保存済みのチャットを読み込んでいます…" />
              : !activeConversation?.messages.length ? <Welcome onSelectSuggestion={setInput} />
                : activeConversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending ? <View style={[styles.bubbleRow, styles.assistantRow]}><View style={styles.assistantBubbleLoading}><ActivityIndicator color="#F6D365" size="small" /><Text style={styles.thinkingText}>回答を生成しています…</Text></View></View> : null}
          </ScrollView>

          {error ? <View style={styles.errorRow}><Text style={styles.errorText}>{error}</Text>{failedMessage ? <Pressable disabled={isSending} onPress={() => void submitMessage(failedMessage, false)} style={styles.retrySmall}><Text style={styles.retrySmallText}>再送する</Text></Pressable> : <Pressable disabled={isLoadingHistory} onPress={() => setHistoryReloadKey((value) => value + 1)} style={styles.retrySmall}><Text style={styles.retrySmallText}>再読み込み</Text></Pressable>}</View> : null}
          <View style={styles.inputArea}>
            <View style={styles.inputWrap}>
              <TextInput accessibilityLabel="AIコーチへの質問" multiline onChangeText={(value) => { setInput(value); setError(''); setFailedMessage(''); }} placeholder="筋トレについて相談する" placeholderTextColor="#697169" style={[styles.input, isTooLong && styles.inputError]} textAlignVertical="top" value={input} />
              <Text style={[styles.characterCount, isTooLong && styles.countError]}>{input.length}/{MAX_MESSAGE_LENGTH}</Text>
            </View>
            <Pressable disabled={!canSend} onPress={() => void submitMessage(input, true)} style={[styles.sendButton, !canSend && styles.disabledSend]}>{isSending ? <ActivityIndicator color="#0A0A0A" size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable>
          </View>
          {isTooLong ? <Text style={styles.lengthError}>2000文字以内で入力してください。</Text> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />

      <Modal animationType="slide" onRequestClose={() => setDrawerVisible(false)} transparent visible={drawerVisible}>
        <View style={styles.modalBackdrop}><Pressable accessibilityLabel="履歴メニューを閉じる" onPress={() => setDrawerVisible(false)} style={styles.modalDismiss} /><SafeAreaView edges={['top', 'bottom']} style={styles.drawer}>
          <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>チャット履歴</Text><Pressable accessibilityLabel="閉じる" onPress={() => setDrawerVisible(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Pressable disabled={isSending || Boolean(deletingConversationId)} onPress={startNewChat} style={styles.drawerNewButton}><Text style={styles.drawerNewText}>＋ 新しいチャット</Text></Pressable>
          <ScrollView contentContainerStyle={styles.chatList}>
            {isLoadingHistory ? <StatusPanel label="履歴を読み込んでいます…" />
              : conversations.length === 0 ? <Text style={styles.emptyHistory}>保存済みのチャットはありません。新しい相談を始めてみましょう。</Text>
                : conversations.map((chat) => <View key={chat.id} style={[styles.chatRow, resolvedActiveId === chat.id && styles.activeChatRow]}><Pressable disabled={Boolean(deletingConversationId)} onPress={() => { setActiveId(chat.id); setDrawerVisible(false); setError(''); }} style={styles.chatSelect}><Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text><Text style={styles.chatMeta}>{chat.serverConversationId ? (chat.messages.length ? `${chat.messages.length}メッセージ` : '保存済み') : '新しいチャット'}</Text></Pressable><Pressable accessibilityLabel={`${chat.title}を削除`} disabled={Boolean(deletingConversationId)} onPress={() => confirmRemoveChat(chat.id, chat.title)} style={styles.deleteButton}>{deletingConversationId === chat.id ? <ActivityIndicator color="#FF8D98" size="small" /> : <Text style={styles.deleteText}>削除</Text>}</Pressable></View>)}
          </ScrollView>
          <Text style={styles.drawerNote}>Neonに保存された本人のチャット履歴を表示しています。</Text>
        </SafeAreaView></View>
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.assistantRow]}>{!isUser ? <View style={styles.smallAiMark}><Text style={styles.smallAiText}>AI</Text></View> : null}<View style={isUser ? styles.userBubble : styles.assistantBubble}>{isUser ? <Text style={styles.userMessageText}>{message.content}</Text> : <Markdown mergeStyle style={markdownStyles}>{message.content}</Markdown>}</View></View>;
}

const markdownStyles = StyleSheet.create({
  body: { color: '#E8EBE8', fontSize: 13, lineHeight: 22, flexShrink: 1 }, text: { color: '#E8EBE8' }, paragraph: { marginTop: 0, marginBottom: 10, flexShrink: 1 },
  heading1: { color: '#FFF1B8', fontSize: 20, lineHeight: 27, fontWeight: '800', marginTop: 8, marginBottom: 10 }, heading2: { color: '#FFF1B8', fontSize: 18, lineHeight: 25, fontWeight: '800', marginTop: 8, marginBottom: 8 }, heading3: { color: '#F6D365', fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: 6, marginBottom: 7 }, heading4: { color: '#F6D365', fontSize: 14, lineHeight: 21, fontWeight: '700' }, heading5: { color: '#F6D365', fontSize: 13, lineHeight: 20, fontWeight: '700' }, heading6: { color: '#F6D365', fontSize: 12, lineHeight: 19, fontWeight: '700' },
  strong: { color: '#FFF1B8', fontWeight: '800' }, bullet_list: { marginTop: 2, marginBottom: 10 }, ordered_list: { marginTop: 2, marginBottom: 10 }, list_item: { marginBottom: 5, flexShrink: 1 }, bullet_list_icon: { color: '#F6D365', marginRight: 8 }, bullet_list_content: { flex: 1 }, ordered_list_icon: { color: '#F6D365', marginRight: 8 }, ordered_list_content: { flex: 1 },
  table: { width: '100%', maxWidth: '100%', marginVertical: 10, borderWidth: 1, borderColor: '#5A5131' }, thead: { backgroundColor: '#302A12' }, th: { flex: 1, padding: 7, color: '#FFF1B8', borderColor: '#5A5131' }, tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#403A27' }, td: { flex: 1, flexShrink: 1, padding: 7, color: '#E8EBE8', borderColor: '#403A27' },
  code_inline: { color: '#FFE699', backgroundColor: '#101210', borderColor: '#3B403B', borderWidth: 1, borderRadius: 4, paddingHorizontal: 5 }, fence: { maxWidth: '100%', color: '#E8EBE8', backgroundColor: '#0C0E0C', borderColor: '#353A35', borderWidth: 1, borderRadius: 7, padding: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 18 }, code_block: { maxWidth: '100%', color: '#E8EBE8', backgroundColor: '#0C0E0C', borderColor: '#353A35', borderWidth: 1, borderRadius: 7, padding: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 18 }, blockquote: { backgroundColor: '#161A17', borderLeftColor: '#F6D365', borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 6 }, link: { color: '#FFE699', textDecorationLine: 'underline' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#2C2924' }, menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, menuIcon: { color: '#F4F6F3', fontSize: 20 }, headerCopy: { flex: 1, marginHorizontal: 7 }, eyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, newButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 12 }, newButtonText: { color: '#FFF1B8', fontSize: 20 },
  messages: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 17 }, welcome: { alignItems: 'center', paddingTop: 42 }, aiMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#F6D365' }, aiMarkText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, welcomeTitle: { marginTop: 17, color: '#F4F6F3', fontSize: 18, fontWeight: '700', textAlign: 'center' }, welcomeText: { marginTop: 8, maxWidth: 290, color: '#8A928B', fontSize: 11, lineHeight: 18, textAlign: 'center' }, suggestions: { width: '100%', gap: 8, marginTop: 22 }, suggestion: { padding: 13, borderWidth: 1, borderColor: '#303030', borderRadius: 13, backgroundColor: '#151515' }, suggestionText: { color: '#C9CECA', fontSize: 12, fontWeight: '700' }, statusPanel: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 }, statusText: { color: '#8E978F', fontSize: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, maxWidth: '100%' }, userRow: { justifyContent: 'flex-end', paddingLeft: 45 }, assistantRow: { justifyContent: 'flex-start', paddingRight: 18 }, smallAiMark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', marginRight: 7, borderRadius: 13, backgroundColor: '#F6D365' }, smallAiText: { color: '#0A0A0A', fontSize: 7, fontWeight: '700' }, userBubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: '#F6D365' }, assistantBubble: { flex: 1, minWidth: 0, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: '#1C201D', overflow: 'hidden' }, assistantBubbleLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, backgroundColor: '#1C201D' }, userMessageText: { color: '#0A0A0A', fontSize: 13, fontWeight: '700', lineHeight: 20 }, thinkingText: { color: '#8E978F', fontSize: 11 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#201516' }, errorText: { flex: 1, color: '#FF8D98', fontSize: 11, lineHeight: 16 }, retrySmall: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#F6D365', borderRadius: 8 }, retrySmallText: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#2C2924', backgroundColor: '#111111' }, inputWrap: { flex: 1 }, input: { maxHeight: 130, minHeight: 48, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 19, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 15, backgroundColor: '#0A0A0A', color: '#F4F6F3', fontSize: 13, lineHeight: 19 }, inputError: { borderColor: '#FF7676' }, characterCount: { position: 'absolute', right: 10, bottom: 5, color: '#697169', fontSize: 9 }, countError: { color: '#FF7676' }, sendButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F6D365' }, disabledSend: { opacity: 0.35 }, sendText: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' }, lengthError: { paddingHorizontal: 14, paddingBottom: 7, color: '#FF7676', backgroundColor: '#111111', fontSize: 10 },
  modalBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.68)' }, modalDismiss: { flex: 1 }, drawer: { width: '86%', maxWidth: 380, backgroundColor: '#111111' }, drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#2C2924' }, drawerTitle: { color: '#F4F6F3', fontSize: 20, fontWeight: '700' }, closeText: { color: '#8E978F', fontSize: 26 }, drawerNewButton: { margin: 14, padding: 13, borderWidth: 1, borderColor: '#F6D365', borderRadius: 13 }, drawerNewText: { color: '#FFF1B8', fontSize: 12, fontWeight: '700', textAlign: 'center' }, chatList: { flexGrow: 1, paddingHorizontal: 12, paddingBottom: 20 }, emptyHistory: { padding: 16, color: '#8E978F', fontSize: 11, lineHeight: 18, textAlign: 'center' }, chatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, borderRadius: 12, backgroundColor: '#181C19' }, activeChatRow: { backgroundColor: '#302A12' }, chatSelect: { flex: 1, padding: 12 }, chatTitle: { color: '#E8EBE8', fontSize: 12, fontWeight: '600' }, chatMeta: { marginTop: 4, color: '#818982', fontSize: 9 }, deleteButton: { minWidth: 52, minHeight: 46, alignItems: 'center', justifyContent: 'center', padding: 9 }, deleteText: { color: '#FF8D98', fontSize: 10, fontWeight: '600' }, drawerNote: { padding: 15, color: '#697169', fontSize: 9, textAlign: 'center' },
});
