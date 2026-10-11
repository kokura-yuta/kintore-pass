# Macでの次回TestFlight配布引き継ぎ

更新日：2026-10-11。これは配布手順であり、配布完了報告ではありません。

## 現在地

- 共有mainの確認地点：`0f39ff4`。今日のAI統合コミット`8d851d4`を含む。
- 共有進捗によるとBuild 19はApple処理完了・既存内部テストグループへ割当済み。実機更新は別途必要。
- Build 19の作成元は`c228557`で、食事の任意入力・カレンダー、AIタブ統合は未収録。
- 次は共有mainの全変更を含める。Build 19の古い作業フォルダを再利用しない。
- このWindowsではiOSのローカルビルドは行わない。友達のMacを使用し、Expoのプラン変更はしない。

## 配布前の停止条件：食事のサーバー対応（未完了）

次の項目が確認できるまで、全変更版をテスターへ配布しないこと。

1. 本番DB/API担当者と反映状況を照合する。現在の共有記録では未適用。
2. 旧Build 19以下の食事表示はnull未対応。新アプリが栄養値未入力の記録を作った後、同じアカウントで旧版を開くと不具合になり得る。旧クライアント向けAPI互換処理を実装・検証するか、全テスターの更新と旧版利用停止を確実に調整する。未入力を無断でDBの0に変換しない。
3. 対象が本番Neonであること、バックアップ／復旧方法を確認したうえで、`drizzle-postgres/0021_optional_food_nutrients.sql`を適用する。既存値は変更せず、栄養値のNOT NULLとたんぱく質の0既定値を解除する。全マイグレーションの一括再実行やschema pushはしない。
4. 公開バックエンドへ以下の変更と互換対策を反映する。友達側の最新公開変更・環境変数を保持する。
   - `app/api/food-records/route.ts`
   - `app/lib/validation/apiSchemas.ts`
   - `app/lib/ai/getUserAiContext.ts`
   - `db/schema.ts`
5. 本番のテストアカウントで、栄養値空欄・実入力0・通常値の保存／取得／編集／削除、日別合計、別ユーザーからアクセスできないことを確認する。APIの未認証401だけでは完了扱いにしない。

## Mac側の準備

- Xcode、CocoaPods、fastlane、Node.jsを準備。Build 19で成功した署名・ツール設定を維持する。
- EASログイン先が共同Organizationへアクセスできることを確認。
- Expo owner：`kintorepas-team`
- EAS Project ID：`6ede25f5-d99e-49b1-9968-271cc4ae9e21`
- Bundle ID：`com.kintorepas.app`
- App Store Connect App ID：`6817630881`
- 商品ID：`com.kintorepas.premium.monthly`
- 新規Expoプロジェクト作成・ID変更・署名証明書の不用意な再発行はしない。

## ソースと本番設定

1. 既存の未コミット作業を消さず、配布専用の新しいチェックアウトで共有mainを取得する。
2. 作成元のcommit SHAを記録し、上記コミットを含むことを確認する。並行変更があれば内容を確認する。
3. rootとmobileの依存関係を各`npm ci`で復元する。
4. rootで`npm run test:mobile-types`、`npm run test:unit`、`npm run test:mobile-api`を実行する。mobileで`npm run lint`と`npm run test:plan`を実行する。
5. 開発用`.env.local`をコピーしない。mobileで`npx eas-cli env:pull --environment production`を使い、本番設定を準備する。生成されたenvファイルはGitへ追加しない。
6. 本番APIのHTTPS URLとClerkの`pk_live_`公開キーを確認。ローカルURL・`pk_test_`・開発用認証回避は使わない。`EXPO_PUBLIC_ENABLE_API_BYPASS=false`、`EXPO_PUBLIC_SCREENSHOT_MODE=false`を確認する。
7. Secret visibilityのEAS環境変数はローカルビルドでは取得されない。必要なビルド用値だけMacの環境へ安全に設定する。DB接続文字列・Clerk秘密キー・OpenAI秘密キーはアプリへ入れない。

## 作成と送信（上の停止条件を解消してから）

App Store Connectで使用済み番号を再確認する。現時点では19が使用済み。
`eas.json`はローカル番号管理・productionのautoIncrement=trueなので、19を基準にすると次は20。並行作業で20以降が使用済みなら、作成前に基準番号を調整する。

mobileディレクトリで、未使用の出力ファイル名を指定：

```sh
npx eas-cli build --platform ios --profile production --local --output ./kintorepas-next.ipa
```

成功したIPAのBundle ID・バージョン・ビルド番号と本番API／Clerk設定を検証し、その同じIPAを送る：

```sh
npx eas-cli submit --platform ios --profile production --path ./kintorepas-next.ipa
```

`--latest`は別のクラウドビルドを選ぶおそれがあるため使わない。IPAや秘密ファイルはGitへ追加しない。同じ番号で再送信する前にAppleの受付状況を確認する。

## 完了条件

- Apple側の処理完了と「筋トレPAS 開発テスト」グループへの新ビルド割当を確認。
- 2人のiPhoneのTestFlightから更新し、表示ビルド番号を確認。
- 起動表示／即時遷移、部位別お気に入り一括追加、記録の初期空状態・保存後リセットを確認。
- 食事の任意入力・0との区別・日付別カレンダー・編集削除を確認。
- トレーニング／食事管理／AI／マイページの4タブ、AIメニュー生成、Freeのぼかしと利用制限を確認。
- commit SHA、ビルド番号、IPAのSHA256、Apple受付と処理完了、実機確認結果を共有進捗へ記録。ビルド番号の変更だけを選択してGitへ反映する。
- App Store一般公開・審査提出は今回行わない。

参考：[Expoローカルビルド](https://docs.expo.dev/build-reference/local-builds/)、[本番環境変数](https://docs.expo.dev/eas/environment-variables/usage/)。
