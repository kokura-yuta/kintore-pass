# Day 5：API・HTTP・JSON・Zod

[← Day 4](DAY_04.md) | [学習一覧](README.md) | [次のDayへ →](DAY_06.md)

## 今日できるようになること

- `route.ts`の基本順序を説明する
- GET、POST、PATCH、DELETEを使い分ける
- TypeScriptの型とZodの違いを説明する

## 読むファイルの順番

1. [app/lib/validation/jsonValidation.ts](../app/lib/validation/jsonValidation.ts)
2. [app/lib/validation/apiSchemas.ts](../app/lib/validation/apiSchemas.ts)
3. [app/api/users/profile/route.ts](../app/api/users/profile/route.ts)
4. [mobile/src/lib/profiles.ts](../mobile/src/lib/profiles.ts)
5. [mobile/src/lib/api.ts](../mobile/src/lib/api.ts)

## route.tsの基本順序

1. Clerkトークンから本人を確認
2. `request.json()`でJSONを受け取る
3. Zodの`safeParse()`で入力検査
4. Neonから本人データを検索
5. 取得・保存・更新・削除
6. `Response.json()`で必要な情報だけ返す
7. 例外時は秘密を含まないエラーを返す

## HTTPメソッド

- `GET`：情報を取得する
- `POST`：新しい行や処理を作る
- `PATCH`：既存データの一部を変更する
- `DELETE`：既存データを削除する

POSTはDB保存だけでなく、AI生成を開始する場合にも使います。

## JSONの向き

- `await request.json()`：フロントから届いたJSONをTypeScriptの値へ変える
- `Response.json(value)`：TypeScriptの値をフロントへ返すJSONにする

## TypeScript型とZod

TypeScriptの型は開発中の間違いを見つけますが、外部から届いたJSONを実行時には止めません。Zodは実行中に文字数・数値範囲・必須項目を検査します。

## 今日覚える文法

```ts
const parsed = profileSchema.safeParse(body);
if (!parsed.success) return errorResponse;
const input = parsed.data;
```

検査成功後は`parsed.data`だけを信用します。元の`body`をそのままDBへ保存しません。

## 理解チェック

1. フロントで入力検査していてもAPIで再検査する理由は何か。
2. `request.json()`と`Response.json()`は何が逆向きか。
3. 400、401、403、404、409、429、500を使う場面は何か。
4. `async / await`が必要になる処理を3つ挙げられるか。

[Day 6：初回設定へ →](DAY_06.md)
