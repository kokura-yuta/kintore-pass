import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { type ChatMessage, useChatHistory } from '@/contexts/ChatHistoryContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { useTrainingHistory } from '@/contexts/TrainingHistoryContext';

function createAssistantReply(message: string, trainingCount: number, hasMenu: boolean, weakParts: string[]) {
  if (message.includes('胸') && (message.includes('伸び') || message.includes('重量'))) {
    return `直近の保存済みトレーニングは${trainingCount}件です。胸の重量が停滞している場合は、同じ重量だけで続けず、回数を1〜2回増やす週と重量を少し上げる週を分けてみましょう。前回記録を見ながら、補助種目としてインクラインプレスを追加するのもおすすめです。`;
  }
  if (message.includes('疲') || message.includes('休')) {
    return '疲労が強い日は、重量を普段の70〜80%に下げるか休養日にして問題ありません。関節の痛みがある場合は無理に続けず、必要に応じて医療専門家へ相談してください。';
  }
  if (message.includes('メニュー')) {
    return hasMenu
      ? '今日生成したメニューがあります。まずは最初のセットを軽めに行い、調子に合わせて重量を調整してください。記録画面ではAIの推奨値をそのまま引き継げます。'
      : 'まだ今日のAIメニューが生成されていません。AIコーチ画面で今日の調子を入力すると、履歴と目標に合わせたメニューを作れます。';
  }
  const focus = weakParts.length ? weakParts.join('・') : '全身';
  return `現在の設定では、苦手部位は「${focus}」です。これまでの記録と今日の調子を見ながら、無理なく継続できる内容を提案します。種目名や困っている動きをもう少し具体的に教えてもらえれば、より詳しく答えられます。`;
}

export default function ChatScreen() {
  const { conversations, createConversation, deleteConversation, addMessage } = useChatHistory();
  const { profile } = useOnboarding();
  const { records } = useTrainingHistory();
  const { draft } = useTrainingDraft();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const resolvedActiveId = activeId ?? conversations[0]?.id ?? null;
  const activeConversation = conversations.find((chat) => chat.id === resolvedActiveId) ?? null;

  function startNewChat() {
    const id = createConversation();
    setActiveId(id);
    setDrawerVisible(false);
    setError('');
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isSending) return;
    let conversationId = resolvedActiveId;
    if (!conversationId) {
      conversationId = createConversation();
      setActiveId(conversationId);
    }
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content, createdAt: Date.now() };
    addMessage(conversationId, userMessage);
    setInput('');
    setError('');
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    try {
      addMessage(conversationId, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: createAssistantReply(content, records.length, Boolean(draft), profile.weakBodyParts),
        createdAt: Date.now(),
      });
    } catch {
      setError('AIからの返信を取得できませんでした。もう一度お試しください。');
    } finally {
      setIsSending(false);
    }
  }

  function removeChat(id: string) {
    deleteConversation(id);
    if (resolvedActiveId === id) setActiveId(null);
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
            {!activeConversation?.messages.length ? (
              <View style={styles.welcome}>
                <View style={styles.aiMark}><Text style={styles.aiMarkText}>AI</Text></View><Text style={styles.welcomeTitle}>筋トレについて相談してください</Text><Text style={styles.welcomeText}>あなたの目標・身体情報・トレーニング履歴を参考に回答します。</Text>
                <View style={styles.suggestions}>{['最近、胸の重量が伸びない', '疲れている日は休んでもいい？', '今日のメニューについて教えて'].map((suggestion) => <Pressable key={suggestion} onPress={() => setInput(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View>
              </View>
            ) : activeConversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {isSending ? <View style={[styles.bubbleRow, styles.assistantRow]}><View style={styles.assistantBubble}><ActivityIndicator color="#B6F24B" size="small" /><Text style={styles.thinkingText}>考えています…</Text></View></View> : null}
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
            {conversations.length === 0 ? <Text style={styles.emptyHistory}>過去のチャットはありません。</Text> : conversations.map((chat) => <View key={chat.id} style={[styles.chatRow, resolvedActiveId === chat.id && styles.activeChatRow]}><Pressable onPress={() => { setActiveId(chat.id); setDrawerVisible(false); }} style={styles.chatSelect}><Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text><Text style={styles.chatMeta}>{chat.messages.length}メッセージ</Text></Pressable><Pressable accessibilityLabel={`${chat.title}を削除`} onPress={() => removeChat(chat.id)} style={styles.deleteButton}><Text style={styles.deleteText}>削除</Text></Pressable></View>)}
          </ScrollView>
          <Text style={styles.drawerNote}>現在は起動中のみ履歴を保持します。</Text>
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
  screen: { flex: 1, backgroundColor: '#0B0D0C' }, safeArea: { flex: 1 }, header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#272C28' }, menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, menuIcon: { color: '#F4F6F3', fontSize: 20 }, headerCopy: { flex: 1, marginHorizontal: 7 }, eyebrow: { color: '#B6F24B', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 15, fontWeight: '900' }, newButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#343A35', borderRadius: 12 }, newButtonText: { color: '#B6F24B', fontSize: 20 },
  messages: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 17 }, welcome: { alignItems: 'center', paddingTop: 42 }, aiMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#B6F24B' }, aiMarkText: { color: '#0B0D0C', fontSize: 14, fontWeight: '900' }, welcomeTitle: { marginTop: 17, color: '#F4F6F3', fontSize: 18, fontWeight: '900', textAlign: 'center' }, welcomeText: { marginTop: 8, maxWidth: 290, color: '#737B75', fontSize: 10, lineHeight: 16, textAlign: 'center' }, suggestions: { width: '100%', gap: 8, marginTop: 22 }, suggestion: { padding: 13, borderWidth: 1, borderColor: '#2C312D', borderRadius: 13, backgroundColor: '#151816' }, suggestionText: { color: '#C9CECA', fontSize: 11, fontWeight: '700' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 }, userRow: { justifyContent: 'flex-end', paddingLeft: 45 }, assistantRow: { justifyContent: 'flex-start', paddingRight: 32 }, smallAiMark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', marginRight: 7, borderRadius: 13, backgroundColor: '#B6F24B' }, smallAiText: { color: '#0B0D0C', fontSize: 7, fontWeight: '900' }, userBubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: '#B6F24B' }, assistantBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: '#1C201D' }, userMessageText: { color: '#0B0D0C', fontSize: 12, fontWeight: '700', lineHeight: 19 }, assistantMessageText: { color: '#E8EBE8', fontSize: 12, lineHeight: 20 }, thinkingText: { color: '#8E978F', fontSize: 10 },
  error: { paddingHorizontal: 16, paddingBottom: 7, color: '#FF7676', fontSize: 10 }, inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#272C28', backgroundColor: '#111411' }, input: { maxHeight: 110, minHeight: 46, flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#343A35', borderRadius: 15, backgroundColor: '#0B0D0C', color: '#F4F6F3', fontSize: 12 }, sendButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#B6F24B' }, disabledSend: { opacity: 0.35 }, sendText: { color: '#0B0D0C', fontSize: 20, fontWeight: '900' },
  modalBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' }, modalDismiss: { flex: 1 }, drawer: { width: '82%', backgroundColor: '#111411' }, drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#272C28' }, drawerTitle: { color: '#F4F6F3', fontSize: 20, fontWeight: '900' }, closeText: { color: '#8E978F', fontSize: 26 }, drawerNewButton: { margin: 14, padding: 13, borderWidth: 1, borderColor: '#B6F24B', borderRadius: 13 }, drawerNewText: { color: '#B6F24B', fontSize: 12, fontWeight: '900', textAlign: 'center' }, chatList: { paddingHorizontal: 12 }, emptyHistory: { padding: 14, color: '#737B75', fontSize: 10 }, chatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, borderRadius: 12, backgroundColor: '#181C19' }, activeChatRow: { backgroundColor: '#252D20' }, chatSelect: { flex: 1, padding: 12 }, chatTitle: { color: '#E8EBE8', fontSize: 11, fontWeight: '800' }, chatMeta: { marginTop: 4, color: '#697169', fontSize: 8 }, deleteButton: { padding: 11 }, deleteText: { color: '#FF8D98', fontSize: 9, fontWeight: '800' }, drawerNote: { padding: 15, color: '#59605A', fontSize: 8, textAlign: 'center' },
});
