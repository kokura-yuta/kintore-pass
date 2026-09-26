# Day 3：マイグレーション・制約・インデックス

[← Day 2](DAY_02.md) | [学習一覧](README.md) | [次のDayへ →](DAY_04.md)

## 今日できるようになること

- schema変更をNeonへ反映する順番を説明する
- `UNIQUE`、`CHECK`、`INDEX`の目的を説明する
- 本番DBの前に開発ブランチで試す理由を説明する

## 読むファイルの順番

1. [drizzle.config.ts](../drizzle.config.ts)
2. [drizzle-postgres/0008_add_data_consistency_constraints.sql](../drizzle-postgres/0008_add_data_consistency_constraints.sql)
3. [drizzle-postgres/0012_orange_arclight.sql](../drizzle-postgres/0012_orange_arclight.sql)
4. [drizzle-postgres/0013_add_openai_estimated_cost.sql](../drizzle-postgres/0013_add_openai_estimated_cost.sql)
5. [tests/db-integration.test.mjs](../tests/db-integration.test.mjs)

## マイグレーションとは

DBを古い形から新しい形へ進める変更履歴です。アプリのアップデート後も既存利用者の記録を残したまま、列・表・制約を追加します。

## 3種類の守り

- `UNIQUE`：同じ値の重複を拒否する
- `CHECK`：重量、回数、金額などの範囲外を拒否する
- `FOREIGN KEY`：存在しない親データを指定させない

## INDEXとは

検索用の目印です。`user_id + 日付`のように、履歴取得で何度も使う条件へ追加します。読み取りは速くなりますが、保存時にindexも更新するため、不要なindexを増やしすぎません。

## 安全な作業順

1. `schema.ts`を変更
2. SQLを生成
3. SQL内容を人が確認
4. Neon開発ブランチへ適用
5. DB統合テスト
6. バックアップ・復元方法を確認
7. 本番Neonへ適用

## 工夫点

Zodで入力を拒否しても、古いアプリやバグのある処理がDBへ来る可能性があります。DB制約を最後の防波堤として置きます。

## 理解チェック

1. `drizzle-kit push`だけでなくSQL履歴を残す利点は何か。
2. ZodとDBの`CHECK`を両方用意する理由は何か。
3. indexを全列へ付けない理由は何か。
4. 開発ブランチで失敗した場合、本番データはどうなるか。

[Day 4：Clerk認証へ →](DAY_04.md)
