# Day 4：Clerk認証と本人の特定

[← Day 3](DAY_03.md) | [学習一覧](README.md) | [次のDayへ →](DAY_05.md)

## 今日できるようになること

- 認証と認可を区別する
- ClerkユーザーとNeonユーザーの結び付きを説明する
- 管理者だけが管理APIを使える仕組みを説明する

## 読むファイルの順番

1. [app/lib/auth/clerk-auth.ts](../app/lib/auth/clerk-auth.ts)
2. [app/api/users/bootstrap/route.ts](../app/api/users/bootstrap/route.ts)
3. [app/lib/admin/requireAdmin.ts](../app/lib/admin/requireAdmin.ts)
4. [app/api/admin/access/route.ts](../app/api/admin/access/route.ts)
5. [tests/source-security.test.mjs](../tests/source-security.test.mjs)

## 認証と認可

- 認証：通信している人が誰か確かめる
- 認可：その人が対象処理をしてよいか確かめる

ログイン済みでも、他人の記録IDを送る可能性があります。そのため、各APIはトークンから本人を取得し、その本人のデータだけを検索します。

## データの流れ

```text
Clerkログイン
→ Expoがトークン取得
→ Authorization: Bearer トークン
→ APIがClerkへ検証
→ clerkUserId取得
→ Neon users.clerkUserIdを検索
→ users.idで関連データを検索
```

## 管理者判定

`ADMIN_CLERK_USER_IDS`はサーバー環境変数です。`getAdminIdentity()`がログイン中のClerk IDと比較します。

Expoで管理ボタンを隠すのは見た目の制御です。直接URLを呼ばれても防げるように、APIも401または403で拒否します。

## 今日覚える文法

- `new Set([...])`：重複のない値の集合を作る
- `.split(",")`：カンマ区切り文字列を配列にする
- `.map()`：各要素を変換する
- `.filter(Boolean)`：空の値を除く
- `as const`：値を広い型へ変えず、その値の型として扱う

## 理解チェック

1. 401と403は何が違うか。
2. Expoから`userId`を送らせて信用しない理由は何か。
3. 一般ユーザーが`/admin`を直接開いた場合、どこで止まるか。
4. `ADMIN_CLERK_USER_IDS`をmobileへ書けない理由は何か。

[Day 5：API・HTTP・JSON・Zodへ →](DAY_05.md)
