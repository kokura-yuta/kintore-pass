# Day 6：初回設定・プロフィール・理想体型

[← Day 5](DAY_05.md) | [学習一覧](README.md) | [次のDayへ →](DAY_07.md)

## 今日できるようになること

- 起動から初回設定・ホームへの分岐を説明する
- StateとNeon保存の違いを説明する
- プロフィールの必須・任意項目を説明する

## 読むファイルの順番

1. [app/api/users/bootstrap/route.ts](../app/api/users/bootstrap/route.ts)
2. [app/api/users/goal/route.ts](../app/api/users/goal/route.ts)
3. [app/api/users/profile/route.ts](../app/api/users/profile/route.ts)
4. [app/api/users/onboarding-complete/route.ts](../app/api/users/onboarding-complete/route.ts)
5. [mobile/src/lib/bootstrap.ts](../mobile/src/lib/bootstrap.ts)
6. [mobile/src/app/bootstrap.tsx](../mobile/src/app/bootstrap.tsx)

## 起動時の流れ

```text
アプリ起動
→ Clerkセッション確認
→ GET /api/users/bootstrap
→ NeonのusersとuserProfilesを取得
→ onboardingCompletedを確認
→ falseなら初回設定
→ trueならホーム
```

## どこから何を取得するか

- Clerk：現在ログイン中の`clerkUserId`
- `users`：理想体型、初回設定完了状態
- `userProfiles`：身長、体重、体脂肪率、場所、頻度、時間、苦手部位
- API応答：Expoが画面分岐とContext復元に使うJSON

## 必須と任意

身長と体重だけを必須にします。体脂肪率や頻度が分からない利用者に、適当な値を入力させないためです。

- 未入力の任意数値：`null`
- 選択なしの複数項目：空配列`[]`
- 数値`0`：実際にゼロという意味なので未入力とは別

## 今日覚える文法

- `value?.property`：valueがない場合はエラーにせず`undefined`
- `value ?? null`：valueが`null`か`undefined`なら`null`
- `matchedRows[0] ?? null`：検索結果の先頭がなければ`null`

## 工夫点

bootstrapで起動に必要な情報をまとめて返します。画面ごとに複数APIを呼ぶより、初回分岐が安定し通信回数も減ります。

## 理解チェック

1. `onboardingCompleted`を端末だけへ保存すると、2台目で何が起きるか。
2. `null`と`0`は何が違うか。
3. 理想体型を変更した場合、どのAPIと列が変わるか。
4. bootstrapはなぜPOSTではなくGETなのか。

[Day 7：記録機能へ →](DAY_07.md)
