# Day 1：バックエンド全体の地図

[学習一覧](README.md) | [全体版コードガイド](../CODE_GUIDE.md) | [次のDayへ →](DAY_02.md)

## 今日できるようになること

- フロント、TypeScriptバックエンド、Neon、Python、OpenAIの担当を説明する
- 機能を直すときに最初に見るフォルダを判断する
- `.ts`、`.tsx`、`.py`、`.sql`の違いを説明する

## 最初に覚える流れ

```text
Expo / React Native画面
  ↓ HTTPS
TypeScript API
  ↓              ↓
Neon DB       OpenAI
                  ↑
             Python身体分析
```

画面は直接NeonやOpenAIへ接続しません。秘密鍵を利用者へ配らないため、必ずバックエンドを通します。

## 読むファイルの順番

### 1. [package.json](../package.json)

バックエンドで使用するライブラリと、テスト・ビルド用コマンドの一覧です。`dependencies`は動作に必要な部品、`scripts`は実行コマンドです。

### 2. [mobile/package.json](../mobile/package.json)

現在のスマホアプリ側のライブラリ一覧です。ルートの`package.json`と分かれているのは、バックエンドとExpoが別の実行環境だからです。

### 3. [mobile/src/lib/api.ts](../mobile/src/lib/api.ts)

Expoから公開APIへ通信する共通の入口です。API URL、Clerkトークン、タイムアウト、エラー変換を担当します。

### 4. [app/api/health/route.ts](../app/api/health/route.ts)

TypeScriptバックエンドとNeonが起動しているか確認する小さなAPIです。`GET()`、`getDb()`、`Response.json()`の基本形が見られます。

### 5. [db/index.ts](../db/index.ts)

バックエンドからNeonへ接続する場所です。接続文字列はサーバー環境変数から読みます。

### 6. [python-analysis/app/main.py](../python-analysis/app/main.py)

正面・横・背面画像を検査し、OpenAI画像分析へ渡すPython APIです。

## 今日覚える文法

- `import`：別ファイルの機能を持ってくる
- `export`：別ファイルから使えるように公開する
- `const`：再代入しない名前を作る
- `function`：処理へ名前を付ける
- `async`：時間のかかる処理を含む関数
- `await`：その処理の完了を待ってから次へ進む

## 工夫点

画面、API、DB、画像分析を分けています。そのため、画面デザインを変更してもDB設計を壊しにくく、PythonだけRenderへ公開できます。

## セキュリティ

`DATABASE_URL`、`OPENAI_API_KEY`、`CLERK_SECRET_KEY`はバックエンドだけが持ちます。`EXPO_PUBLIC_`が付く値はアプリ利用者から見える前提です。

## 理解チェック

1. アプリを閉じても残したいデータは、最終的にどこへ保存するか。
2. Python APIが停止した場合、プロフィール取得まで停止するか。
3. `mobile`とルートに`package.json`が一つずつある理由は何か。
4. 画面からOpenAIへ直接APIキーを使わない理由は何か。

答えられたら次へ進みます。

[Day 2：Neon接続とDBスキーマへ →](DAY_02.md)
