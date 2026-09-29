# Day 11：AIチャット・Tool・長期記憶

[← Day 10](DAY_10.md) | [学習一覧](README.md) | [次のDayへ →](DAY_12.md)

## 今日できるようになること

- system prompt、会話履歴、Toolの違いを説明する
- 長期記憶を要約する理由を説明する
- 1回の質問でOpenAIへ何を送るか説明する

## 読むファイルの順番

1. [app/lib/ai/systemPrompt.js](../app/lib/ai/systemPrompt.js)
2. [app/lib/ai/chatTools.ts](../app/lib/ai/chatTools.ts)
3. [app/lib/ai/runChatTool.ts](../app/lib/ai/runChatTool.ts)
4. [app/lib/ai/chatSummary.ts](../app/lib/ai/chatSummary.ts)
5. [app/lib/ai/checkModeration.ts](../app/lib/ai/checkModeration.ts)
6. [app/api/chat/route.ts](../app/api/chat/route.ts)
7. [mobile/src/lib/chatApi.ts](../mobile/src/lib/chatApi.ts)

## system promptの役割

AIへ常に守らせる基本ルールです。

- 筋トレ支援に集中する
- 本人の目標・身体・運動・食事情報を使う
- 短く具体的に答える
- 医療診断をしない
- 鋭い痛みやしびれでは運動中止と医療相談を案内
- 薬の処方や断定をしない

## 1回の質問で送るもの

1. system prompt
2. 古い会話から作った短いsummary
3. 直近5往復
4. 今回の質問
5. AIが必要な場合だけ呼べるTool定義

## Toolの二つのファイル

- `chatTools.ts`：AIへ「使えるTool名と引数」を教える仕様書
- `runChatTool.ts`：選ばれたToolに応じてNeonを検索する実行処理

AIへDB接続を渡すのではありません。AIはTool名を選び、サーバーが安全に本人データを取得します。

## 長期記憶

チャット履歴そのものはNeonへ保存します。しかしOpenAIへ毎回全履歴を送りません。古い会話から目標、頻度、苦手部位、器具、重要相談だけをsummaryへ残します。

## コスト・安全対策

- 1人1日30回
- 入力500文字
- 回答約400文字
- Tool最大実行回数
- 1送信につき基本1回の生成
- Moderationで危険な入力を分類
- tokenと料金を保存

## 今日覚える文法

- `switch (toolName)`：Tool名ごとに処理を分岐
- `case`：該当する分岐
- `break/return`：その分岐を終了
- `JSON.parse()`：JSON文字列を値へ変換。ただし検査も必要

## 理解チェック

1. Toolと普通の会話履歴の違いは何か。
2. DBへ全履歴を保存することと、OpenAIへ全履歴を送ることは同じか。
3. summaryへ残す情報を3つ挙げられるか。
4. AIへ直接SQLを書かせない理由は何か。

[Day 12：AIメニューへ →](DAY_12.md)
