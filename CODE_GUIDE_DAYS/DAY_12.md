# Day 12：AIメニュー生成

[← Day 11](DAY_11.md) | [学習一覧](README.md) | [次のDayへ →](DAY_13.md)

## 今日できるようになること

- `menuPrompt`、`aiInput`、OpenAI応答、保存の順番を説明する
- AIチャットとAIメニューの違いを説明する
- Structured OutputsとZodの役割を説明する

## 読むファイルの順番

1. [app/lib/ai/menuPrompt.ts](../app/lib/ai/menuPrompt.ts)
2. [app/lib/ai/menuSchema.ts](../app/lib/ai/menuSchema.ts)
3. [app/lib/ai/getUserAiContext.ts](../app/lib/ai/getUserAiContext.ts)
4. [app/api/ai-menu/route.ts](../app/api/ai-menu/route.ts)
5. [app/api/ai-menu/history/route.ts](../app/api/ai-menu/history/route.ts)
6. [mobile/src/lib/aiMenus.ts](../mobile/src/lib/aiMenus.ts)

## menuPromptの内容

- 目標体型、場所、週の頻度、可能時間を守る
- 最近鍛えた部位と最新身体分析を考慮
- 過去メニューと同じ内容が続きすぎないようにする
- 種目、セット、回数、重量目安、理由、注意点を返す
- 医療診断をしない
- 痛み・しびれがある場合は無理をさせない
- 指定されたJSON形式で返す

## 処理の順番

```text
POST /api/ai-menu
→ Clerk本人確認
→ 入力検査
→ 1日3回制限
→ getUserAiContext
→ aiInputを作る
→ menuPromptとaiInputをOpenAIへ送る
→ menuSchemaで応答検査
→ メニュー本体と種目をNeon保存
→ ExpoへJSONを返す
```

## `aiInput`とは

OpenAIへ送る本人情報をまとめた普通のオブジェクトです。ここでは返信を待っていません。実際に返信を待つのはOpenAI呼び出しへ付いた`await`です。

## AIチャットとの違い

- チャット：自然な文章を返し、必要に応じてToolを使う
- メニュー：画面表示と記録開始に使える決まったJSONを返す

## 利用制限

1日3回には最初の生成1回と再生成2回を含みます。最終制限はAPIで行うため、改造アプリでも超過できません。

## 理解チェック

1. `menuPrompt`と`route.ts`は何が違うか。
2. `aiInput`はどこからデータを受け取るか。
3. AIの回答をZodで検査する理由は何か。
4. 生成結果をDBへ保存する理由は何か。

[Day 13：身体分析へ →](DAY_13.md)
