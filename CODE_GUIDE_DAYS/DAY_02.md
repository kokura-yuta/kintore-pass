# Day 2：Neon接続とDBスキーマ

[← Day 1](DAY_01.md) | [学習一覧](README.md) | [次のDayへ →](DAY_03.md)

## 今日できるようになること

- Neon、PostgreSQL、Drizzleの関係を説明する
- `db/index.ts`と`db/schema.ts`の役割を区別する
- 主キー、外部キー、`cascade`を説明する

## 読むファイルの順番

### 1. [db/index.ts](../db/index.ts)

`getDb()`を呼ぶと、環境変数`DATABASE_URL`を使ってNeonへ接続します。各APIが別々に接続設定を書くのではなく、ここを共通利用します。

### 2. [db/schema.ts](../db/schema.ts)

Neonへ保存するテーブル・列・型・関連をTypeScriptで定義します。ここは設計図であり、このファイルを保存しただけでは本番DBは変わりません。

### 3. [drizzle.config.ts](../drizzle.config.ts)

Drizzle Kitへ、スキーマの場所、SQLの出力先、接続先を教える設定です。

### 4. [drizzle-postgres/0000_create_users.sql](../drizzle-postgres/0000_create_users.sql)

最初の`users`テーブルを実際のPostgreSQLへ作成するSQLです。

## `pgTable`の読み方

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
});
```

- `users`：TypeScript内の名前
- `pgTable("users", ...)`：PostgreSQLに`users`表を定義
- `uuid("id")`：DB上の`id`列はUUID型
- `.primaryKey()`：その行を一意に特定する主キー

## 外部キーのまとまり

```ts
userId: uuid("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" })
```

- `user_id`を必須にする
- `users.id`に存在する人だけを指定できる
- 親ユーザーを削除すると関連データも削除する

## データの流れ

`route.ts → getDb() → Drizzle → DATABASE_URL → Neon PostgreSQL`

route.tsは「何を検索・保存するか」を指定し、DrizzleがTypeScriptの命令をSQLへ変換します。

## セキュリティ

DB接続文字列をmobileへ入れてはいけません。第三者がAPIの本人確認を通らず、DBへ直接アクセスできる危険があるためです。

## 理解チェック

1. `schema.ts`を変更しただけで本番Neonは変わるか。
2. 主キーと外部キーは何が違うか。
3. `onDelete: "cascade"`がアカウント削除で役立つ理由は何か。
4. `users.id`と`users.clerkUserId`の役割は何か。

[Day 3：マイグレーションへ →](DAY_03.md)
