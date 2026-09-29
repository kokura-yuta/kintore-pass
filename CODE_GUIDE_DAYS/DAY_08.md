# Day 8：一括保存・二重送信・アカウント削除

[← Day 7](DAY_07.md) | [学習一覧](README.md) | [次のDayへ →](DAY_09.md)

## 今日できるようになること

- トランザクションと二重送信対策を区別する
- 途中失敗で親データだけ残る問題を説明する
- アカウント削除に強い本人確認が必要な理由を説明する

## 読むファイルの順番

1. [app/lib/idempotency/createRequestFingerprint.ts](../app/lib/idempotency/createRequestFingerprint.ts)
2. [app/api/training-records/route.ts](../app/api/training-records/route.ts)
3. [app/api/body-analysis/route.ts](../app/api/body-analysis/route.ts)
4. [app/api/users/account/route.ts](../app/api/users/account/route.ts)
5. [mobile/src/lib/account.ts](../mobile/src/lib/account.ts)
6. [mobile/src/app/my-page.tsx](../mobile/src/app/my-page.tsx)

## トランザクション

親・種目・セットを順番に保存し、途中で失敗すると親だけ残る可能性があります。トランザクションは「全部成功したら確定、1つでも失敗したら全部取り消す」仕組みです。

## 二重送信対策

通信が遅いと保存ボタンを2回押すことがあります。`requestId`や入力内容の指紋を使い、同じ処理を再送しても1件だけ保存します。これをidempotencyと呼びます。

## 両者の違い

- トランザクション：1回の処理の途中失敗を守る
- idempotency：同じ処理が複数回来ることを守る

## アカウント削除の流れ

1. 画面で`DELETE`入力
2. Clerkで本人再確認
3. APIでトークンと確認文字を検査
4. Neonの本人を削除
5. 外部保存データがあれば削除
6. Clerkアカウントを削除

`cascade`によりプロフィール・記録・分析・AI履歴も削除されます。

## セキュリティ

アカウント削除は取り消せません。ログイン中というだけでは、端末を一時的に触った第三者でも実行できるため、Clerkの再確認を要求します。

## 理解チェック

1. トランザクションとidempotencyの違いは何か。
2. 外部サービス削除とNeon削除の片方だけ失敗した場合、何が問題か。
3. `DELETE`確認文字をフロントだけで検査してはいけない理由は何か。
4. cascadeで消える表を`schema.ts`から探せるか。

[Day 9：AI本人情報へ →](DAY_09.md)
