# Day 14：Apple課金・権利判定・管理ダッシュボード

[← Day 13](DAY_13.md) | [学習一覧](README.md) | [次のDayへ →](DAY_15.md)

## 今日できるようになること

- Apple購入をサーバーで検証する理由を説明する
- 有料機能の権利判定を説明する
- 管理データが現在のExpoアプリへ表示される流れを説明する

## 読むファイルの順番

1. [app/lib/subscriptions/policy.ts](../app/lib/subscriptions/policy.ts)
2. [app/lib/subscriptions/entitlements.ts](../app/lib/subscriptions/entitlements.ts)
3. [app/lib/subscriptions/appleVerification.ts](../app/lib/subscriptions/appleVerification.ts)
4. [app/api/subscription/route.ts](../app/api/subscription/route.ts)
5. [app/api/subscription/apple/verify/route.ts](../app/api/subscription/apple/verify/route.ts)
6. [app/api/subscription/apple/notifications/route.ts](../app/api/subscription/apple/notifications/route.ts)
7. [app/lib/admin/costConfig.ts](../app/lib/admin/costConfig.ts)
8. [app/api/admin/dashboard/route.ts](../app/api/admin/dashboard/route.ts)
9. [mobile/src/lib/admin.ts](../mobile/src/lib/admin.ts)
10. [mobile/src/app/admin.tsx](../mobile/src/app/admin.tsx)

## Apple課金の流れ

```text
iPhoneで購入
→ StoreKitから署名付き取引情報
→ TypeScript API
→ Apple署名・商品ID・期限・環境を検証
→ userSubscriptionsへ保存
→ 各有料APIが権利を確認
```

画面から送られた`premium: true`は信用しません。改造アプリでも偽装できないように、Appleが署名した取引情報をサーバーで検証します。

## 更新・解約

アプリを開いていない間にも契約状態は変わります。Apple Server Notifications V2が更新・解約・返金をバックエンドへ知らせ、Neonの状態を更新します。

## 管理画面のデータの流れ

```text
管理者がExpoのマイページを開く
→ GET /api/admin/access
→ 管理者なら入口を表示
→ mobile/src/app/admin.tsx
→ GET /api/admin/dashboard
→ Neonの契約・AI使用量・件数・容量を集計
→ Expoへ管理JSON
```

旧Web版[app/admin/page.tsx](../app/admin/page.tsx)もPC用として残し、同じAPIを使います。

## 収益計算

- 売上 = 有料人数 × 月額料金
- Apple入金見込 = 売上 − Apple手数料
- 合計運営コスト = Apple手数料 + OpenAI + Neon + その他
- 税引前利益 = 売上 − 合計運営コスト
- 利益率 = 税引前利益 ÷ 売上 × 100

税金は事業形態や経費で変わるため計算せず、税引前と表示します。収入は青、支出は赤、利益は緑です。

## 管理者セキュリティ

管理者ID一覧はバックエンド環境変数だけに置きます。Expoが入口を隠しても、APIは必ず管理者確認してからDB集計を始めます。

## 理解チェック

1. Appleの購入状態をフロントだけで判断できない理由は何か。
2. `verify` APIとnotifications APIの役割は何が違うか。
3. 管理画面の実測値と推定値を挙げられるか。
4. 一般ユーザーが管理APIを直接呼んだらどうなるか。

[Day 15：セキュリティ・公開へ →](DAY_15.md)
