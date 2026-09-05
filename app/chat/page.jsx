"use client";

import { useState } from "react";

export default function ChatPage() {
  // 入力途中の文章と、画面内の会話履歴を管理する場所
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // AIの回答待ち状態と、通信失敗時のメッセージを管理する場所
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 入力した質問を送信し、バックエンドの回答を会話履歴へ追加する処理
  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = draftMessage.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    // 理想の体で保存した目標体型をチャット用データとして読み取る場所
    const goalBodyType =
      localStorage.getItem("goalBodyType") ?? "";

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    setDraftMessage("");
    setIsSending(true);
    setErrorMessage("");

    try {
      // 質問をバックエンドへ送り、返されたJSONを読み取る場所
      const response = await fetch("/api/chat", {
        
          method: "POST",
          //JSONを送ることを伝える部分です。
          headers: {
            "Content-Type": "application/json",
          },
          //送るデータです。
          body: JSON.stringify({
            message: trimmedMessage,
            userData: {
              goalBodyType,
            },
          }),
        });
      const data = await response.json();

      // バックエンドのreplyをAI側のメッセージへ変換する場所
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          data.reply,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch {
      setErrorMessage(
        "回答を取得できませんでした。もう一度お試しください。"
      );
    } finally {
      setIsSending(false);
    }
  }

  // Enterで送信し、Shift + Enterでは改行するための処理
  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="chatPage">
      {/* トップページへ戻るリンクと、チャット画面の見出し */}
      <header className="chatPageHeader">
        <p className="eyebrow">AI TRAINING PARTNER</p>
        <h1>AIチャット</h1>
        <p>トレーニングの悩みや、今日やることを相談できます。</p>
      </header>

      {/* 会話履歴と入力欄をまとめるチャット本体 */}
      <section className="chatPanel">
        {/* 保存された会話履歴を吹き出しとして表示する場所 */}
        <div className="chatMessages chatPageMessages">
          {messages.length === 0 && (
            <p className="chatEmptyMessage">
              「今日は何する？」など、気になることを入力してください。
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chatMessage ${message.role}`}
            >
              <p>{message.content}</p>
            </div>
          ))}

          {/* AIが回答を作成している間だけ表示する状態 */}
          {isSending && (
            <p className="chatStatus">AIが回答を作成中...</p>
          )}

          {/* AI通信に失敗した場合だけ表示するエラー */}
          {errorMessage && (
            <p className="chatError" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {/* AIへ送る質問を入力・送信するフォーム */}
        <form className="chatForm" onSubmit={handleSubmit}>
          <label className="chatLabel" htmlFor="chatMessage">
            AIへの質問
          </label>

          <textarea
            id="chatMessage"
            className="chatInput"
            rows={1}
            value={draftMessage}
            placeholder="例：今日は何をすればいい？"
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            className="chatSendButton"
            type="submit"
            disabled={isSending || !draftMessage.trim()}
          >
            {isSending ? "送信中..." : "送信"}
          </button>
        </form>
      </section>
    </main>
  );
}
