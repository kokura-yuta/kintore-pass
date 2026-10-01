# 筋トレPAS App Storeスクリーンショット撮影手順

更新日：2026-09-24

## 2026-10-01 再撮影版

最新候補は `app-store-screenshots/retake-2026-10-01` の7画面と補足 `08-food-history.png`。
全て1320×2868 PNG。旧画像は比較用に保持。Web版のサンプル表示であり、実機検証・App Store登録は未実施。
`mobile/scripts/capture-store-screenshots.cjs` を利用。専用Expoを8083番で起動し、起動プロセスに限ってEXPO_PUBLIC_SCREENSHOT_MODE=trueを設定する。
PlaywrightとMicrosoft Edgeが必要。PLAYWRIGHT_MODULE_PATHで既存のPlaywrightを指定可能。
データとフォントの読み込みを待ち、画面の内容を加工せずに撮影する。

## 撮影モード

`mobile/.env.local`へ次を一時設定し、Expoを再起動します。

```env
EXPO_PUBLIC_SCREENSHOT_MODE=true
```

この設定は開発中だけ有効です。API通信とログインを使わず、実在しないサンプルのプロフィール・トレーニング・食事・AIチャットを表示します。開発用という注記も撮影画面では非表示になります。

撮影終了後は必ず`false`へ戻します。

## 撮影する7画面

1. `/home`：今日のAIメニュー、コンディション、おすすめ理由
2. `/training`：重量・回数・セット入力
3. `/calendar`：トレーニング履歴と継続記録
4. `/food`：日別のカロリー・たんぱく質・食事履歴
5. `/body-analysis`：身体分析の写真選択と月間残り回数
6. `/chat`：利用者の質問とMarkdown形式のAI回答
7. `/my-page`：身体情報、目標、トレーニング設定

## 撮影済みファイル

`app-store-screenshots`フォルダへ、以下の7枚を保存済みです。すべて1320×2868、PNG、透過なしです。

- `01-home.png`
- `02-training.png`
- `03-calendar.png`
- `04-food.png`
- `05-body-analysis.png`
- `06-chat.png`
- `07-my-page.png`

現時点の画像はExpo WebをiPhone相当比率で撮影した提出素材案です。App Store Connectへ登録する前に、TestFlight版を実機またはiOS Simulatorで撮影し直せる場合は、ネイティブ版を最終素材として優先します。

## 撮影前の確認

- 実在するメールアドレス、人物写真、会話、健康情報が映っていない
- エラー、ローディング、開発用表示が残っていない
- iPhoneのステータスバー時刻と電池表示が全画像で不自然にばらついていない
- キーボードが不要な画像では閉じている
- 横方向にはみ出していない
- 月額料金は「1,000円」、身体分析は「毎月4回まで」で統一されている
