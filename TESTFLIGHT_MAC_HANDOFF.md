# Macでの次回TestFlight配布引き継ぎ

更新日：2026-10-11。これは配布手順であり、配布完了報告ではありません。

### Build 25の更新（配布準備）

- Apple最新24／25未使用を確認。最新main 993f7a0（部位別お気に入り復元3d6d92a、分析履歴100点／残り回数993f7a0）からMacで作成する。DB／サーバー更新なし、食事nullable-v1互換と振動モジュールを維持。審査提出なし。
- お気に入り／平均／残り回数／遷移／振動回帰31件成功。型チェックと追加の既存API検査を行い、本番環境値をメモリ注入した署名IPAを検証後、その同一ファイルだけを送る。配布完了・実機表示はまだ未確認。

### Build 24の更新（TestFlight配布完了）

- 作成元34a0fef。追加修正e75e349（体重推移の読込／取得エラーを空履歴と区別、自分のカレンダーの再読込中に既知のカードを維持）と、トレーニングの「部位別お気に入り種目」枠の削除、種目検索の「☆お気に入り」フィルターを含む。検索の星／追加、保存データ、Build 23の他機能・認可を維持。Apple最新23／24未使用を確認。先行831f1d3／a8c10d5ビルドは送信前に停止し、最新コードから作り直す。
- 遷移／振動19件、プラン込み22件、mobile API28件、単体・安全性テスト、型・対象lint成功。DB／サーバー／依存関係の追加変更なし。既存食事nullable-v1互換を維持。
- Mac配布用コピーだけautoIncrement=false、既存の本番EAS公開環境値をメモリ注入、開発envをコピーしない。ローカル作成後IPAの番号／本番値／追加修正の収録を確認して同一IPAを送信する。審査提出なし。
- 最終変更のフィルター／お気に入り／遷移／振動回帰27件、型・対象lint成功。開発Web390pxでカード削除と星登録→お気に入り絞込→記録追加→重複無効→星解除を確認。実アカウントや本番DB操作はしていない。
- Macで署名済み1.0.0 (24)を作成。本番API／Clerk公開値のバイナリ完全一致と、お気に入りフィルター・体重読込状態・ExpoHaptics・nullable-v1・profileWeightKgの収録を検証。IPA outputs/releases/kintorepas-build24.ipa（Git対象外）、SHA256 30d9175bb295e1927ae52724047d040f1a4123c2914066bb9ba640b5febdf247。承認処理の利用上限で一度停止したが未送信のまま保持し、再開後に同一IPAのEAS送信1a531215-56df-4dd2-9457-12882e84e281を開始。Apple処理・グループ割当は確認待ち。
- EAS送信が成功しAppleアップロード完了。App Store Connectのセッションが切れており、Apple処理完了と既存内部グループ割当は再ログイン後に確認する。再送信しない。App Store審査提出なし。iPhoneの更新と実機表示・振動確認も未実施。
- 2026-10-12：再ログイン後、Apple Build 24（3297597f-8c79-4d85-a0ff-bd08473ea9e3）の「提出準備完了・期限90日」と既存「筋トレPAS 開発テスト」割当を確認。証拠app-store-screenshots/build24-ready-2026-10-12.png。TestFlight配布完了、審査提出なし。端末を1.0.0 (24)へ更新し、検索の☆お気に入り表示／登録解除／追加、部位別カード非表示、体重・カレンダーの再読込表示を実機で確認する。

### Build 23の更新（TestFlight配布完了）

- 作成元は共有main e2112dde4d1931698db8494f0b47c0f04fe4f91a。a60e0b8の保持型Tabs／先読み／ちらつき対策に、最新5ade553の調子1〜5・種目検索の星／追加操作とe2112ddの軽い振動を統合。振動にはexpo-haptics ~57.0.3のネイティブ組み込みが必要。
- Apple最新22と23未使用を確認。先行した旧内容の23 IPAは未送信のまま保存し、最新cloneから作成。配布コピーだけautoIncrement=false、本番のEAS公開環境値をメモリ経由で注入。開発モード／API bypassはfalse。クラウドビルド枠・有料プラン変更・審査提出なし。
- 食事のDB 0021とSites Version 36、nullable-v1の旧版互換を維持。今回のDB変更なし。unit98件、安全性19件、プラン／遷移21件、振動4件、AI／お気に入り／カレンダー10件、mobile API28件、公開API4件、型・lint成功。開発Webで検索の星／追加の独立操作と5段階表示を確認。実iPhoneの振動強度・ちらつきゼロは未測定。
- Macで署名済み1.0.0 (23)作成成功。本番API・Clerk公開値のバイナリ完全一致、ExpoHaptics／FavoritesProvider／nullable-v1／profileWeightKgを確認。IPA outputs/releases/kintorepas-build23.ipa（Git対象外）、SHA256 bea78f761498cc3020c7264d72289471580709a1b4eb23db904fc69b6d540211。同一IPAの送信開始、Apple処理・既存内部グループ割当はまだ未確認。
- EAS送信b9e49da4-761c-4c7d-99aa-1b686117c138成功。Appleアップロード完了、処理中。App Store審査は提出していない。処理後の既存内部グループ割当・端末更新は確認待ち。
- 2026-10-12：Apple Build 23（d174a6a4-9bd5-49db-80b6-244ab21002cd）の「提出準備完了・期限90日」と既存「筋トレPAS 開発テスト」割当を確認。証拠app-store-screenshots/build23-ready-2026-10-12.png。Mac作成・同一IPA送信・TestFlight配布完了。審査提出なし。端末で23へ更新後、調子5段階、星／追加、振動、タブ往復の入力維持・ちらつき、友達／分析の読込、食事の未入力表示を確認する。

### Build 22の更新（配布完了）

- 作成元は共有main a6e384bdc6d5dce3643964e63c7fb4835ba20a88。プラン確認のユーザー別集約・同時要求の合流、異なるタブ即時受付、チャット本文維持と古い応答の破棄を追加。ホーム構成とFree認可は変更しない。
- 型・mobile lint、プラン／遷移15件・mobile API28件・単体98件・ソース安全性19件、最終iOS/Hermes exportが成功。実iPhoneの遷移フレーム／通信時間は未測定で、ラグゼロを保証するものではない。
- 配布コピーのmobile 145ファイルが共有mainと一致。作業コピーのeas.jsonだけautoIncrement=false。Macで新番号22を作成中。本番設定はEASからメモリ経由で注入、開発envをコピーしない。Appleログイン復旧後、最新配布21／22未使用を画面で確認。
- サーバー／DB変更なし、Sites Version 36を継続使用。次は署名済みIPAの設定・番号検証→同一IPA送信→Apple処理／既存内部グループ割当の確認。App Store審査提出・新テスター追加は行わない。
- Macで署名済みBuild 22作成成功。本番API・Clerk公開値がバイナリと完全一致し、共有プラン確認と既存体重同期／食事nullable-v1を含む。IPA outputs/releases/kintorepas-build22.ipa（Git対象外）、SHA256 56c01f85d1270208bca25e8e1a80568dd9b371bd5df9a13fb6b577054b81d94f。検証した同一ファイルをEAS submitでAppleへ送信開始。処理完了・内部グループ割当はまだ未確認。
- EAS送信6acb2f26-a288-4aad-9ccf-31403ae43108成功、Appleへのアップロード完了。Apple処理・内部グループ割当・iPhone更新は確認待ち。依存関係はBuild 21から変更せず、既知の監査警告の対応は別途残す。
- 2026-10-11 18:39 JST：Apple Build 22（7a1704f8-95ab-42ad-9369-71ddb55f3cc4）の「提出準備完了・期限90日」と既存「筋トレPAS 開発テスト」割当を確認。証拠app-store-screenshots/build22-ready-2026-10-11.png。Mac作成・Apple送信・TestFlight配布完了。残るのはiPhoneで22に更新し、高速タブ操作／AI往復の本文維持／写真選択から復帰／期限・アカウント切替を実機で確認すること。全画面のラグゼロは未実測。

### Build 21の更新（配布完了）

- ホームの再構成は行わず、体重記録→プロフィール同期と友達入口の余白だけを追加。共有main 3577a34のmobile 141ファイルと配布コピーが一致（eas.jsonのautoIncrementだけコピーでfalse）。
- Sites Version 36公開成功、ソース37c0467e9feaa0f753dc293433acd770a408f6aa、既存URLと環境revision 19を保持。追加DB変更なし。公開API回帰4件、単体98件、mobile API20件、型・lintを確認。
- MacローカルBuild 21作成成功。IPAの本番API・Clerk公開値の完全一致、番号21とprofileWeightKg／fullWidthShortcut／nullable-v1を確認。outputs/releases/kintorepas-build21.ipaへ保存、SHA256 ec6a68631b916a015dda44cc1e02fdc59253660062de8bfec0fdea0cec568385。
- EAS送信e883ce99-e49c-4f25-b9ee-9c15fa5752caが成功しAppleへのアップロード完了。Apple処理／グループ割当・実機検査は未完了。App Store審査提出なし。
- 15:50 JSTにApple処理完了と既存「筋トレPAS 開発テスト」割当を確認。Apple Build ID 32b9e4d3-be91-4830-b998-d4e22677f48a、提出準備完了・期限90日。証拠app-store-screenshots/build21-ready-2026-10-11.png。実機で体重変更後のプロフィール反映と余白を確認する作業は残す。
- 依存関係はBuild 20から変更していない。Expo doctorは20/21成功、SDK57の6パッケージにパッチ更新推奨。npm auditは39件（moderate14/high24/critical1）、criticalはreact-native→react-devtools-core→shell-quote@1.10.0のquote()条件付きコマンド注入。警告を無効化せず記録、今回の機能修正と依存更新を混同しない。依存監査の対応は別作業として残す。

### Mac担当の更新（2026-10-11）

- 互換修正16f464dと最新main 59d1d05を統合。0021は隔離DBで検証後、本番Neon mainへDrizzleバッチ適用済み。既存食事行の件数・全行ハッシュは変更前後で一致。
- 新版はnullable-v1ヘッダーでnullを受け取り、旧版は数値形式で表示し、旧版の0での編集でも元のnullを保持する。DBの未入力を0へ変換していない。AI資料も入力済み件数と部分合計を明示。
- 実ルート＋隔離DBでCRUD・合計・旧UIフォーマット・401・他ユーザー404を検証。Sites Version 35公開成功、既存環境revision 19維持。本番アカウント／実機でのCRUD操作は未実施のため、以下の確認項目5は実機検査として残す。
- このMacの配布用コピーでBuild 20の署名済みIPA作成完了。本番API／Clerk公開値のバイナリ完全一致、nullable-v1、com.kintorepas.app／1.0.0 (20)を確認。作成元9b8a581＋番号20は最新main 8ac1b12のmobile全141ファイルと一致（作業コピーのみautoIncrement=false）。クラウドビルド枠やプラン変更は使用していない。
- IPA: outputs/releases/kintorepas-build20.ipa（Git対象外）。SHA256: d882ffbb8b8319ac6a7bec1e9b611264b3ce6a76a68e60289b5f1c17d410b736。EAS送信f62855f6-cbfd-4d61-98aa-b3bf768d17baを開始。Apple処理とグループ割当は確認待ち。実機検査は未実施。
- 2026-10-11 15:14 JST：EAS送信成功後、Apple側Build 20（cc953401-1e44-4016-8830-08e47dc18c28）の「提出準備完了・期限90日」と「筋トレPAS 開発テスト」割当を確認。Mac作成とTestFlight配布は完了。iPhoneの更新・実機操作確認はテスターが行う。App Store審査提出はしていない。

## 現在地

- 共有mainの確認地点：`0f39ff4`。今日のAI統合コミット`8d851d4`を含む。
- 共有進捗によるとBuild 19はApple処理完了・既存内部テストグループへ割当済み。実機更新は別途必要。
- Build 19の作成元は`c228557`で、食事の任意入力・カレンダー、AIタブ統合は未収録。
- 次は共有mainの全変更を含める。Build 19の古い作業フォルダを再利用しない。
- このWindowsではiOSのローカルビルドは行わない。友達のMacを使用し、Expoのプラン変更はしない。

## 食事のサーバー対応（DB・API・旧版互換対応済み、実機検査は残る）

以下は引き継ぎ時の確認条件。項目1〜4は上記のMac担当更新で解消。項目5の本番テストアカウント操作は未実施であり、隔離DB＋実ルートの認証境界／CRUD検証と区別する。配布後のiPhone検査として残す。

1. 本番DB/API担当者と反映状況を照合する。0021とSites Version 35は適用済み。
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
