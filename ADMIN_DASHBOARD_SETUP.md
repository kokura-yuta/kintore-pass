# 運営ダッシュボード設定

運営ダッシュボードはWeb版の`/admin`、集計APIは`GET /api/admin/dashboard`です。一般ユーザーには集計データを返しません。

## 必須設定

公開先のサーバー環境変数へ設定します。秘密情報をモバイル側へ設定しないでください。

```text
ADMIN_CLERK_USER_IDS=user_xxx,user_yyy
PREMIUM_MONTHLY_PRICE_YEN=1000
APPLE_COMMISSION_PERCENT=15
OPENAI_MODEL_PRICING_JSON={"実際のモデル名":{"inputYenPerMillionTokens":0,"outputYenPerMillionTokens":0}}
```

`OPENAI_MODEL_PRICING_JSON`の金額はOpenAIの最新料金と為替を確認して設定します。未設定モデルは0円として集計され、管理画面に警告が出ます。

## 任意設定

```text
NEON_PLAN_NAME=Free
NEON_MONTHLY_COST_YEN=0
NEON_STORAGE_LIMIT_BYTES=0
OTHER_INFRA_MONTHLY_COST_YEN=0
ADMIN_WARNING_OPENAI_MONTHLY_YEN=5000
ADMIN_WARNING_OPENAI_REVENUE_PERCENT=5
ADMIN_WARNING_USER_AI_MONTHLY_YEN=100
ADMIN_WARNING_NEON_STORAGE_PERCENT=80
```

## 数値の扱い

- OpenAIトークン数：APIレスポンスのusageから取得する実測値
- OpenAI料金：設定したモデル単価と実測トークン数から計算する推定値
- Neonの件数・DB容量：PostgreSQLから取得する実測値
- Neon料金・プラン上限：環境変数から取得する推定値
- 売上：有効な有料ユーザー数×月額料金の推定値
- Apple手数料：推定売上×設定手数料率
- 推定利益：売上－Apple手数料－OpenAI－Neon－その他費用

OpenAI利用機能は`chat`、`menu`、`body-analysis`、`summary`、`other`の5種類に分けて保存できます。新しいAI機能を追加した場合は、既存4種類へ無理に混ぜず`other`として記録できます。

## DB反映

`drizzle-postgres/0013_add_openai_estimated_cost.sql`を対象DBへ一度だけ適用します。この変更では推定料金列を追加し、利用機能の`other`も保存可能にします。適用後のOpenAI呼び出しは、トークン数に加えて呼び出し時点の推定料金も保存します。移行前の行は管理画面表示時に現在の設定単価で再計算します。

## App Store Connect本格連携

現在の売上は有料ユーザー数からの推定です。実際の入金額へ切り替える場合は、App Store Connect API用のIssuer ID・Key ID・秘密鍵をバックエンドだけに設定し、Sales and Trendsレポートを定期取得して月次売上テーブルへ保存します。
