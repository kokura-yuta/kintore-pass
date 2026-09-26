# Day 10：OpenAI共通設定・モデル・出力検査

[← Day 9](DAY_09.md) | [学習一覧](README.md) | [次のDayへ →](DAY_11.md)

## 今日できるようになること

- AI機能ごとにモデルを分ける理由を説明する
- `max_output_tokens`と文字数制限の役割を説明する
- AI出力をZodで再検査する理由を説明する

## 読むファイルの順番

1. [app/lib/ai/openAiClient.ts](../app/lib/ai/openAiClient.ts)
2. [app/lib/ai/config.ts](../app/lib/ai/config.ts)
3. [app/lib/ai/menuSchema.ts](../app/lib/ai/menuSchema.ts)
4. [app/lib/ai/bodyAnalysisSchema.ts](../app/lib/ai/bodyAnalysisSchema.ts)
5. [app/lib/ai/recordOpenAiUsage.ts](../app/lib/ai/recordOpenAiUsage.ts)
6. [app/lib/admin/costConfig.ts](../app/lib/admin/costConfig.ts)

## モデル分離

- 通常チャット：安価な`OPENAI_CHAT_MODEL`
- メニュー生成：`OPENAI_MENU_MODEL`
- 身体分析：Python側の画像対応モデル

モデル名をコードへ固定せず環境変数で管理するため、公開後も料金と精度を調整できます。

## 入出力制限

- 利用者のチャット入力：最大500文字
- 通常回答：400文字程度
- OpenAI生成：`max_output_tokens`で上限
- 直近会話：5往復
- 古い会話のsummary：最大800文字

画面表示の文字数制限だけでなく、API呼び出し前に止めることで実際の料金を抑えます。

## AI出力の検査

AIが返すJSONは外部入力です。TypeScriptの型を付けただけでは安全にならないため、`menuSchema`や`bodyAnalysisResultSchema`で項目・型・範囲を実行時に検査します。

## 使用量と料金

OpenAI応答の`usage`からinput/output/total tokensを取得します。モデル単価を掛け、機能・利用者・日時と一緒にNeonへ保存します。

## 今日覚える文法

- `process.env.NAME`：サーバー環境変数を読む
- `Number(value)`：文字列などを数値へ変換
- `Math.max/min`：設定値を安全な範囲へ収める
- `z.infer<typeof schema>`：ZodからTypeScript型を作る

## 理解チェック

1. AIモデル名をコードへ固定しない理由は何か。
2. 出力token上限と最終文字数制限を両方持つ理由は何か。
3. `usage`のinputとoutputを分けて保存する理由は何か。
4. AIがJSONを返しても、そのままNeonへ保存しない理由は何か。

[Day 11：AIチャットへ →](DAY_11.md)
