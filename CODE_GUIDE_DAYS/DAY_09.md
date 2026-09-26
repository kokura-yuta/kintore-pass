# Day 9：AIへ渡す本人情報

[← Day 8](DAY_08.md) | [学習一覧](README.md) | [次のDayへ →](DAY_10.md)

## 今日できるようになること

- AIが利用者の目標を知る仕組みを説明する
- `getUserAiContext()`の戻り値を説明する
- 全履歴をAIへ送らない理由を説明する

## 読むファイルの順番

1. [app/lib/ai/getUserAiContext.ts](../app/lib/ai/getUserAiContext.ts)
2. [db/schema.ts](../db/schema.ts)
3. [app/lib/ai/chatSummary.ts](../app/lib/ai/chatSummary.ts)
4. [app/api/home/route.ts](../app/api/home/route.ts)

## どの表から何を持ってくるか

- `users`：理想体型
- `userProfiles`：身長、体重、体脂肪率、場所、頻度、時間、苦手部位
- `bodyAnalyses`：最新の身体分析
- `trainingSessions`以下：最近のトレーニング
- `foodRecords`：最近の食事
- `aiMenus`：最近作ったAIメニュー

## 関数の形

```ts
export async function getUserAiContext(
  clerkUserId: string,
): Promise<UserAiContext | null>
```

- `clerkUserId: string`：Clerk IDを文字列で受け取る
- `async`：Neon検索を待つ非同期関数
- `Promise<...>`：将来結果が返る
- `UserAiContext | null`：本人情報、または利用者が見つからない`null`

この関数自体がログイン処理をするのではありません。route.tsで認証した後、そのClerk IDを使ってNeonから本人データを集めます。

## `leftJoin`の理由

プロフィールがまだ存在しない利用者でも、`users`行は取得したい場合に使います。`innerJoin`では両方に行がある人だけが残ります。

## コストの工夫

全履歴をOpenAIへ送ると、トークン料金と待ち時間が増えます。最新情報、直近記録、集計値へ絞ります。

## セキュリティ

AIへ不要なメール、Clerk ID、内部UUID、秘密情報を送りません。質問に必要な身体・運動・食事情報だけを渡します。

## 理解チェック

1. `Promise<UserAiContext | null>`を一文で説明できるか。
2. `leftJoin`と`innerJoin`の違いは何か。
3. `getUserAiContext`はどこから呼ばれるか。
4. 全トレーニング履歴を毎回送らない理由は何か。

[Day 10：OpenAI共通設定へ →](DAY_10.md)
