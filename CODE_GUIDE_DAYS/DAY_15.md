# Day 15：セキュリティ・監視・テスト・公開

[← Day 14](DAY_14.md) | [学習一覧](README.md) | [全体版コードガイド](../CODE_GUIDE.md)

## 今日できるようになること

- セキュリティを複数の層で説明する
- 各テストが何を守るか説明する
- 開発環境からApp Store公開までの順番を説明する

## 読むファイルの順番

1. [app/lib/observability/serverLog.ts](../app/lib/observability/serverLog.ts)
2. [app/lib/ai/checkModeration.ts](../app/lib/ai/checkModeration.ts)
3. [app/lib/ai/moderationDecision.ts](../app/lib/ai/moderationDecision.ts)
4. [app/lib/ai/createSafetyIdentifier.ts](../app/lib/ai/createSafetyIdentifier.ts)
5. [tests/source-security.test.mjs](../tests/source-security.test.mjs)
6. [tests/api-safety.test.mjs](../tests/api-safety.test.mjs)
7. [tests/db-integration.test.mjs](../tests/db-integration.test.mjs)
8. [tests/public-api-smoke.test.mjs](../tests/public-api-smoke.test.mjs)
9. [.gitignore](../.gitignore)
10. [現在の開発ロードマップ](../DEVELOPMENT_ROADMAP.md)

## セキュリティの7層

### 1. 端末に秘密を置かない

DB接続文字列、Clerk Secret、OpenAI API Key、Apple秘密鍵、管理者IDはバックエンド環境変数へ置きます。

### 2. 全APIで本人を確認する

トークンから本人を取得し、更新・削除のWHERE条件にも本人の`userId`を入れます。

### 3. 入力を信用しない

Zodで文字数、数値、日付、UUID、配列件数を検査します。画像は実体、形式、破損、容量も検査します。

### 4. 利用量を制限する

- AIチャット：1日30回
- AIメニュー：1日3回
- 身体分析：初回無料、有料は月4回
- チャット入力：500文字
- AI出力、Tool、タイムアウトにも上限

料金対策だけでなく、大量リクエスト攻撃の対策にもなります。

### 5. ログへ個人情報を出さない

画像、トークン、質問本文、身体情報、秘密鍵をログへ出しません。request ID、機能名、エラー分類、token数など必要最小限だけ記録します。

### 6. AIを信用しすぎない

Moderation、system prompt、出力制限、Zod出力検査を重ねます。痛みやしびれは医療診断せず、運動中止と専門家相談を案内します。

### 7. 管理機能を分離する

管理APIは管理者認可に失敗したら、Neonを集計する前に401または403を返します。

## テストの役割

- `test:unit`：入力検査、料金計算、AI安全ルール
- `test:source-security`：秘密情報、認証、管理者ガード
- `test:python`：画像検査、OpenAIエラー
- `test:mobile-api`：ExpoのURL、method、JSON
- `test:db`：実Neonの制約・保存・削除
- `test:public`：公開URLと未ログイン保護
- TypeScript：データ型の不一致
- Lint：危険・読みにくい書き方
- Build：公開用コードを最後まで作れるか

## 公開順序

1. 開発Neonでマイグレーション
2. 全自動テスト
3. 本番Neonへマイグレーション
4. 本番環境変数を設定
5. バックエンド公開
6. Expoを公開APIへ接続
7. 2ユーザー分離テスト
8. iPhone実機テスト
9. Sandbox課金
10. TestFlight
11. App Store申請

## 最終理解チェック

1. Expoの入力がNeonへ保存されるまでをファイル名付きで説明できるか。
2. Clerk IDとNeonの`users.id`の違いを説明できるか。
3. TypeScript型とZodとDB制約の違いを説明できるか。
4. AIが本人情報をどの表から取得するか説明できるか。
5. 身体分析がTypeScriptとPythonを通る理由を説明できるか。
6. 一般ユーザーが他人の記録と管理画面へ入れない仕組みを説明できるか。

## 1周後の練習

好きな機能を一つ選び、紙へ次を書いてください。

```text
画面ファイル
→ mobile通信ファイル
→ API URL
→ route.ts
→ Clerk認証
→ Zod
→ Neonテーブル
→ 応答JSON
→ 画面表示
```

ここまで書ければ、新しい機能でも「どこへ何を書くか」を判断する土台ができています。

[学習一覧へ戻る](README.md) | [現在のロードマップを見る](../DEVELOPMENT_ROADMAP.md)
