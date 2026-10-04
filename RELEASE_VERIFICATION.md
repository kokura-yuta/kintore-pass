# 公開前の確認状況（2026-10-04 更新）

## 2026-10-04 Expo / EAS移管後の確認

- 既存EASプロジェクトを`yoshida-create`から`kintorepas-team`へ移管済み。
- EAS Project ID `6ede25f5-d99e-49b1-9968-271cc4ae9e21`が維持されていることを確認済み。
- `mobile/app.json`の`owner`を`kintorepas-team`へ変更し、EAS CLIからプロジェクト情報を取得できることを確認済み。
- EASのdevelopment・previewへ開発用Clerk公開キー、公開API URL、Apple商品ID、開発バイパスOFF、撮影モードOFFを登録済み。
- EASのproductionへ公開API URL、Apple商品ID、開発バイパスOFF、撮影モードOFFを登録済み。本番Clerk公開キーは本番インスタンス作成後に登録する。
- iOS Simulator用`preview-simulator`プロファイルを追加し、EASビルドを開始済み。
- 実機向けinternal buildは、移管先Organization用のApple配布証明書・Provisioning Profile作成が必要なため未完了。
- Expo Doctor 21項目、mobile Lint、TypeScript型検査に合格。破壊的な`npm audit fix --force`は行っていない。

コード・疑似通信の検査と、実購入・実機検査を区別する。Sandbox購入・TestFlightテストは今回未実施。

## 今回の準備

- 審査資料の旧商品IDとBundle IDを現行値へ修正。
- EAS productionで開発バイパスと撮影モードをfalseに明示。
- 提出先App IDを6817630881に設定（Apple側の現状照合はログイン後）。
- 問い合わせメールをkintore505@gmail.comへ反映。公開デプロイは未実施。
- 課金API疑似通信4件、既存バックエンド安全性等40件成功。実購入を証明するテストではない。
- 友達の最新6コミットを取り込み、AI日次制限の独立台帳を最新Neon DBへ適用済み。
- AI日次制限の実DB同時送信テスト、全自動テスト、公開API検査に成功。
- 最新コードをSites公開版へ反映し、DB接続・未認証保護・Apple通知の不正署名拒否を確認済み。

## 購入・復元：未完了

Apple公式：https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/

運営者は無料Premiumになるため、購入テストには一般アカウントを使う。
以下はいずれも未実施。機種・iOS・ビルド番号・日時を結果とともに記録する。

| ケース | 期待結果 |
|---|---|
| 商品取得・購入 | Apple価格を表示し、サーバー検証後にPremium |
| キャンセル・通信失敗 | 誤ってPremiumにならず再操作可能 |
| 再起動・購入復元 | 同じ本人の契約を再確認してPremium |
| 購入なしの復元 | Premiumにならない |
| 別アプリユーザーで復元 | 他人の購入を付け替えられない |
| 更新・解約・期限切れ・返金 | 署名検証後に反映。期限終了後Free、記録保持 |

現在のApple検証はAPPLE_IAP_ENVIRONMENTで1環境を選択する。Sandboxテスト先を明確にし、本番契約のあるサーバーを無断で切り替えない。

## 本番環境・運営者：未完了

確認範囲はローカルのみ。公開先の設定がないと断定しない。

- 公開APIのClerkはまだ開発用で、ヘルスチェックは`authenticationMode: development`。
- 公開APIのDB接続、Clerk開発用キー、運営者IDは設定済み。Apple証明書とServer API設定は未完了。
- app.jsonのEAS projectIdと共同Organizationへの移管は完了し、このMacのEAS CLIからアクセスできる。productionの公開値は登録済みだが、本番Clerk公開キーは未登録。
- `musclepas-development`のmainが最新17テーブルを持つ。別プロジェクト`musclepas`のproductionは3テーブル不足のため、接続先整理が必要。
- 公開ドメインと運営者の公開名は未確定。

進める順序：

1. 公開ドメインを確定し、Clerk本番のドメイン・ログイン方法を設定。
2. 本番Clerkの運営者IDを確認し、サーバーのADMIN_CLERK_USER_IDSへ登録。メールで権限判定しない。
3. 同じClerkインスタンスの公開キーをEAS production、秘密キーを公開APIへ設定。秘密情報をGit・チャット・EXPO_PUBLICへ入れない。
4. バックエンド・Python APIとDB移行を確認。0017はAI_QUOTA_MIGRATION.mdの手順に従う。
5. Apple検証証明書・App ID・商品ID・Server APIキー・通知URLを環境に合わせて設定。
6. 運営者は許可、一般ユーザーは管理API拒否を実通信で確認。

## 審査資料：下書き更新済み／提出前

APP_STORE_SUBMISSION_PREP.mdを使用。App Privacyは本番の処理と外部提供先を照合して最終決定。
審査専用アカウントには運営管理権限を付与しない。パスワードをGitへ保存しない。
メール認証待ちで審査が停止しない方法をClerk設定と合わせて決定する。
課金・復元画面の実機画像は未撮影。既存画像はExpo Web素材で、実機検証済みではない。

## TestFlight：未完了

1. ExpoアカウントとEASプロジェクトを紐付け、Apple署名・本番環境を設定。
2. ビルド・アップロード後、iPhoneで認証、初回設定、記録の保存・編集・削除・再起動、AI制限、身体分析、購入・復元を確認。
3. 一般ユーザーA/Bでデータの表示・変更・削除が分離されていることを確認。
4. スクショを実機と照合し、最終資料を登録。

銀行・税務情報、契約同意、本人確認は運営者が行う。口座の暗証番号や確認コードはチャットへ送らない。
