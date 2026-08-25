import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { BottomNavigation } from '@/components/BottomNavigation';
import { type ChatMessage, useChatHistory } from '@/contexts/ChatHistoryContext';
import { deleteChatConversation, fetchChatHistory, sendChatMessage } from '@/lib/chatApi';

// APIから届く日付文字列を画面で扱う数値へ変換する
function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export default function ChatScreen() {
  const { getToken, isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const {
    conversations,
    createConversation,
    deleteConversation,
    addMessage,
    setServerConversationId,
    replaceConversations,
    setConversationMessages,
  } = useChatHistory();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const getTokenRef = useRef(getToken);
  const loadedMessageConversationIds = useRef(new Set<string>());
  const messageRequestId = useRef(0);
  const resolvedActiveId = activeId ?? conversations[0]?.id ?? null;
  const activeConversation = conversations.find((chat) => chat.id === resolvedActiveId) ?? null;

  // 最新のClerkトークン取得関数を、履歴通信を再実行させずに保持する
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // 画面を開いたとき、Neonに保存された本人のチャット一覧を取得する
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function loadConversationList() {
      setIsLoadingHistory(true);
      setError('');

      try {
        const token = await getTokenRef.current();
        if (!token) {
          throw new Error('ログインを確認できませんでした。');
        }

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
        setActiveId((current) => (
          loadedConversations.some((conversation) => conversation.id === current)
            ? current
            : loadedConversations[0]?.id ?? null
        ));
      } catch (historyError) {
        if (!cancelled) {
          setError(
            historyError instanceof Error
              ? historyError.message
              : 'チャット履歴を取得できませんでした。',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    void loadConversationList();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, replaceConversations]);

  // 開いているチャットのメッセージをまだ取得していなければNeonから取得する
  useEffect(() => {
    const localConversationId = activeConversation?.id ?? null;
    const serverConversationId = activeConversation?.serverConversationId ?? null;

    if (!isLoaded || !isSignedIn || !localConversationId || !serverConversationId) {
      return;
    }
    if ((activeConversation?.messages.length ?? 0) > 0) {
      return;
    }

    const selectedLocalConversationId: string = localConversationId;
    const selectedServerConversationId: string = serverConversationId;

    if (loadedMessageConversationIds.current.has(selectedServerConversationId)) {
      return;
    }

    loadedMessageConversationIds.current.add(selectedServerConversationId);
    const currentRequestId = messageRequestId.current + 1;
    messageRequestId.current = currentRequestId;
    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setError('');

      try {
        const token = await getTokenRef.current();
        if (!token) {
          throw new Error('ログインを確認できませんでした。');
        }

        const response = await fetchChatHistory(token, selectedServerConversationId);
        if (cancelled) return;

        const loadedMessages: ChatMessage[] = response.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: toTimestamp(message.createdAt),
        }));

        setConversationMessages(selectedLocalConversationId, loadedMessages);
      } catch (messageError) {
        loadedMessageConversationIds.current.delete(selectedServerConversationId);
        if (!cancelled) {
          setError(
            messageError instanceof Error
              ? messageError.message
              : '過去のメッセージを取得できませんでした。',
          );
        }
      } finally {
        // 古い通信ではなく、現在の通信が終わったときだけ読み込み表示を消す
        if (messageRequestId.current === currentRequestId) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [
    activeConversation?.id,
    activeConversation?.messages.length,
    activeConversation?.serverConversationId,
    isLoaded,
    isSignedIn,
    setConversationMessages,
  ]);

  function startNewChat() {
    const id = createConversation();
    setActiveId(id);
    setDrawerVisible(false);
    setError('');
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isSending) return;

    // 画面内で使うチャットIDを用意する
    let localConversationId = resolvedActiveId;
    let serverConversationId = activeConversation?.serverConversationId ?? null;

    if (!localConversationId) {
      localConversationId = createConversation();
      serverConversationId = null;
      setActiveId(localConversationId);
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content, createdAt: Date.now() };
    addMessage(localConversationId, userMessage);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      // Clerkのトークンでログイン中の本人だと証明する
      const token = await getToken();
      if (!token) {
        throw new Error('ログインを確認できませんでした。');
      }

      // 質問をTypeScriptバックエンドへ送り、AIの回答を待つ
      const response = await sendChatMessage(
        token,
        content,
        serverConversationId,
      );

      // バックエンドが作成したNeon側のチャットIDを保存する
      setServerConversationId(
        localConversationId,
        response.conversationId,
      );

      // OpenAIから返った回答をチャット画面へ追加する
      addMessage(localConversationId, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        createdAt: Date.now(),
      });
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'AIからの返信を取得できませんでした。もう一度お試しください。',
      );
    } finally {
      setIsSending(false);
    }
  }

  // 保存済みチャットはNeonから削除し、成功後に画面上からも削除する
  async function removeChat(id: string) {
    if (deletingConversationId) return;

    const conversation = conversations.find((chat) => chat.id === id) ?? null;
    if (!conversation) return;

    setError('');

    // まだ一度も送信していない新規チャットはNeonに存在しないため画面だけ消す
    if (!conversation.serverConversationId) {
      deleteConversation(id);
      if (resolvedActiveId === id) setActiveId(null);
      return;
    }

    setDeletingConversationId(id);

    try {
      const token = await getTokenRef.current();
      if (!token) {
        throw new Error('ログインを確認できませんでした。');
      }

      await deleteChatConversation(
        token,
        conversation.serverConversationId,
      );

      loadedMessageConversationIds.current.delete(
        conversation.serverConversationId,
      );
      deleteConversation(id);
      if (resolvedActiveId === id) setActiveId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'チャットを削除できませんでした。',
      );
    } finally {
      setDeletingConversationId(null);
    }
  }

  // 未ログインの場合はClerkのログイン画面へ移動する
  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="チャット履歴を開く" onPress={() => setDrawerVisible(true)} style={styles.menuButton}><Text style={styles.menuIcon}>☰</Text></Pressable>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>AI TRAINING CHAT</Text><Text numberOfLines={1} style={styles.title}>{activeConversation?.title ?? 'AIコーチに相談'}</Text></View>
            <Pressable accessibilityLabel="新しいチャット" onPress={startNewChat} style={styles.newButton}><Text style={styles.newButtonText}>＋</Text></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.messages} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} ref={scrollRef} showsVerticalScrollIndicator={false}>
            {isLoadingHistory || isLoadingMessages ? (
              <View style={styles.welcome}>
                <ActivityIndicator color="#F6D365" size="large" />
                <Text style={styles.welcomeText}>保存済みのチャットを読み込んでいます…</Text>
              </View>
            ) : !activeConversation?.messages.length ? (
              <View style={styles.welcome}>
                <View style={styles.aiMark}><Text style={styles.aiMarkText}>AI</Text></View><Text style={styles.welcomeTitle}>筋トレについて相談してください</Text><Text style={styles.welcomeText}>あなたの目標・身体情報・トレーニング履歴を参考に回答します。</Text>
                <View style={styles.suggestions}>{['最近、胸の重量が伸びない', '疲れている日は休んでもいい？', '今日のメニューについて教えて'].map((suggestion) => <Pressable key={suggestion} onPress={() => setInput(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View>
              </View>
            ) : activeConversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending ? <View style={[styles.bubbleRow, styles.assistantRow]}><View style={styles.assistantBubble}><ActivityIndicator color="#F6D365" size="small" /><Text style={styles.thinkingText}>考えています…</Text></View></View> : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.inputArea}>
            <TextInput multiline onChangeText={setInput} placeholder="筋トレについて相談する" placeholderTextColor="#697169" style={styles.input} value={input} />
            <Pressable disabled={!input.trim() || isSending} onPress={sendMessage} style={[styles.sendButton, (!input.trim() || isSending) && styles.disabledSend]}><Text style={styles.sendText}>↑</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />

      <Modal animationType="slide" onRequestClose={() => setDrawerVisible(false)} transparent visible={drawerVisible}>
        <View style={styles.modalBackdrop}><Pressable onPress={() => setDrawerVisible(false)} style={styles.modalDismiss} /><SafeAreaView edges={['top', 'bottom']} style={styles.drawer}>
          <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>チャット履歴</Text><Pressable onPress={() => setDrawerVisible(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Pressable onPress={startNewChat} style={styles.drawerNewButton}><Text style={styles.drawerNewText}>＋ 新しいチャット</Text></Pressable>
          <ScrollView contentContainerStyle={styles.chatList}>
            {conversations.length === 0 ? <Text style={styles.emptyHistory}>過去のチャットはありません。</Text> : conversations.map((chat) => <View key={chat.id} style={[styles.chatRow, resolvedActiveId === chat.id && styles.activeChatRow]}><Pressable onPress={() => { setActiveId(chat.id); setDrawerVisible(false); }} style={styles.chatSelect}><Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text><Text style={styles.chatMeta}>{chat.serverConversationId ? (chat.messages.length > 0 ? `${chat.messages.length}メッセージ` : '保存済み') : '新しいチャット'}</Text></Pressable><Pressable accessibilityLabel={`${chat.title}を削除`} disabled={deletingConversationId !== null} onPress={() => void removeChat(chat.id)} style={styles.deleteButton}><Text style={styles.deleteText}>{deletingConversationId === chat.id ? '削除中…' : '削除'}</Text></Pressable></View>)}
          </ScrollView>
          <Text style={styles.drawerNote}>Neonに保存された本人のチャット履歴を表示しています。</Text>
        </SafeAreaView></View>
      </Modal>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.assistantRow]}>{!isUser ? <View style={styles.smallAiMark}><Text style={styles.smallAiText}>AI</Text></View> : null}<View style={isUser ? styles.userBubble : styles.assistantBubble}><Text style={isUser ? styles.userMessageText : styles.assistantMessageText}>{message.content}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#2C2924' }, menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, menuIcon: { color: '#F4F6F3', fontSize: 20 }, headerCopy: { flex: 1, marginHorizontal: 7 }, eyebrow: { color: '#FFF1B8', fontSize: 7, fontWeight: '700', letterSpacing: 1.2 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 15, fontWeight: '700' }, newButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 12 }, newButtonText: { color: '#FFF1B8', fontSize: 20 },
  messages: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 17 }, welcome: { alignItems: 'center', paddingTop: 42 }, aiMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#F6D365' }, aiMarkText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, welcomeTitle: { marginTop: 17, color: '#F4F6F3', fontSize: 18, fontWeight: '700', textAlign: 'center' }, welcomeText: { marginTop: 8, maxWidth: 290, color: '#737B75', fontSize: 10, lineHeight: 16, textAlign: 'center' }, suggestions: { width: '100%', gap: 8, marginTop: 22 }, suggestion: { padding: 13, borderWidth: 1, borderColor: '#303030', borderRadius: 13, backgroundColor: '#151515' }, suggestionText: { color: '#C9CECA', fontSize: 11, fontWeight: '700' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 }, userRow: { justifyContent: 'flex-end', paddingLeft: 45 }, assistantRow: { justifyContent: 'flex-start', paddingRight: 32 }, smallAiMark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', marginRight: 7, borderRadius: 13, backgroundColor: '#F6D365' }, smallAiText: { color: '#0A0A0A', fontSize: 7, fontWeight: '700' }, userBubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: '#F6D365' }, assistantBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: '#1C201D' }, userMessageText: { color: '#0A0A0A', fontSize: 12, fontWeight: '700', lineHeight: 19 }, assistantMessageText: { color: '#E8EBE8', fontSize: 12, lineHeight: 20 }, thinkingText: { color: '#8E978F', fontSize: 10 },
  error: { paddingHorizontal: 16, paddingBottom: 7, color: '#FF7676', fontSize: 10 }, inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#2C2924', backgroundColor: '#111111' }, input: { maxHeight: 110, minHeight: 46, flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 15, backgroundColor: '#0A0A0A', color: '#F4F6F3', fontSize: 12 }, sendButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F6D365' }, disabledSend: { opacity: 0.35 }, sendText: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' },
  modalBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' }, modalDismiss: { flex: 1 }, drawer: { width: '82%', backgroundColor: '#111111' }, drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#2C2924' }, drawerTitle: { color: '#F4F6F3', fontSize: 20, fontWeight: '700' }, closeText: { color: '#8E978F', fontSize: 26 }, drawerNewButton: { margin: 14, padding: 13, borderWidth: 1, borderColor: '#F6D365', borderRadius: 13 }, drawerNewText: { color: '#FFF1B8', fontSize: 12, fontWeight: '700', textAlign: 'center' }, chatList: { paddingHorizontal: 12 }, emptyHistory: { padding: 14, color: '#737B75', fontSize: 10 }, chatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, borderRadius: 12, backgroundColor: '#181C19' }, activeChatRow: { backgroundColor: '#302A12' }, chatSelect: { flex: 1, padding: 12 }, chatTitle: { color: '#E8EBE8', fontSize: 11, fontWeight: '600' }, chatMeta: { marginTop: 4, color: '#697169', fontSize: 8 }, deleteButton: { padding: 11 }, deleteText: { color: '#FF8D98', fontSize: 9, fontWeight: '600' }, drawerNote: { padding: 15, color: '#59605A', fontSize: 8, textAlign: 'center' },
});
