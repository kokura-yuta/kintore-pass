# MUSCLE PAS コードガイド

バックエンドの完成状況・残作業・実装順は、`BACKEND_ROADMAP.md`へまとめています。バックエンド作業が完了するたびに、このコードガイドとロードマップの両方を更新します。

このファイルは、**現在のコードがどこで何をしているかを理解するための説明書**です。

長いコードは丸ごと説明せず、処理の目的ごとに小さく分けています。

```text
何をする場所か
    ↓
基本の型
    ↓
現在のコードを小さく分けて確認
    ↓
文法とデータの流れを確認
```

コード例は読みやすいように字下げを整えています。空白の位置を除き、現在のソースコードと同じ処理です。

## 読みたい場所へ移動

- [1. ファイル構成](#1-ファイル構成)
- [2. トップページ](#2-トップページ)
- [3. 共通カード](#3-共通カード)
- [4. 理想の体機能](#4-理想の体機能)
- [5. トレーニング種目カタログ](#5-トレーニング種目カタログ)
- [6. AIチャットのフロントエンド](#6-aiチャットのフロントエンド)
- [7. AIチャットのバックエンド](#7-aiチャットのバックエンド)
- [8. システムプロンプト](#8-システムプロンプト)
- [9. CSSの読み方](#9-cssの読み方)
- [10. 基本の型まとめ](#10-基本の型まとめ)
- [11. 単語帳](#11-単語帳)
- [12. PostgreSQLバックエンド](#12-postgresqlバックエンド)
- [13. 現在まだ実装していないこと](#13-現在まだ実装していないこと)

## 現在の実装状況

| 機能 | 現在の状態 |
| --- | --- |
| Clerk認証 | メール認証、ログイン判定、未ログイン時の画面移動まで実装済み |
| 初回設定 | 理想体型、身長・体重などの身体情報、完了状態をNeonへ保存・復元できる |
| 理想の体 | 4種類の画像選択、参考画像プレビュー、選択結果のNeon保存・取得まで実装済み |
| 身体分析 | 正面・横・背面画像をRender上のPythonへ送り、OpenAI分析、Neon保存、履歴表示まで実装済み。初回分析は任意 |
| トレーニング記録 | 部位・詳細部位・種目・重量・回数・セットなどを入力し、本人の記録をNeonへ保存・取得できる |
| AIメニュー | プロフィール・身体分析・最近の記録を基にOpenAIが生成し、Neonへ保存・再取得できる |
| AIチャット | OpenAIとの会話、Neonへの保存、4つの本人データ取得Toolまで実通信確認済み。履歴の画面復元は接続中 |
| Python分析API | Renderへ公開済み。ローカルでPythonサーバーを起動しなくても身体分析できる |

OpenAIの回答は`aiResponse`へ保存し、`output_text`を`reply`としてフロントエンドへ返します。

# 1. ファイル構成

現在のアプリ本体は`mobile/`のExpo・React Native・TypeScriptです。ルートの`app/`は、スマホ版から呼ばれるTypeScriptバックエンドとAPIを担当します。

```text
mobile/src/app/                 スマホで利用者が見る各画面
mobile/src/contexts/            複数画面で共有するState
mobile/src/lib/                 スマホからバックエンドを呼ぶ通信処理

app/api/                        Clerk認証付きTypeScript API
app/lib/auth/                   Clerkの本人確認を共通化
app/lib/ai/                     AI用データ、Prompt、Tool実行処理
db/schema.ts                    Neonへ保存するテーブルの設計図

python-analysis/app/main.py     身体画像を検査してOpenAIへ送るPython API
```

以下の構成は、開発初期に作ったWeb版プロトタイプの説明です。現在のスマホ版では、同じ役割を`mobile/src/`内のTypeScriptファイルが担当しています。

```text
app/
├── layout.jsx                       全画面へ共通の下部メニューを置く
├── page.jsx                         理想の体だけを表示するホーム画面
├── globals.css                      アプリ全体の見た目を決める
├── components/
│   ├── BottomNavigation.jsx          6機能を切り替える固定下部メニュー
│   ├── FeatureCard.jsx              6機能で共通のカード
│   ├── IdealBodySection.jsx         理想の体機能
│   ├── BodyAnalysisSection.jsx      身体分析の土台
│   ├── ExerciseGroupCard.jsx        詳細部位ごとの種目カード
│   ├── TrainingLogCard.jsx          記録専用画面への入口
│   ├── TrainingLogSection.jsx       記録フォーム本体
│   ├── MenuBuilderSection.jsx       AIメニューの土台
│   ├── DashboardSection.jsx         ダッシュボードの土台
│   └── AiChatSection.jsx            チャット画面への入口
├── chat/
│   └── page.jsx                     AIチャットの画面と操作
├── analysis/
│   └── page.jsx                     身体分析の専用画面
├── training/
│   └── page.jsx                     トレーニング記録の専用画面
├── menu/
│   └── page.jsx                     AIメニュー作成の専用画面
├── dashboard/
│   └── page.jsx                     進捗確認の専用画面
├── api/chat/
│   └── route.js                     チャットのバックエンド
└── lib/
    ├── ai/
    │   └── systemPrompt.js          AIの役割と回答ルール
    └── training/
        └── exerciseOptions.js       部位別のトレーニング種目一覧
```

## フロントエンドとバックエンド

```text
フロントエンド
利用者が見る画面、入力欄、ボタン、吹き出し

バックエンド
APIキーを守りながらOpenAIへ質問を送る処理
```

APIキーはブラウザ側へ書かず、`.env.local`とバックエンドだけで使用します。

# 2. トップページ

担当ファイルは`app/page.jsx`です。

## importする場所

基本の型です。

```js
import 読み込む名前 from "ファイルの場所";
```

現在のホーム画面は、理想の体機能だけを読み込みます。

```js
import IdealBodySection from "./components/IdealBodySection";
```

- `import`：別ファイルの機能をこのファイルで使えるようにする
- `IdealBodySection`：読み込んだコンポーネントにつける名前
- `./components/IdealBodySection`：現在のファイルから見た読み込み先

## 画面を組み立てる場所

まず外側です。

```jsx
export default function Home() {
  return (
    <main>
      {/* ここに画面の中身を書く */}
    </main>
  );
}
```

- `function Home()`：トップページを作る関数
- `return`：ブラウザへ表示するJSXを返す
- `<main>`：ページの主要部分を囲む

ホーム画面には理想の体だけを表示します。

```jsx
<div className="singleFeaturePage">
  <IdealBodySection />
</div>
```

6機能を縦へ並べず、下部メニューから各専用画面へ切り替えます。

## 固定下部メニュー

担当ファイルは`app/components/BottomNavigation.jsx`です。

下部メニューに表示する6機能の情報を配列で定義します。

```jsx
const navigationItems = [
  { href: "/", label: "理想", icon: "◇" },
  { href: "/analysis", label: "分析", icon: "◉" },
  { href: "/training", label: "記録", icon: "▤" },
  { href: "/menu", label: "メニュー", icon: "▦" },
  { href: "/dashboard", label: "進捗", icon: "↗" },
  { href: "/chat", label: "AI", icon: "✦" },
];
```

- `href`：押したときの移動先
- `label`：画面下へ表示する機能名
- `icon`：機能名の上へ表示する記号

現在のURLを取得します。

```jsx
const pathname = usePathname();
```

`pathname`には`/`・`/training`・`/chat`など、現在表示している画面のパスが入ります。

6件のデータを下部メニューのリンクへ変換します。

```jsx
{navigationItems.map((item) => {
```

現在のURLとリンク先を比較して、選択中かを判定します。

```jsx
const isActive =
  item.href === "/"
    ? pathname === "/"
    : pathname.startsWith(item.href);
```

- ホームの`/`は完全に同じ場合だけ選択中にする
- ほかの機能は`/training/...`など子画面でも同じ機能を選択中にする

選択中の場合だけ`active`クラスを追加します。

```jsx
className={`bottomNavigationLink${
  isActive ? " active" : ""
}`}
```

下部メニューは`layout.jsx`へ置くため、すべての画面で共通表示されます。

```jsx
<body>
  {children}
  <BottomNavigation />
</body>
```

`children`には現在の機能画面が入り、その下へ固定メニューを重ねて表示します。

# 3. 共通カード

担当ファイルは`app/components/FeatureCard.jsx`です。

## 基本の型

```jsx
function コンポーネント名({ 受け取る値 }) {
  return <表示するJSX />;
}
```

## 値を受け取る部分

```jsx
export default function FeatureCard({
  number,
  title,
  description,
  children,
}) {
```

| 名前 | 受け取る内容 |
| --- | --- |
| `number` | `01`などの機能番号 |
| `title` | 「理想の体」などの見出し |
| `description` | 機能の短い説明 |
| `children` | カードごとに異なる中身 |

## 受け取った値を表示する部分

```jsx
<p className="featureNumber">{number}</p>
<h2>{title}</h2>
<p>{description}</p>
```

`{}`は、JSXの中でJavaScriptの値を表示する記号です。

異なる中身は次の1行で表示します。

```jsx
<div className="featureContent">{children}</div>
```

`children`があるため、同じカードデザインの中へ体型選択やチャットリンクなど別々の内容を入れられます。

# 4. 理想の体機能

担当ファイルは`app/components/IdealBodySection.jsx`です。

## この機能のデータの流れ

```text
bodyTypesに4種類のデータを用意
        ↓
map()で4枚のカードへ変換
        ↓
クリックした体型名をStateへ保存
        ↓
同じ体型名をlocalStorageへ保存
```

参考画像は別の流れです。

```text
ファイルを選択
    ↓
元ファイルをStateへ保存
    ↓
FileReaderで表示用データへ変換
    ↓
imgでプレビュー表示
```

## 4-1. ブラウザで動く機能を使う準備

```jsx
"use client";

import { useState } from "react";
```

- `"use client"`：クリック、State、localStorageなどブラウザ上の機能を使う指定
- `useState`：変化する値をReactに覚えさせる機能

## 4-2. 体型データ

基本の型です。

```js
const 配列名 = [
  {
    プロパティ名: 値,
  },
];
```

現在の1件分です。

```js
{
  name: "細マッチョ",
  image: "/images/body-types/lean-muscle.png",
  description: "体脂肪を抑えた、引き締まった体型",
}
```

- `name`：表示と選択状態に使う体型名
- `image`：`public`フォルダ内にある画像の場所
- `description`：体型の特徴

同じ形のオブジェクトを4件、`bodyTypes`配列へ入れています。

## 4-3. Stateを定義する

基本の型です。

```js
const [現在の値, 値を変更する関数] = useState(初期値);
```

### 選択中の体型

```js
const [selectedBodyType, setSelectedBodyType] = useState("");
```

右から読みます。

```text
useState("")
→ 最初は空文字でStateを作る

selectedBodyType
→ 現在選択されている体型名を読む

setSelectedBodyType
→ 選択中の体型名を変更する
```

### 選択した画像ファイル

```js
const [referenceImage, setReferenceImage] = useState(null);
```

最初はファイルが存在しないため、初期値は`null`です。

### プレビュー用データ

```js
const [referenceImagePreview, setReferenceImagePreview] = useState("");
```

画像を表示する`src`へ渡す文字列を保存します。

## 4-4. 選択した体型を保存する

基本の型です。

```js
function 関数名(受け取る値) {
  画面のStateを更新する;
  ブラウザへ保存する;
}
```

現在のコードです。

```js
function handleBodyTypeSelect(bodyTypeName) {
  setSelectedBodyType(bodyTypeName);
  localStorage.setItem("goalBodyType", bodyTypeName);
}
```

1行目から順番に読みます。

1. `bodyTypeName`で「細マッチョ」などを受け取る
2. `setSelectedBodyType()`で画面の選択状態を変える
3. `localStorage.setItem()`で別ページからも読めるように保存する

`"goalBodyType"`は保存した値を後から探すための名前です。

## 4-5. `.map()`でカードを繰り返す

基本の型です。

```jsx
{配列.map((1件分のデータ) => (
  <表示する要素 />
))}
```

まず、配列から1件ずつ受け取る部分です。

```jsx
{bodyTypes.map((bodyType) => (
  // bodyTypeを使って1枚のカードを作る
))}
```

- `bodyTypes`：4種類の体型データ
- `.map()`：配列の全要素を順番に処理する
- `bodyType`：現在処理している1種類の体型
- `=>`：受け取ったデータを右側の表示へ変換する

次に、カードを識別する部分です。

```jsx
<button
  key={bodyType.name}
  type="button"
>
```

`key`は、Reactが4枚のカードを区別するための値です。

## 4-6. 選択中だけCSSクラスを追加する

基本の型です。

```js
条件 ? 条件が正しい場合 : 条件が違う場合
```

現在のコードです。

```jsx
className={
  selectedBodyType === bodyType.name
    ? "bodyTypeButton selected"
    : "bodyTypeButton"
}
```

読む順番です。

```text
selectedBodyType === bodyType.name
→ 選択中の名前と、このカードの名前が同じか確認

同じ
→ selectedクラスも付ける

違う
→ 通常クラスだけ付ける
```

## 4-7. クリックした体型名を関数へ渡す

```jsx
onClick={() => handleBodyTypeSelect(bodyType.name)}
```

- `onClick`：ボタンを押したときに実行する
- `() =>`：クリックされるまで処理を待たせる
- `bodyType.name`：クリックしたカードの体型名

## 4-8. カードの中身を表示する

画像です。

```jsx
<img
  src={bodyType.image}
  alt={`${bodyType.name}の見本`}
  className="bodyTypeImage"
/>
```

- `src`：表示する画像の場所
- `alt`：画像を見られない場合にも意味を伝える文章
- `` `${bodyType.name}の見本` ``：体型名を文章へ埋め込む

名前と説明は別々に表示します。

```jsx
<span className="bodyTypeName">{bodyType.name}</span>
<span className="bodyTypeDescription">
  {bodyType.description}
</span>
```

## 4-9. 選択されたファイルを1件取得する

```js
const selectedFile = event.target.files?.[0] ?? null;
```

この1行は次の順番で読みます。

```text
event.target
→ 操作されたinput

.files
→ inputで選択されたファイル一覧

?.[0]
→ filesが存在する場合だけ、最初の1件を取得

?? null
→ 取得結果がnullまたはundefinedならnullを使う
```

### `?.[0]`を詳しく確認

普通に最初の要素を取る形です。

```js
files[0]
```

しかし、`files`自体が存在しない状態で`[0]`を読むとエラーになる可能性があります。

```js
files?.[0]
```

`?.`を付けると、`files`がある場合だけ`[0]`を読みます。なければエラーにせず`undefined`になります。

### `?? null`を詳しく確認

基本の型です。

```js
左側の値 ?? 代わりに使う値
```

左側が`null`または`undefined`のときだけ右側を使います。

```text
画像あり     → Fileオブジェクト
画像なし     → undefined ?? null → null
```

空文字`""`や数値の`0`は有効な値として残ります。

## 4-10. ファイルがない場合を先に終わらせる

```js
if (!selectedFile) {
  setReferenceImagePreview("");
  return;
}
```

- `!selectedFile`：ファイルがないか確認する
- `setReferenceImagePreview("")`：以前のプレビューを消す
- `return`：この関数の残りを実行せず終了する

## 4-11. ファイルを画像表示用データへ変換する

まず読み取り機能を作ります。

```js
const reader = new FileReader();
```

読み取り完了後の処理を登録します。

```js
reader.onload = () => {
  setReferenceImagePreview(reader.result);
};
```

最後に読み取りを開始します。

```js
reader.readAsDataURL(selectedFile);
```

この3つは次の順番です。

```text
FileReaderを作る
    ↓
読み終わったときの処理を登録する
    ↓
Data URLへの変換を開始する
    ↓
完了後、reader.resultをStateへ保存する
```

## 4-12. 値がある場合だけ表示する

ファイル名です。

```jsx
{referenceImage && (
  <p>選択した画像:{referenceImage.name}</p>
)}
```

プレビューです。

```jsx
{referenceImagePreview && (
  <img
    src={referenceImagePreview}
    alt="選択した参考画像のプレビュー"
    className="referenceImagePreview"
  />
)}
```

`値 && 表示`は、左側に値がある場合だけ右側を表示するReactの書き方です。

# 5. トレーニング種目カタログ

担当ファイルは`app/lib/training/exerciseOptions.js`です。

このファイルは、トレーニング記録で選択できる種目を管理します。画面の操作は書かず、固定の種目データだけを担当します。

## データの階層

```text
大部位
  ↓
詳細部位
  ↓
実際のトレーニング種目
```

現在は次の規模です。

| 種類 | 数 |
| --- | --- |
| 大部位 | 7 |
| 詳細部位 | 26 |
| トレーニング種目 | 190 |

大部位は、胸・背中・肩・腕・脚・腹・全身です。

## 基本の型

```js
export const データ名 = {
  大部位: {
    詳細部位: [種目データ],
  },
};
```

`{}`の中へさらに`{}`を入れる「入れ子のオブジェクト」です。

## 胸上部までの構造

まず、大部位の胸です。

```js
胸: {
  // 胸の詳細部位を入れる
},
```

その中へ胸上部を作ります。

```js
胸上部: [
  // 胸上部の種目を入れる
],
```

`胸上部`の値は、複数の種目を保存する配列`[]`です。

## 1種目の構造

```js
{
  id: "incline-barbell-bench-press",
  name: "インクラインバーベルベンチプレス",
  equipment: "バーベル",
}
```

長い一覧も、すべてこの同じ型の繰り返しです。

| プロパティ | 目的 |
| --- | --- |
| `id` | 表示名が変わっても同じ種目として識別する |
| `name` | 画面に表示する日本語の種目名 |
| `equipment` | バーベル・ダンベル・自重など使用器具を記録する |

`bodyPart`と`targetMuscle`を1種目ずつ繰り返し書かない理由は、外側の`胸`と`胸上部`から分かるためです。

```text
胸
└── 胸上部
    └── インクラインバーベルベンチプレス
        ├── id
        ├── name
        └── equipment
```

後で記録を保存するときは、大部位・詳細部位・種目・重量・回数・セットを一つの記録へまとめます。

## トレーニング記録の専用画面へ移動する仕組み

トレーニング記録へは、全画面共通の下部メニューから移動します。

```jsx
{ href: "/training", label: "記録", icon: "▤" }
```

- `href="/training"`：移動先をトレーニング記録ページにする
- `label="記録"`：下部メニューへ表示する文字
- 記録を押すと`app/training/page.jsx`が表示される

専用画面では、今まで作った記録フォームを読み込みます。

```jsx
import TrainingLogSection from "../components/TrainingLogSection";
```

読み込んだフォームを専用画面へ配置します。

```jsx
<TrainingLogSection />
```

画面移動は固定下部メニューへ統一したため、トレーニング記録画面には「トップへ戻る」リンクを置きません。

役割を分けると、次の構造になります。

```text
下部メニューの記録
└── /trainingへ移動
    └── TrainingLogSectionの記録フォームを表示
```

## 5-1. 大部位を選択する画面

担当ファイルは`app/components/TrainingLogSection.jsx`です。

ブラウザで選択操作とStateを使うための指定です。

```jsx
"use client";
```

ReactからState機能を読み込みます。

```jsx
import { useState } from "react";
```

トレーニング記録では、共通の`FeatureCard`を使いません。

```jsx
<section className="trainingLogPanel">
  {/* 部位選択と詳細部位カード */}
</section>
```

- `section`：トレーニング記録の操作部分を一つにまとめる
- `trainingLogPanel`：トレーニング記録専用のCSSを適用する名前
- 共通カードを外すことで、専用ページ内の見出しが二重になるのを防ぐ

部位別の種目カタログを読み込みます。

```jsx
import { exercisesByBodyPart } from "../lib/training/exerciseOptions";
```

選択中の大部位を保存するStateです。

```jsx
const [selectedBodyPart, setSelectedBodyPart] = useState("");
```

- `selectedBodyPart`：現在選択されている大部位
- `setSelectedBodyPart`：選択中の大部位を変更する関数
- `""`：最初は何も選択されていない

部位名と横並びボタンをまとめます。

```jsx
<div className="bodyPartSelector">
  <p className="trainingFieldLabel">部位</p>
  <div className="bodyPartTabs">
    {/* 部位ボタン */}
  </div>
</div>
```

- `bodyPartSelector`：部位の見出しとボタン一覧をまとめる
- `bodyPartTabs`：CSSで部位ボタンを横並びにする

すべての大部位を1件ずつボタンへ変換します。

```jsx
{Object.keys(exercisesByBodyPart).map((bodyPart) => (
  <button
    className={`bodyPartTab${
      selectedBodyPart === bodyPart ? " active" : ""
    }`}
    type="button"
    key={bodyPart}
    onClick={() => setSelectedBodyPart(bodyPart)}
    aria-pressed={selectedBodyPart === bodyPart}
  >
    {bodyPart}
  </button>
))}
```

```text
Object.keys(...).map(...)
→ カタログの大部位を1件ずつボタンへ変換する。

selectedBodyPart === bodyPart ? " active" : ""
→ 現在選択中の部位だけactiveクラスを追加する。

onClick={() => setSelectedBodyPart(bodyPart)}
→ 押した部位名をselectedBodyPartへ保存する。

aria-pressed={selectedBodyPart === bodyPart}
→ 選択中かどうかを読み上げ機能へ伝える。
```

<details>
<summary>以前の大部位select方式で学んだ内容（現在のコードでは未使用）</summary>

選択中の種目IDを保存するStateです。

```jsx
const [selectedExerciseId, setSelectedExerciseId] =
  useState("");
```

ラベルと選択欄をつなぎます。

```jsx
<label htmlFor="bodyPart">
  部位
</label>
```

`htmlFor="bodyPart"`と、次の`id="bodyPart"`が対応します。

選択欄の開始部分です。

```jsx
<select
  id="bodyPart"
  value={selectedBodyPart}
```

- `id`：ラベルと選択欄を対応させる名前
- `value`：現在のStateを選択欄へ反映する

選択内容が変わったときの処理です。

```jsx
onChange={(event) =>
  setSelectedBodyPart(event.target.value)
}
```

一行ずつ読むと次の意味です。

```text
onChange={(event) =>
→ 選択内容が変わったとき、操作情報をeventで受け取る

event.target.value
→ 操作されたselectから選択値を取得する

setSelectedBodyPart(...)
→ 選択値をselectedBodyPartのStateへ保存する
```

最初に表示する未選択の項目です。

```jsx
<option value="">部位を選択</option>
```

`value=""`なので、この項目を選んでいる間は`selectedBodyPart`も空文字です。

大部位名を取り出して選択肢へ変換します。

```jsx
{Object.keys(exercisesByBodyPart).map((bodyPart) => (
```

- `Object.keys(exercisesByBodyPart)`：カタログから胸・背中・肩などのプロパティ名を配列で取得する
- `.map()`：取得したすべての大部位を順番に処理する
- `bodyPart`：現在処理している大部位名を受け取る変数
- `=>`：受け取った大部位名を下の`option`へ変換する

1件分の選択肢です。

```jsx
<option key={bodyPart} value={bodyPart}>
```

- `key`：Reactが各選択肢を区別する値
- `value`：選択後に`event.target.value`から取得される値

利用者が見る大部位名です。

```jsx
{bodyPart}
```

最後に`option`、`.map()`、JSX内のJavaScript処理を閉じます。

```jsx
</option>
))}
```

全体の流れです。

```text
種目カタログから大部位名を取得
        ↓
map()で1件ずつoptionへ変換
        ↓
利用者が大部位を選択
        ↓
event.target.valueで選択値を取得
        ↓
selectedBodyPartへ保存
```

</details>

現在の実装では、詳細部位と種目を`select`で1件ずつ選ばず、詳細部位カードをまとめて表示します。

<details>
<summary>以前のselect方式で学んだ内容（現在のコードでは未使用）</summary>

## 5-2. 以前のselect方式で詳細部位を表示する

詳細部位の選択状態を保存します。

```jsx
const [selectedTargetMuscle, setSelectedTargetMuscle] =
  useState("");
```

- `selectedTargetMuscle`：現在選択されている胸上部・広背筋などの詳細部位
- `setSelectedTargetMuscle`：詳細部位を変更する関数
- `useState("")`：最初は何も選択されていない

選択中の大部位から、詳細部位名の配列を作ります。

```jsx
const targetMuscleOptions = Object.keys(
  exercisesByBodyPart[selectedBodyPart] ?? {}
);
```

一行ずつ読むと次の意味です。

```text
exercisesByBodyPart[selectedBodyPart]
→ 選択中の大部位の中身を取得する

?? {}
→ 大部位が未選択なら空のオブジェクトを使う

Object.keys(...)
→ 胸上部・胸中部などのプロパティ名を配列で取得する

const targetMuscleOptions =
→ 取得結果を詳細部位の選択肢として保存する
```

胸を選択した場合の結果です。

```js
["胸上部", "胸中部", "胸下部", "胸全体"]
```

大部位が変わったときに実行する関数です。

```jsx
function handleBodyPartChange(event) {
  const nextBodyPart = event.target.value;
  setSelectedBodyPart(nextBodyPart);
  setSelectedTargetMuscle("");
  setSelectedExerciseId("");
}
```

一行ずつ読むと次の意味です。

```text
function handleBodyPartChange(event)
→ 大部位の選択変更を処理し、操作情報をeventで受け取る

const nextBodyPart = event.target.value
→ 新しく選択された大部位を取得する

setSelectedBodyPart(nextBodyPart)
→ 新しい大部位をStateへ保存する

setSelectedTargetMuscle("")
→ 前の大部位で選んだ詳細部位を空に戻す

setSelectedExerciseId("")
→ 前の大部位で選んだ種目を空に戻す
```

大部位の選択欄から関数を呼び出します。

```jsx
onChange={handleBodyPartChange}
```

Reactが選択操作の`event`を`handleBodyPartChange`へ自動的に渡します。

大部位が選択されている場合だけ、詳細部位のまとまりを表示します。

```jsx
{selectedBodyPart && (
  <div>
```

`selectedBodyPart`が空文字なら表示されません。胸などが入っていれば`div`の中を表示します。

詳細部位のラベルです。

```jsx
<label htmlFor="targetMuscle">
  詳細部位
</label>
```

詳細部位のStateを選択欄へ反映します。

```jsx
<select
  id="targetMuscle"
  value={selectedTargetMuscle}
```

選択が変わったら、新しい詳細部位をStateへ保存します。

```jsx
onChange={(event) =>
  setSelectedTargetMuscle(event.target.value)
}
```

最初に表示する未選択項目です。

```jsx
<option value="">詳細部位を選択</option>
```

詳細部位の配列を1件ずつ選択肢へ変換します。

```jsx
{targetMuscleOptions.map((targetMuscle) => (
```

`targetMuscle`には、胸上部・胸中部などが1件ずつ入ります。

1件分の選択肢です。

```jsx
<option key={targetMuscle} value={targetMuscle}>
  {targetMuscle}
</option>
```

- `key`：Reactが詳細部位を区別する値
- `value`：選択後に取得する詳細部位名
- `{targetMuscle}`：利用者が画面で見る文字

処理全体の流れです。

```text
利用者が胸を選択
        ↓
selectedBodyPartへ胸を保存
        ↓
胸オブジェクトから詳細部位名を取得
        ↓
targetMuscleOptionsへ配列で保存
        ↓
map()で詳細部位のoptionを表示
        ↓
選択した詳細部位をselectedTargetMuscleへ保存
```

## 5-3. 以前のselect方式で種目一覧を取り出す

選択した種目のIDを保存するStateです。

```jsx
const [selectedExerciseId, setSelectedExerciseId] =
  useState("");
```

- `selectedExerciseId`：現在選択されている種目のID
- `setSelectedExerciseId`：選択中の種目IDを変更する関数
- `useState("")`：最初は種目が未選択なので空文字から始める

選択中の大部位と詳細部位から、表示する種目一覧を取り出します。

```jsx
const exerciseOptions =
  exercisesByBodyPart[selectedBodyPart]?.[
    selectedTargetMuscle
  ] ?? [];
```

一行ずつ読むと次の意味です。

```text
const exerciseOptions =
→ 取り出した種目配列をexerciseOptionsという名前で定義する

exercisesByBodyPart[selectedBodyPart]
→ 全種目カタログから、現在選択中の大部位を取り出す

?.[selectedTargetMuscle]
→ 大部位が存在するときだけ、現在選択中の詳細部位を取り出す

?? []
→ 大部位や詳細部位が未選択なら、代わりに空の配列を使う
```

胸と胸中部を選んだ場合は、実質的に次の場所を読んでいます。

```jsx
exercisesByBodyPart["胸"]["胸中部"]
```

結果は種目オブジェクトが入った配列です。

```js
[
  {
    id: "barbell-bench-press",
    name: "バーベルベンチプレス",
    equipment: "バーベル",
  },
]
```

`?.[]`は、変数に入っているプロパティ名を安全に読む書き方です。大部位が未選択でもエラーを起こしません。

`?? []`は、左側が`undefined`または`null`なら空配列を使います。次に`.map()`で種目を並べるため、代わりの値も配列にしています。

詳細部位を変更する処理です。

```jsx
function handleTargetMuscleChange(event) {
  const nextTargetMuscle = event.target.value;
  setSelectedTargetMuscle(nextTargetMuscle);
  setSelectedExerciseId("");
}
```

一行ずつ読むと次の意味です。

```text
function handleTargetMuscleChange(event)
→ 詳細部位が変更されたときの処理を定義する

const nextTargetMuscle = event.target.value
→ 新しく選択された詳細部位を取得する

setSelectedTargetMuscle(nextTargetMuscle)
→ 新しい詳細部位をStateへ保存する

setSelectedExerciseId("")
→ 前の詳細部位で選んだ種目を空に戻す
```

詳細部位の選択欄から、この関数を呼び出します。

```jsx
onChange={handleTargetMuscleChange}
```

Reactが選択操作の`event`を関数へ自動的に渡します。

</details>

## 5-4. 詳細部位カードへ最初の3種目を表示する

担当ファイルは`app/components/ExerciseGroupCard.jsx`です。

詳細部位名と、その詳細部位に登録された種目配列を受け取ります。

```jsx
export default function ExerciseGroupCard({
  targetMuscle,
  exercises,
}) {
```

- `targetMuscle`：胸上部・胸中部などの詳細部位名
- `exercises`：その詳細部位に登録されている種目オブジェクトの配列
- `{ targetMuscle, exercises }`：親から渡されたpropsを名前ごとに取り出す分割代入

全種目から、カードへ最初に表示する3種目を取り出します。

```jsx
const previewExercises = exercises.slice(0, 3);
```

一行ずつ読むと次の意味です。

```text
exercises
→ その詳細部位に登録されている全種目

.slice(0, 3)
→ 0番目から3番目の直前まで、合計3件を取り出す

const previewExercises =
→ 取り出した3件をpreviewExercisesとして定義する
```

`.slice()`は元の配列を変更せず、新しい配列を作ります。

詳細部位名をカードの見出しとして表示します。

```jsx
<h3>{targetMuscle}</h3>
```

最初の3種目を1件ずつボタンへ変換します。

```jsx
{previewExercises.map((exercise) => (
```

`exercise`には、現在処理している1種目のオブジェクトが入ります。

```jsx
<button
  className="exerciseListButton"
  type="button"
  key={exercise.id}
>
```

- `className`：後から種目ボタンの見た目を指定する名前
- `type="button"`：フォームを誤って送信しない通常ボタンにする
- `key={exercise.id}`：Reactが各種目を区別するID

種目名と装飾用の矢印を表示します。

```jsx
<span>{exercise.name}</span>
<span aria-hidden="true">›</span>
```

`aria-hidden="true"`は、意味を持たない装飾用の矢印を読み上げ対象から外します。

現在は種目ボタンの表示だけです。種目の選択処理と「もっと見る」は次の工程で追加します。

カードが開いているかをStateで管理します。

```jsx
const [isExpanded, setIsExpanded] = useState(false);
```

```text
isExpanded
→ 全種目を表示しているかを保存する。

setIsExpanded
→ 開閉状態を変更する。

useState(false)
→ 最初は閉じた状態から始める。
```

開閉状態によって表示する種目配列を切り替えます。

```jsx
const visibleExercises = isExpanded
  ? exercises
  : exercises.slice(0, 3);
```

```text
const visibleExercises = isExpanded
→ isExpandedを条件に、表示する種目配列を定義する。

? exercises
→ 開いている場合はすべての種目を使う。

: exercises.slice(0, 3)
→ 閉じている場合は最初の3種目だけを使う。
```

表示する種目配列を1件ずつボタンへ変換します。

```jsx
{visibleExercises.map((exercise) => (
```

`visibleExercises`は、閉じている場合は3件、開いている場合は全件になります。

種目が4件以上ある場合だけ開閉ボタンを表示します。

```jsx
{exercises.length > 3 && (
```

```text
exercises.length > 3
→ 登録されている種目数が3件を超えているか確認する。

&&
→ 条件が正しい場合だけ続くボタンを表示する。
```

ボタンを押したときに開閉状態を反転します。

```jsx
onClick={() =>
  setIsExpanded((currentIsExpanded) => !currentIsExpanded)
}
```

```text
onClick={() =>
→ ボタンを押したときの処理を指定する。

currentIsExpanded
→ 変更する直前の開閉状態を受け取る。

!currentIsExpanded
→ falseをtrueへ、trueをfalseへ反転する。
```

開閉状態に合わせてボタンの文字を変更します。

```jsx
{isExpanded ? "閉じる" : "もっと見る"}
```

`isExpanded`が`true`なら「閉じる」、`false`なら「もっと見る」を表示します。

記録画面で詳細部位カードを使えるように読み込みます。

```jsx
import ExerciseGroupCard from "./ExerciseGroupCard";
```

選択中の大部位に含まれる詳細部位を、カードへ変換して表示します。

```jsx
{selectedBodyPart && (
  <div className="exerciseGroupList">
    {targetMuscleOptions.map((targetMuscle) => (
      <ExerciseGroupCard
        key={targetMuscle}
        targetMuscle={targetMuscle}
        exercises={
          exercisesByBodyPart[selectedBodyPart][targetMuscle]
        }
      />
    ))}
  </div>
)}
```

コードを一行ずつ読むと次の意味です。

```text
{selectedBodyPart && (
→ 大部位が選択されている場合だけカード一覧を表示する。

<div className="exerciseGroupList">
→ 複数の詳細部位カードを一つの一覧にまとめる。

{targetMuscleOptions.map((targetMuscle) => (
→ 詳細部位を1件ずつ受け取り、カードへ変換する。

<ExerciseGroupCard
→ 詳細部位カードを1枚表示する。

key={targetMuscle}
→ Reactが各カードを区別するために詳細部位名を使う。

targetMuscle={targetMuscle}
→ 胸上部などの詳細部位名をカードへ渡す。

exercises={exercisesByBodyPart[selectedBodyPart][targetMuscle]}
→ 選択中の大部位と詳細部位に対応する種目配列をカードへ渡す。
```

# 6. AIチャットのフロントエンド

担当ファイルは`app/chat/page.jsx`です。

## 全体のデータの流れ

```text
textareaへ質問を入力
    ↓
handleSubmitを実行
    ↓
利用者メッセージを画面へ追加
    ↓
POST /api/chatへJSONを送信
    ↓
返されたreplyをAIメッセージへ変換
    ↓
AIの吹き出しを画面へ追加
```

## 6-1. チャットで使うState

入力途中の文章です。

```js
const [draftMessage, setDraftMessage] = useState("");
```

会話履歴です。

```js
const [messages, setMessages] = useState([]);
```

送信中かどうかです。

```js
const [isSending, setIsSending] = useState(false);
```

エラー文章です。

```js
const [errorMessage, setErrorMessage] = useState("");
```

初期値の意味です。

| 初期値 | 意味 |
| --- | --- |
| `""` | まだ文章がない |
| `[]` | まだメッセージがない |
| `false` | まだ送信していない |

## 6-2. フォームの通常動作を止める

```js
async function handleSubmit(event) {
  event.preventDefault();
```

- `async`：関数内で`await`を使えるようにする
- `event`：送信時の情報
- `preventDefault()`：フォーム送信によるページ再読み込みを止める

## 6-3. 入力前後の空白を削除する

```js
const trimmedMessage = draftMessage.trim();
```

`trim()`は文字列の先頭と末尾にある空白や改行を削除します。

## 6-4. 送ってはいけない場合は終了する

```js
if (!trimmedMessage || isSending) {
  return;
}
```

次のどちらかなら終了します。

- 質問が空
- すでに送信中

## 6-5. 他機能の目標体型を読む

```js
const goalBodyType =
  localStorage.getItem("goalBodyType") ?? "";
```

理想の体機能が保存した`goalBodyType`を読みます。保存されていない場合は空文字を使います。

## 6-6. 利用者メッセージを作る

基本の型です。

```js
const 変数名 = {
  プロパティ名: 値,
};
```

現在のコードです。

```js
const userMessage = {
  id: crypto.randomUUID(),
  role: "user",
  content: trimmedMessage,
};
```

| プロパティ | 用途 |
| --- | --- |
| `id` | メッセージを区別する番号 |
| `role` | 利用者とAIを区別する役割 |
| `content` | 表示する本文 |

## 6-7. 現在の履歴を残して追加する

基本の型です。

```js
setState((現在の値) => [
  ...現在の値,
  新しい値,
]);
```

現在のコードです。

```js
setMessages((currentMessages) => [
  ...currentMessages,
  userMessage,
]);
```

- `currentMessages`：更新直前の会話履歴
- `...currentMessages`：現在の全メッセージを新しい配列へ展開する
- `userMessage`：配列の最後へ追加する

## 6-8. 送信前の画面状態を変える

```js
setDraftMessage("");
setIsSending(true);
setErrorMessage("");
```

順番に、入力欄を空にし、送信中へ変更し、以前のエラーを消します。

## 6-9. バックエンドへ送る

通信の外側です。

```js
const response = await fetch("/api/chat", {
  // 通信設定を書く
});
```

- `fetch()`：指定したURLへ通信する
- `await`：レスポンスが返るまでこの関数の続きを待つ
- `response`：返ってきたレスポンス全体

送信方法です。

```js
method: "POST",
```

`POST`はデータをバックエンドへ送る方法です。

JSONを送ることを伝える部分です。

```js
headers: {
  "Content-Type": "application/json",
},
```

送るデータです。

```js
body: JSON.stringify({
  message: trimmedMessage,
  userData: {
    goalBodyType,
  },
}),
```

ここは入れ子構造です。

```text
送信データ
├── message
└── userData
    └── goalBodyType
```

`JSON.stringify()`はJavaScriptのオブジェクトを通信できるJSON文字列へ変換します。

## 6-10. 返されたJSONを読む

```js
const data = await response.json();
```

`response`全体からJSON部分を読み取り、JavaScriptのオブジェクトとして`data`へ保存します。

## 6-11. AIメッセージを作る

```js
const assistantMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content: data.reply,
};
```

バックエンドが返した`reply`を、AI側のメッセージ本文へ入れます。

このメッセージも同じ型で履歴へ追加します。

```js
setMessages((currentMessages) => [
  ...currentMessages,
  assistantMessage,
]);
```

## 6-12. 失敗時と終了時の処理

失敗した場合です。

```js
catch {
  setErrorMessage(
    "回答を取得できませんでした。もう一度お試しください。"
  );
}
```

成功・失敗のどちらでも最後に実行する部分です。

```js
finally {
  setIsSending(false);
}
```

`false`へ戻すことで、入力と送信ボタンを再び使えるようにします。

## 6-13. Enterで送信する

日本語入力の変換中か確認します。

```js
if (event.nativeEvent.isComposing) {
  return;
}
```

変換確定のEnterで誤送信しないための処理です。

次に、EnterとShiftキーを確認します。

```js
if (event.key === "Enter" && !event.shiftKey) {
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
```

```text
Enterだけ
→ フォームを送信

Shift + Enter
→ 条件に入らないため改行
```

## 6-14. 会話履歴を吹き出しへ変換する

```jsx
{messages.map((message) => (
  <div
    key={message.id}
    className={`chatMessage ${message.role}`}
  >
    <p>{message.content}</p>
  </div>
))}
```

このコードは3段階です。

1. `.map()`でメッセージを1件ずつ受け取る
2. `role`をクラス名へ入れて利用者とAIの見た目を分ける
3. `content`を吹き出しの本文として表示する

## 6-15. textareaとStateをつなぐ

現在の値を表示します。

```jsx
value={draftMessage}
```

入力が変わるたびにStateを更新します。

```jsx
onChange={(event) =>
  setDraftMessage(event.target.value)
}
```

Enter操作を関数へ渡します。

```jsx
onKeyDown={handleKeyDown}
```

Reactが入力値をStateで管理する形を「制御コンポーネント」と呼びます。

# 7. AIチャットのバックエンド

担当ファイルは`app/api/chat/route.js`です。

## バックエンドの流れ

```text
フロントエンドからPOSTを受け取る
    ↓
JSONをJavaScriptオブジェクトへ変換
    ↓
目標体型を安全に取得
    ↓
システムプロンプトと質問をOpenAIへ送る
    ↓
結果をaiResponseへ保存
    ↓
replyをJSONでフロントエンドへ返す
```

## 7-1. OpenAIを使う準備

SDKを読み込みます。

```js
import OpenAI from "openai";
```

プロンプトを別ファイルから読み込みます。

```js
import { systemPrompt } from "../../lib/ai/systemPrompt";
```

通信に使用するクライアントを作ります。

```js
const openai = new OpenAI();
```

`new OpenAI()`は`.env.local`の`OPENAI_API_KEY`をサーバー側で読み取ります。

## 7-2. POSTリクエストを受け取る

```js
export async function POST(request) {
```

- `export`：フレームワークから実行できるように公開する
- `POST`：`POST /api/chat`を受け付ける関数名
- `request`：届いたリクエスト全体

## 7-3. 届いたJSONを読む

```js
const body = await request.json();
```

`request.json()`でJSONをJavaScriptオブジェクトへ変換し、`body`へ保存します。

## 7-4. 目標体型を安全に読む

```js
const goalBodyType =
  body.userData?.goalBodyType ?? "未設定";
```

読む順番です。

```text
body
→ 受信データ全体

.userData
→ 利用者データのまとまり

?.goalBodyType
→ userDataがある場合だけ目標体型を読む

?? "未設定"
→ 値がない場合は「未設定」を使う
```

## 7-5. OpenAIへ回答作成を依頼する

基本の型です。

```js
const 結果 = await OpenAIへ送る処理({
  使用するモデル,
  AIへの指示,
  利用者の入力,
});
```

### 結果の保存先とAPI

```js
const aiResponse = await openai.responses.create({
```

- `aiResponse`：OpenAIから返される結果全体
- `responses.create()`：回答を新しく作る処理

### 使用するモデル

```js
model: "gpt-5.6-luna",
```

`model`は回答作成に使用するAIを指定します。

### AIへの指示

```js
instructions: `${systemPrompt}

# 今回の利用者データ

目標体型：${goalBodyType}`,
```

この文字列は2種類の情報を結合しています。

```text
systemPrompt
→ AIの役割と共通ルール

goalBodyType
→ 今回の利用者が選んだ目標体型
```

### 利用者の質問

```js
input: body.message,
```

フロントエンドが送った`message`をAIへの入力にします。

### 設定を閉じる

```js
});
```

ここで`responses.create()`の設定オブジェクトと呼び出しが終わります。

## 7-6. JSONをフロントエンドへ返す

OpenAIが作った回答文をフロントエンドへ返します。

```js
return Response.json({
  reply: aiResponse.output_text,
});
```

- `Response.json()`：オブジェクトをJSONレスポンスへ変換する
- `reply`：フロントエンドが`data.reply`で読む名前
- `aiResponse.output_text`：OpenAIの結果全体から回答文だけを取り出す
- `return`：レスポンスを返して関数を終了する

読む順番です。

```text
aiResponse
→ OpenAIから返された結果全体

.output_text
→ 結果の中にある回答文だけを取得

reply:
→ 回答文をreplyという名前でJSONへ入れる
```

# 8. システムプロンプト

担当ファイルは`app/lib/ai/systemPrompt.js`です。

## 基本の型

```js
export const 変数名 = `
複数行の文章
`;
```

現在の開始部分です。

```js
export const systemPrompt = `
# 役割

あなたは、利用者の理想の身体づくりを支援する筋力トレーニングAIです。
```

- `export`：`route.js`から読み込めるようにする
- `const systemPrompt`：共通指示を保存する変数
- バッククォート：改行を含む長い文字列を作る

プロンプトは役割ごとに分かれています。

| 見出し | 決める内容 |
| --- | --- |
| `# 役割` | 筋力トレーニングAIとして回答する |
| `# 目的` | 今日取るべき行動が分かる回答にする |
| `# 回答方針` | 日本語、具体性、不足情報、安全性 |
| `# 利用者データの扱い` | 事実と推測を区別し、渡されていない情報を作らない |

長いプロンプトを`route.js`へ直接書かない理由は、**通信処理とAIの回答ルールを別々に読めるようにするため**です。

# 9. CSSの読み方

担当ファイルは`app/globals.css`です。

CSSはすべてを丸ごと暗記せず、対象・設定・値の3つに分けて読みます。

## 基本の型

```css
.対象のクラス名 {
  設定する項目: 値;
}
```

## 体型カードを2列にする

```css
.bodyTypeButtons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
```

- `display: grid`：Gridレイアウトを使う
- `repeat(2, ...)`：2列作る
- `gap`：カード間の隙間

## 選択中のカードを変える

```css
.bodyTypeButton.selected {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--background);
}
```

`.bodyTypeButton`と`.selected`の両方が付いた要素だけに適用されます。

## 会話を縦に並べる

```css
.chatMessages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

`flex-direction: column`で吹き出しを上から下へ並べます。

## 利用者とAIを左右へ分ける

利用者側です。

```css
.chatMessage.user {
  align-self: flex-end;
}
```

AI側です。

```css
.chatMessage.assistant {
  align-self: flex-start;
}
```

## LINE風の入力欄

丸みです。

```css
.chatInput {
  border-radius: 22px;
}
```

入力中の枠色です。

```css
.chatInput:focus {
  border-color: var(--accent);
}
```

操作できない送信ボタンです。

```css
.chatSendButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## 下部メニューを画面下へ固定する

```css
.bottomNavigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
}
```

- `position: fixed`：画面をスクロールしても同じ位置へ固定する
- `bottom: 0`：画面の一番下へ配置する
- `right: 0`と`left: 0`：画面の横幅いっぱいに広げる

6つの機能を横一列へ並べます。

```css
.bottomNavigationInner {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
```

- `display: grid`：下部メニューをGridレイアウトにする
- `repeat(6, ...)`：同じ幅の列を6個作る
- `minmax(0, 1fr)`：長い文字があっても6列を同じ幅で収める

選択中の機能だけアクセントカラーへ変えます。

```css
.bottomNavigationLink.active {
  color: var(--accent);
}
```

本文が固定メニューの後ろへ隠れないように、`body`の下側へ余白を作ります。

```css
body {
  padding-bottom: 96px;
}
```

## トレーニング記録の部位ボタンを横並びにする

```css
.bodyPartTabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}
```

- `display: flex`：胸・背中・肩などのボタンを横方向へ並べる
- `gap: 8px`：部位ボタン同士に隙間を作る
- `overflow-x: auto`：画面へ収まらない場合に横スクロールできるようにする
- `scrollbar-width: none`：操作は残したままスクロールバーを隠す

各部位ボタンを押しやすいカプセル型にします。

```css
.bodyPartTab {
  min-width: 64px;
  min-height: 44px;
  flex: 0 0 auto;
  border-radius: 999px;
}
```

- `min-width`：ボタンが小さくなりすぎるのを防ぐ
- `min-height`：スマホで押しやすい高さを確保する
- `flex: 0 0 auto`：横幅を縮めず、横スクロール側へ並べる
- `border-radius: 999px`：左右が丸い形にする

選択中の部位だけアクセントカラーへ変えます。

```css
.bodyPartTab.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--background);
}
```

## 詳細部位と種目をカード形式にする

詳細部位カードを隙間を空けて縦へ並べます。

```css
.exerciseGroupList {
  display: grid;
  gap: 16px;
}
```

胸上部などの見出しと種目一覧を一枚のカードへまとめます。

```css
.exerciseGroupCard {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
}
```

- `overflow: hidden`：中の背景や線をカードの角丸内へ収める
- `border-radius: 18px`：カードの角を丸くする
- `background: var(--surface)`：共通のカード背景色を使う

種目名と矢印を左右へ配置します。

```css
.exerciseListButton {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  background: transparent;
}
```

- `width: 100%`：種目ボタンをカード幅いっぱいにする
- `min-height: 52px`：スマホで押しやすい高さを作る
- `justify-content: space-between`：種目名を左、矢印を右へ置く
- `background: transparent`：ブラウザ標準の灰色背景を消す

「もっと見る」をカード幅いっぱいにします。

```css
.exerciseMoreButton {
  width: 100%;
  min-height: 44px;
  color: var(--accent);
}
```

# 10. 基本の型まとめ

## 変数を定義する

```js
const 変数名 = 値;
```

## 関数を定義する

```js
function 関数名(受け取る値) {
  実行する処理;
}
```

## Stateを定義する

```js
const [現在の値, 更新する関数] = useState(初期値);
```

## オブジェクトを作る

```js
const 変数名 = {
  プロパティ名: 値,
};
```

## 配列を画面表示へ変換する

```jsx
{配列.map((1件分) => (
  <表示する要素 key={識別する値} />
))}
```

## 条件で処理を終了する

```js
if (終了する条件) {
  return;
}
```

## 条件によって表示を切り替える

```jsx
{条件 && <表示する要素 />}
```

## 条件によって値を切り替える

```js
条件 ? 正しい場合の値 : 違う場合の値
```

## 非同期通信を行う

```js
async function 関数名() {
  const 結果 = await 通信処理();
}
```

## エラー処理を行う

```js
try {
  成功する可能性がある処理;
} catch {
  失敗した場合の処理;
} finally {
  成功・失敗のどちらでも行う処理;
}
```

# 11. 単語帳

## JavaScript

| 単語 | 意味 |
| --- | --- |
| `const` | 変数を定義する |
| `function` | 再利用できる処理を定義する |
| `return` | 値を返す、または関数を終了する |
| `if` | 条件が正しい場合だけ処理する |
| `!` | 真偽を反対にする |
| `===` | 型も含めて左右が同じか確認する |
| `&&` | 左右の条件が両方正しいか確認する。Reactでは条件表示にも使う |
| `||` | 左右のどちらかが正しいか確認する |
| `? :` | 条件によって2つの値を切り替える |
| `[]` | 配列を作る |
| `{}` | オブジェクトや処理のまとまりを作る |
| `プロパティ` | オブジェクト内の名前付きデータ |
| `.` | オブジェクトの中にあるプロパティや機能を使う |
| `object[variable]` | 変数に入っている名前を使ってオブジェクトのプロパティを取得する |
| `=>` | アロー関数を作る |
| `.map()` | 配列の全要素を別の形へ変換する |
| `.slice(0, 3)` | 配列を変更せず、先頭から3件を新しい配列として取り出す |
| `...` | 配列などの中身を展開する |
| `.trim()` | 文字列の前後の空白を削除する |
| `.length` | 文字数や配列の要素数を取得する |
| `?.` | 左側が存在する場合だけ続きを読む |
| `??` | 左側が`null`か`undefined`の場合だけ右側を使う |
| テンプレートリテラル | バッククォートで文字列を作り`${}`で値を埋め込む |
| `new` | 設計図から新しいオブジェクトを作る |
| `Object.keys()` | オブジェクトのプロパティ名を配列として取得する |
| props | 親コンポーネントから子コンポーネントへ渡されるデータ |

## 非同期処理と通信

| 単語 | 意味 |
| --- | --- |
| `async` | 関数内で`await`を使えるようにする |
| `await` | Promiseの結果が返るまで関数内の続きを待つ |
| `Promise` | 将来完了する処理と結果を表す |
| `try` | 失敗する可能性がある処理を書く |
| `catch` | `try`が失敗した場合に実行する |
| `finally` | 成功・失敗に関係なく最後に実行する |
| `fetch()` | URLへHTTP通信する |
| `POST` | データを送るHTTPメソッド |
| `headers` | 通信データの補足情報 |
| `Content-Type` | 送るデータ形式を伝えるヘッダー |
| `JSON.stringify()` | オブジェクトをJSON文字列へ変換する |
| `request.json()` | 受信したJSONをJavaScriptオブジェクトへ変換する |
| `response.json()` | レスポンスのJSONをJavaScriptオブジェクトへ変換する |
| `Response.json()` | JavaScriptオブジェクトをJSONレスポンスにする |

## ReactとJSX

| 単語 | 意味 |
| --- | --- |
| コンポーネント | 画面を機能ごとに分けた部品 |
| JSX | JavaScript内へHTMLに似た表示を書く記法 |
| `import` | 別ファイルの機能を読み込む |
| `export default` | ファイルの代表として機能を公開する |
| props | 親コンポーネントから子へ渡す値 |
| `children` | 開始タグと終了タグの間に書かれた中身 |
| `useState` | 画面上で変化する値をReactに記憶させる |
| `setState` | Stateを更新し、必要な画面を再表示する |
| `key` | 繰り返し表示する要素をReactが区別する値 |
| `className` | JSXでCSSクラスを指定する |
| `disabled` | 入力やボタンを操作できない状態にする |
| `role="alert"` | エラーなど重要な変化を支援技術へ伝える |

## イベント

| 単語 | 意味 |
| --- | --- |
| `event` | クリックや入力など操作の情報 |
| `event.target` | 操作が発生した要素 |
| `event.currentTarget` | イベント処理が登録されている要素 |
| `event.preventDefault()` | ブラウザの標準動作を止める |
| `onClick` | クリック時に処理する |
| `onChange` | 入力内容が変わったときに処理する |
| `onKeyDown` | キーを押したときに処理する |
| `event.key` | 押されたキーの名前 |
| `shiftKey` | Shiftキーも押されているかを表す |
| `isComposing` | 日本語入力の変換中かを表す |
| `requestSubmit()` | フォームの送信処理を実行する |

## ブラウザAPI

| 単語 | 意味 |
| --- | --- |
| `localStorage` | 同じブラウザ内に文字列データを保存する |
| `setItem()` | localStorageへ名前と値を保存する |
| `getItem()` | 保存名を使って値を読み取る |
| `FileReader` | ブラウザでファイル内容を読み取る |
| `onload` | ファイルの読み取り完了後に実行する |
| `readAsDataURL()` | 画像を`img`で表示できるData URLへ変換する |
| `crypto.randomUUID()` | 重複しにくいID文字列を作る |

## CSS

| 単語 | 意味 |
| --- | --- |
| CSSクラス | 複数の要素へ再利用できる見た目の名前 |
| `var()` | `:root`で定義したCSS変数を使う |
| Grid | 行と列で要素を並べるレイアウト |
| Flexbox | 一方向へ要素を並べるレイアウト |
| `flex-direction` | Flexboxで並べる方向を決める |
| `align-self` | 1要素だけ配置位置を変える |
| `object-fit` | 画像を枠へどう収めるか決める |
| `:focus` | 入力欄が選択中のときに適用する |
| `::placeholder` | 入力前の例文へ適用する |
| `:disabled` | 操作できない要素へ適用する |

# 12. PostgreSQLバックエンド

## 12-0. 初心者向け：バックエンドの基本

### バックエンドとは何か

バックエンドは、利用者の画面から直接見えない場所で、データの確認・保存・取得や本人確認を行う処理です。

このアプリでは、友達が担当するiPhoneの画面がフロントエンド、自分が担当するAPI・認証・データベース・AI連携がバックエンドです。

```text
フロントエンド
→ 利用者が見る画面、ボタン、入力欄

バックエンド
→ 本人確認、入力チェック、保存、検索、AIとの通信

データベース
→ バックエンドから渡された情報を長期間保存する場所
```

バックエンドとデータベースは同じものではありません。

バックエンドは「何を確認し、何を保存し、何を返すか」を判断する係です。

Neon PostgreSQLは、判断されたユーザー情報や記録を実際に保管する場所です。

### なぜフロントエンドからNeonを直接操作しないのか

フロントエンドのコードは利用者の端末へ配られるため、秘密鍵やデータベースの接続情報を書いてはいけません。

また、画面から届いたユーザーIDや入力値が正しいとは限りません。

そのため、必ずバックエンドが本人確認と入力チェックを行ってからNeonを操作します。

```text
iPhoneアプリ
    ↓ リクエスト
バックエンドAPI
    ├─ 本当にログインしているか確認
    ├─ 入力内容が正しいか確認
    ├─ 本人のデータだけを検索・保存
    └─ 画面へ返してよい情報だけを選ぶ
    ↓
Neon PostgreSQL
```

### APIとは何か

APIは、フロントエンドとバックエンドが情報を受け渡すための受付窓口です。

このプロジェクトでは、`app/api/.../route.ts`がAPIのファイルです。

例えば`app/api/users/bootstrap/route.ts`は、ログイン後にユーザーを準備するための受付窓口です。

フロントエンドはAPIへリクエストを送り、バックエンドは処理結果をレスポンスとして返します。

```text
リクエスト：フロントエンドからバックエンドへ送るもの
レスポンス：バックエンドからフロントエンドへ返すもの
```

### HTTPメソッドの基本

| 書き方 | 主な目的 | このアプリでの例 |
| --- | --- | --- |
| `GET` | データを取得する | 保存済みプロフィールを取得する |
| `POST` | 新しい処理や登録を行う | ログイン後のユーザーを初期化する |
| `PATCH` | 既存データの一部を更新する | 理想体型やプロフィールを変更する |
| `DELETE` | データを削除する | チャット履歴を削除する |

メソッド名だけで安全性が決まるわけではありません。どのAPIでも、本人確認と入力チェックが必要です。

### JSONとは何か

JSONは、フロントエンドとバックエンドの間でデータを渡すための共通形式です。

```json
{
  "goalBodyType": "細マッチョ"
}
```

JSON自体はデータベースではありません。

JSONは通信中のデータの形で、Neon PostgreSQLはデータを長期間保存する場所です。

### 1回のバックエンド処理で行う基本順序

このプロジェクトのユーザー用APIは、基本的に次の順番で考えます。

```text
1. リクエストを受け取る
2. Clerkでログインを確認する
3. ClerkユーザーIDを取得する
4. 入力値を確認する
5. Neonから本人のデータを検索する
6. 必要なデータを保存・更新・取得する
7. JSONとHTTPステータスを返す
8. 失敗した場合は安全なエラーを返す
```

毎回ログイン画面を表示するわけではありません。

Clerkが発行したセッショントークンを各リクエストに付け、バックエンドがそのトークンを毎回確認します。

これは、以前ログインしたかを何度も尋ねる処理ではなく、「今回の通信も本当に本人から届いたか」を確認する処理です。

### 認証とユーザー検索の違い

認証は、Clerkを使って「誰から届いた通信か」を確認することです。

ユーザー検索は、確認できたClerkユーザーIDを使ってNeonから本人のアプリデータを探すことです。

```text
Clerk
→ この通信は clerkUserId = user_abc の本人だと確認

Neon
→ clerk_user_id = user_abc のプロフィールや記録を検索
```

Clerkはパスワードやログイン状態を管理し、Neonは身長・体重・理想体型・トレーニング記録などを管理します。

### HTTPステータスの基本

| 番号 | 意味 | 使用例 |
| --- | --- | --- |
| `200` | 処理成功 | 既存データの取得や更新に成功 |
| `201` | 新規作成成功 | 初めてユーザーをNeonへ登録した |
| `400` | 入力内容に問題がある | 必須メールや身長がない |
| `401` | ログイン確認ができない | トークンがない・無効・期限切れ |
| `404` | 対象データが見つからない | 本人のユーザーデータがない |
| `500` | サーバー内部で失敗した | DB接続など予期しないエラー |

### バックエンドのコードを読むときの考え方

最初からすべての文法を暗記する必要はありません。

まず、各コードを次の5種類に分けて読むと流れを理解しやすくなります。

```text
入力：何を受け取ったか
認証：誰から届いたか
確認：値を保存してよいか
DB操作：何を検索・保存・更新したか
出力：画面へ何を返したか
```

今回の`bootstrap` APIも、この5種類を順番に実行しているだけです。

## 現在の担当分担

| 担当 | 作る範囲 |
| --- | --- |
| 友達 | React画面・ボタン・入力フォーム・カード・スマホ向けCSSなどのUI |
| 自分 | バックエンドAPI・Neon PostgreSQL・認証・入力値チェック・AI・フロントエンドとAPIの接続 |

友達が作った画面から入力値を受け取り、APIへ接続する`fetch()`も自分の担当です。

```text
友達が作る画面UI
        ↓
自分がfetch()でAPIへ接続
        ↓ JSON
自分が作るapp/api内のバックエンド
        ↓
Neon PostgreSQL・OpenAI API
```

友達は`.env.local`の秘密情報やNeonへ直接アクセスせず、画面側で必要な値と操作を用意します。

## バックエンドで使う言語・ライブラリ・形式の違い

| 分類 | 名前 | このプロジェクトでの役割 |
| --- | --- | --- |
| プログラミング言語 | TypeScript | `route.ts`・`schema.ts`などのバックエンド処理を型付きで書く |
| プログラミング言語 | JavaScript | 一部の既存APIやフロントエンド処理を書く |
| UIの書き方 | JSX | Reactで画面の要素を書く |
| DB操作ライブラリ | Drizzle ORM | TypeScriptからPostgreSQLを検索・登録・更新する |
| 通信データ形式 | JSON | フロントエンドとバックエンドの間で値を送受信する |
| DB用言語 | SQL | PostgreSQLへテーブル作成やデータ操作を命令する |
| データベース | PostgreSQL | ユーザー情報・記録・会話を保存する |
| DB提供サービス | Neon | PostgreSQLをインターネット上で利用できるようにする |

`app/api/users/goal/route.ts`で直接書いている言語はTypeScriptです。

```text
TypeScriptでAPI処理を書く
        ↓
Drizzle ORMを使ってDB操作を表す
        ↓
内部でSQLとしてPostgreSQLへ送られる
        ↓
結果をJSON形式でフロントエンドへ返す
```

Drizzle ORM・JSON・PostgreSQL・Neonは、すべてTypeScriptとは役割が違います。

### TypeScriptとJavaScriptを分けている理由

現在のプロジェクトは、すでに作成済みのフロントエンドがJavaScript・JSX、新しく作るDBとバックエンドの中心部分がTypeScriptになっています。

```text
既存のReact画面
→ JavaScript・JSX

新しいDB設計・ユーザーAPI
→ TypeScript
```

TypeScriptはJavaScriptへ型の確認を追加した言語で、実行前に値の種類やデータ構造の間違いを見つけやすくなります。

バックエンドではユーザーID・認証情報・DBの列・APIの入力値など、形を間違えると保存やセキュリティに影響するデータを扱うため、TypeScriptを使っています。

フロントエンドの既存コードはJavaScriptで正常に動いているため、学習途中で全ファイルを書き換えて複雑にせず、そのまま利用しています。

```text
TypeScriptを使う主な場所
- db/schema.ts
- db/index.ts
- app/api/users/.../route.ts
- drizzle.config.ts

JavaScript・JSXを使う主な場所
- app/components/...jsx
- app/.../page.jsx
- 既存のapp/api/chat/route.js
```

今後の基本方針は、新しく作るDB・認証・保存APIはTypeScript、既存のReact画面は現在のJavaScript・JSXに合わせることです。フロントエンドを将来TypeScriptへ統一する場合は、`.jsx`を`.tsx`へ段階的に移行します。

## 12-1. バックエンドで使用している技術

| 技術 | 何をするものか | 現在の状態 |
| --- | --- | --- |
| Next.js Route Handler | `app/api`内へGET・POSTなどのAPIを作る | AIチャットAPIで使用中 |
| Vinext | Next.js形式のアプリをVite・Cloudflare Workers環境で動かす | 使用中 |
| TypeScript | DB設定やテーブル定義を型付きで書く | `db`と設定ファイルで使用中 |
| Neon PostgreSQL | ユーザー情報・記録・会話を永続保存するデータベース | 接続済み・usersテーブル作成済み |
| Drizzle ORM | TypeScriptからPostgreSQLの保存・取得・更新・削除を行う | DB接続とusersテーブル定義まで実装済み |
| Drizzle Kit | テーブル設計からマイグレーションファイルを作り、DBへ適用する | usersテーブルのマイグレーション適用済み |
| `@neondatabase/serverless` | Cloudflare WorkersなどからNeonへHTTP接続するドライバー | インストール済み |
| `dotenv` | マイグレーションコマンドから`.env.local`を読み込む | インストール済み |
| OpenAI SDK | 質問やユーザーデータをOpenAI APIへ送り、AI回答を受け取る | 基本チャットで使用中 |
| JSON | フロントエンドとバックエンド間でデータを送受信する形式 | チャットAPIで使用中 |
| Clerk | ログイン・セッション・本人確認を担当する認証サービス | 導入・API移行作業中 |
| `@clerk/backend` | iPhoneアプリから届くClerkトークンをバックエンドで検証する | 共通認証ファイルと初期化APIで使用中 |
| Cloudflare Workers | デプロイ後にAPIやサーバー処理を実行する環境 | プロジェクトの実行基盤 |

### PostgreSQL・Neon・Drizzleの違い

```text
PostgreSQL
→ データを保存・検索するデータベース本体

Neon
→ PostgreSQLをインターネット上で管理・提供するサービス

Drizzle ORM
→ TypeScriptからPostgreSQLを操作するための仕組み

Drizzle Kit
→ テーブルの作成・変更履歴を生成してDBへ反映する開発用ツール
```

### バックエンド全体のデータの流れ

```text
Reactの入力フォーム
        ↓ JSON
Next.jsのAPI（app/api/.../route.js）
        ↓ 入力値チェック
Drizzle ORM
        ↓ SQL操作
Neon PostgreSQL
        ↓ 保存結果・検索結果
Next.jsのAPI
        ↓ JSON
Reactへ結果を表示
```

AIを使う場合は、PostgreSQLから取得した情報をOpenAIへ追加で渡します。

```text
Neon PostgreSQLから過去記録を取得
        ↓
必要なデータだけ整理
        ↓
OpenAI APIへ質問と一緒に送信
        ↓
AI回答を受け取る
        ↓
回答と会話履歴をPostgreSQLへ保存
        ↓
フロントエンドへJSONで返す
```

PostgreSQLへ保存するだけではAIの長期記憶になりません。質問時に必要な過去データを取得し、OpenAIへ渡す処理まで作ることで長期記憶として機能します。

## 12-2. バックエンド関連ファイルの役割

| ファイル・フォルダ | 役割 |
| --- | --- |
| `.env.local` | DB接続文字列とOpenAI APIキーを外部へ公開せず保存する |
| `db/schema.ts` | users・profiles・training_recordsなどのテーブルを定義する |
| `db/index.ts` | APIからNeon PostgreSQLへ接続する共通関数を提供する |
| `drizzle.config.ts` | Drizzle KitへDB種類・スキーマ・接続先を伝える |
| `drizzle-postgres/` | PostgreSQL用のテーブル変更履歴を保存する |
| `app/api/.../route.ts` | フロントエンドからの通信を受け取り、本人確認後にDBやAIを操作する |
| `app/lib/ai/systemPrompt.js` | AIの役割・回答ルール・禁止事項を定義する |
| `app/lib/auth/clerk-auth.ts` | Clerkトークンを検証し、本人のClerkユーザーIDを取得する |

### `db/index.ts`と`drizzle.config.ts`の違い

```text
db/index.ts
→ アプリ実行中にAPIがデータを保存・取得するために使う

drizzle.config.ts
→ 開発中にテーブルを作成・変更するコマンドが使う
```

## 12-3. バックエンドで作る機能

| 機能 | バックエンドの役割 | 現在の状態 |
| --- | --- | --- |
| 初回起動判定 | 初回設定が完了しているか返す | 初期化API実装済み・Neon接続テスト成功 |
| ユーザー管理 | 認証情報とアプリ内ユーザーIDを結び付ける | 検索・新規登録API実装済み・Neon接続テスト成功 |
| 理想体型 | 選択した目標体型をユーザーごとに保存・取得する | 保存API実装済み・Neon接続テスト成功 |
| プロフィール | 身長・体重・体脂肪率・可能時間などを保存する | 保存・取得API実装済み。身長・体重のみ必須 |
| 身体分析 | 3方向の写真をPythonとOpenAIで分析し、結果を日付付きで保存する | Render公開、Neon保存、履歴取得、AI Toolでの利用まで確認済み |
| トレーニング記録 | 種目・重量・回数・セット・時間・調子・メモを保存する | 保存APIとNeon保存まで実装済み |
| 記録履歴 | 日付やユーザーIDで過去記録を取得する | 本人の履歴取得とAI Toolでの利用を確認済み |
| 体重記録 | 日付ごとの体重を保存し、グラフ用データを返す | 未実装 |
| 画像保存 | 身体写真は分析時に送信できる。本番用画像ストレージへの長期保存は未実装 |
| AIメニュー | 過去記録とプロフィールからメニューを生成・保存する | OpenAI生成、Neon保存、再取得まで実装済み |
| AIチャット | OpenAIへ質問を送り、回答を返す | スマホからの実通信とNeon保存を確認済み |
| チャット履歴 | ルーム・メッセージ・タイトルをユーザーごとに保存する | Neon保存・GET API・アプリ再読み込み後の画面復元まで確認済み |
| AI Tool | AIが目標・記録・プロフィールを必要に応じて取得する | 4つのToolを実装し、すべて実通信確認済み |
| 長期記憶 | 過去データを検索してAIへ渡し、回答と履歴を保存する | 直近20件の会話と各機能データをAIへ渡せる。履歴画面の復元も確認済み |

### AI Toolへ渡す情報の方針

最終的に、AIはログイン中のユーザー本人についてアプリ内へ保存された全機能の情報をTool経由で取得できるようにします。

```text
理想体型
身体プロフィール
体重履歴
身体分析結果
トレーニング記録
最近鍛えていない部位
過去に生成したAIメニュー
メニューの実施結果
コンディション・調子・メモ
AIチャット履歴と長期記憶
```

「全情報を利用可能にする」ことと「毎回すべてを一度にAIへ送る」ことは分けて考えます。

履歴が増えた後も入力上限やAPI料金を抑えるため、AIがToolへ情報の種類・期間・件数を指定し、必要なデータを取得する構成にします。

```text
AIが質問内容を確認
        ↓
必要なToolと取得条件を選ぶ
        ↓
PostgreSQLから本人のデータだけ取得
        ↓
必要な情報をAIへ返す
        ↓
取得結果を使って回答する
```

Toolへ渡さない情報は、`DATABASE_URL`・OpenAI APIキー・認証用の秘密情報・他ユーザーのデータです。

身体写真などの容量が大きいデータは、毎回の会話へ画像全体を渡さず、保存済みの分析結果や必要な画像だけを取得する設計にします。

## 12-4. Drizzle KitのPostgreSQL設定

担当ファイルは`drizzle.config.ts`です。

`.env.local`からNeonの接続文字列を読み込みます。

```ts
import { config } from "dotenv";

config({ path: ".env.local" });
```

PostgreSQL用マイグレーションの保存先・スキーマ・接続先を指定します。

```ts
export default defineConfig({
  out: "./drizzle-postgres",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
```

- `out`：PostgreSQL用のテーブル変更履歴を保存する場所
- `schema`：テーブル設計を読み取るファイル
- `dialect`：使用するDBの種類をPostgreSQLにする
- `dbCredentials`：マイグレーションを適用するNeonの接続情報

## 12-5. Neon PostgreSQLへ接続する場所

担当ファイルは`db/index.ts`です。

このファイルは、APIとNeon PostgreSQLをつなぐ共通の入口です。

```text
フロントエンドからAPIを呼ぶ
        ↓
APIがgetDb()を実行
        ↓
Neon PostgreSQLへ接続
        ↓
ユーザー情報・記録・会話を保存または取得
```

Neon対応のDrizzle機能とテーブル定義を読み込みます。

```ts
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
```

- `drizzle-orm/neon-http`：サーバーレス環境からNeon PostgreSQLへHTTP接続する
- `schema`：`db/schema.ts`で定義するすべてのテーブルをまとめて読み込む

ほかのバックエンド処理から使えるDB接続関数を定義します。

```ts
export function getDb() {
```

`.env.local`に保存した接続文字列を取得します。

```ts
const databaseUrl = process.env.DATABASE_URL;
```

接続文字列がない場合は、原因が分かるエラーを出して処理を止めます。

```ts
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URLが設定されていません。",
  );
}
```

接続文字列とテーブル定義を使い、DB操作用オブジェクトを返します。

```ts
return drizzle(databaseUrl, { schema });
```

各APIへ接続コードを繰り返し書かず、`getDb()`を呼ぶだけで同じ設定を利用するためのファイルです。

| 単語 | 意味 |
| --- | --- |
| PostgreSQL | 複数ユーザーのデータ保存や検索に使うリレーショナルデータベース |
| Neon | サーバーレス環境から利用できるPostgreSQLサービス |
| Drizzle ORM | TypeScriptからテーブル定義やSQL操作を扱う仕組み |
| `DATABASE_URL` | DBの場所・ユーザー名・パスワードなどを含む秘密の接続文字列 |
| `getDb()` | 共通設定でDB接続を取得する関数 |

## 12-6. ユーザー情報を保存するテーブル

担当ファイルは`db/schema.ts`です。

このファイルは、PostgreSQLへ保存するデータの名前・種類・必須条件・初期値を定義する場所です。

```text
認証済みユーザーの情報
        ↓
usersテーブルからemailを検索
        ↓
初回設定の進み具合を確認
        ↓
初回セットアップまたはホームへ進む
```

PostgreSQLのテーブルを作るために必要な機能を読み込みます。

```ts
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
```

- `boolean`：`true`または`false`を保存する
- `pgTable`：PostgreSQLのテーブルを定義する
- `text`：文字列を保存する
- `timestamp`：日付と時刻を保存する
- `uuid`：重複しにくいIDを保存する

`users`というテーブルを定義し、ほかのバックエンドファイルから利用できるようにします。

```ts
export const users = pgTable("users", {
```

`users`はTypeScript内で使う名前で、`"users"`はPostgreSQL内のテーブル名です。

ユーザーを重複なく識別するIDを定義します。

```ts
id: uuid("id").defaultRandom().primaryKey(),
```

- `uuid("id")`：`id`というUUID形式の列を作る
- `.defaultRandom()`：新規登録時にUUIDを自動生成する
- `.primaryKey()`：この値を各ユーザーの中心となる識別子にする

ログイン中のユーザーとDB内のデータを結び付ける情報を定義します。

```ts
email: text("email").notNull().unique(),
displayName: text("display_name"),
```

- `.notNull()`：値が空になることを禁止する
- `.unique()`：同じメールアドレスの重複登録を禁止する
- `displayName`には`.notNull()`がないため、表示名がなくても登録できる

初回セットアップがすべて完了したか保存します。

```ts
onboardingCompleted: boolean("onboarding_completed")
  .notNull()
  .default(false),
```

新規ユーザーは初期値が`false`になり、起動時に初回セットアップへ進みます。

現在選択している理想体型を保存します。

```ts
goalBodyType: text("goal_body_type"),
```

細マッチョ・逆三角形・フィジーク・バルクアップなどの文字列が入る予定です。

身体情報の入力が完了したか保存します。

```ts
profileCompleted: boolean("profile_completed")
  .notNull()
  .default(false),
```

初回の身体分析が完了したか保存します。

```ts
initialAnalysisCompleted: boolean(
  "initial_analysis_completed",
)
  .notNull()
  .default(false),
```

作成日時と最終更新日時を保存します。

```ts
createdAt: timestamp("created_at", {
  withTimezone: true,
})
  .notNull()
  .defaultNow(),
```

`withTimezone: true`はタイムゾーンを扱える日時にし、`.defaultNow()`は登録時の現在日時を自動保存します。

```ts
updatedAt: timestamp("updated_at", {
  withTimezone: true,
})
  .notNull()
  .defaultNow(),
```

`updatedAt`は最後にユーザー情報を変更した日時を保存する列です。今後の更新APIで、データ変更時に新しい日時を設定します。

### `users`テーブルの項目一覧

| TypeScriptの名前 | PostgreSQLの列名 | 保存する内容 |
| --- | --- | --- |
| `id` | `id` | ユーザー固有のUUID |
| `email` | `email` | 認証に使うメールアドレス |
| `displayName` | `display_name` | 画面に表示する名前 |
| `onboardingCompleted` | `onboarding_completed` | 初回セットアップ全体の完了状態 |
| `goalBodyType` | `goal_body_type` | 現在選択中の理想体型 |
| `profileCompleted` | `profile_completed` | 身体情報入力の完了状態 |
| `initialAnalysisCompleted` | `initial_analysis_completed` | 初回身体分析の完了状態 |
| `createdAt` | `created_at` | ユーザー作成日時 |
| `updatedAt` | `updated_at` | ユーザー情報の最終更新日時 |

### 今回追加された単語

| 単語 | 意味 |
| --- | --- |
| `pgTable()` | PostgreSQLのテーブルを定義する関数 |
| `uuid()` | UUID形式の列を作る関数 |
| `.primaryKey()` | テーブル内のデータを識別する中心の列にする |
| `.notNull()` | 空の値を禁止する |
| `.unique()` | 同じ値の重複を禁止する |
| `.default()` | 新しいデータへ最初から入れる値を指定する |
| `.defaultNow()` | 新しいデータへ現在日時を自動で入れる |
| `withTimezone` | 日時とタイムゾーンを一緒に扱えるようにする設定 |

## 12-7. usersテーブルのマイグレーション

担当ファイルは`drizzle-postgres/0000_create_users.sql`です。

マイグレーションは、`db/schema.ts`の設計を実際のPostgreSQLへ反映するためのSQLとして記録した変更履歴です。

```text
db/schema.ts
    ↓ Drizzle Kitで変換
drizzle-postgres/0000_create_users.sql
    ↓ 次の作業でNeonへ適用
Neon PostgreSQLのusersテーブル
```

次のコマンドで生成しました。

```bash
npm run db:generate -- --name=create_users
```

- `npm run db:generate`：`package.json`に登録したDrizzle Kitの生成処理を実行する
- `--name=create_users`：変更履歴へ`create_users`という目的が分かる名前を付ける
- このコマンドはSQLをローカルへ生成するだけで、Neonのデータベースは変更しない

生成されたファイルは次の3種類です。

| ファイル | 目的 |
| --- | --- |
| `drizzle-postgres/0000_create_users.sql` | PostgreSQLが実行するテーブル作成命令 |
| `drizzle-postgres/meta/0000_snapshot.json` | 生成時点のテーブル設計をDrizzleが比較に使う記録 |
| `drizzle-postgres/meta/_journal.json` | マイグレーションの順番と名前をDrizzleが管理する記録 |

`users`というテーブルを作り始めます。

```sql
CREATE TABLE "users" (
```

ユーザー固有のUUIDを主キーとして自動生成します。

```sql
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
```

必須のメールアドレスを文字列で保存します。

```sql
"email" text NOT NULL,
```

表示名は未設定を許可する文字列として保存します。

```sql
"display_name" text,
```

初回セットアップの完了状態を、初期値`false`で保存します。

```sql
"onboarding_completed" boolean DEFAULT false NOT NULL,
```

現在選んでいる理想体型を文字列で保存します。

```sql
"goal_body_type" text,
```

身体情報入力と初回分析の完了状態を、初期値`false`で保存します。

```sql
"profile_completed" boolean DEFAULT false NOT NULL,
"initial_analysis_completed" boolean DEFAULT false NOT NULL,
```

作成日時と更新日時には、登録時の現在日時を自動保存します。

```sql
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
```

同じメールアドレスのユーザーを重複登録できないようにします。

```sql
CONSTRAINT "users_email_unique" UNIQUE("email")
```

テーブル定義を閉じます。

```sql
);
```

生成されたSQLと`meta`ファイルはDrizzleが管理する変更履歴なので、通常は手作業で変更しません。設計を変更するときは`db/schema.ts`を直して、新しいマイグレーションを生成します。

### Neonへマイグレーションを適用する

次のコマンドで、まだ適用されていないマイグレーションをNeonへ反映しました。

```bash
npx drizzle-kit migrate --config drizzle.config.ts
```

- `npx`：プロジェクトへインストールされているコマンドを実行する
- `drizzle-kit migrate`：未適用のマイグレーションをDBへ順番に適用する
- `--config drizzle.config.ts`：使用するDrizzle設定ファイルを指定する

Drizzleは適用済みのマイグレーションをNeon内の履歴テーブルへ記録します。そのため、同じコマンドをもう一度実行しても、適用済みの`0000_create_users.sql`を重複実行しません。

適用後にNeonを読み取り専用で確認し、`users`テーブルと次の9項目が作成済みであることを確認しました。

```text
id
email
display_name
onboarding_completed
goal_body_type
profile_completed
initial_analysis_completed
created_at
updated_at
```

### 今回追加されたSQL単語

| 単語 | 意味 |
| --- | --- |
| `CREATE TABLE` | 新しいテーブルを作成する |
| `PRIMARY KEY` | 各データを識別する中心の列にする |
| `DEFAULT` | 値が指定されなかった場合の初期値を決める |
| `NOT NULL` | 空の値を禁止する |
| `CONSTRAINT` | データを保存するときの制約に名前を付ける |
| `UNIQUE` | 同じ値の重複を禁止する |
| `gen_random_uuid()` | 重複しにくいUUIDを自動生成する |
| `now()` | 現在の日付と時刻を取得する |

## 12-8. ユーザー初期化API

担当ファイルは`app/api/users/bootstrap/route.ts`です。

このAPIは、ログイン中の利用者をNeon PostgreSQLの`users`テーブルへ登録または取得し、初回設定の状態を返す場所です。

`bootstrap`は、アプリを使い始めるために必要なデータを準備するという意味です。

```text
アプリから初期化APIを呼ぶ
        ↓
ログイン中のメールアドレスを取得
        ↓
usersテーブルを検索
        ↓
未登録なら新規作成
登録済みなら現在の情報を取得
        ↓
初回設定の状態をJSONで返す
```

メールアドレスが一致するユーザーを検索する機能を読み込みます。

```ts
import { eq } from "drizzle-orm";
```

`eq`はequalの略で、2つの値が等しいという検索条件を作ります。

今後、次のような意味の検索で使用します。

```text
users.email = ログイン中のメールアドレス
```

現在ログインしているユーザー情報を取得する機能を読み込みます。

```ts
import { getChatGPTUser } from "@/app/chatgpt-auth";
```

この処理は、ブラウザから送られたメールアドレスを信用せず、サーバー側へ渡された認証情報を読み取ります。

Neon PostgreSQLへの共通接続関数を読み込みます。

```ts
import { getDb } from "@/db";
```

各APIへ接続文字列やDrizzle設定を繰り返し書かず、`getDb()`を呼び出して同じ接続設定を利用します。

`users`テーブルの設計を読み込みます。

```ts
import { users } from "@/db/schema";
```

この`users`を使い、どのテーブルのどの項目を検索・登録するか指定します。

### `@/`の意味

`@/`はプロジェクトの一番上を表す省略記号です。

```text
@/db
↓
プロジェクト直下のdbフォルダ
```

`../../../db`のように現在位置から何階層戻るか数えなくても、同じ場所を分かりやすく指定できます。

### POST通信とログイン確認

このURLへPOST通信が来たときに実行する関数を定義します。

```ts
export async function POST() {
```

- `export`：Next.jsがAPIとして利用できるように関数を公開する
- `async`：完了まで時間がかかる処理で`await`を使えるようにする
- `function POST()`：POST通信を受け取る関数を定義する

ログイン中のユーザー情報を取得します。

```ts
const authenticatedUser = await getChatGPTUser();
```

- `const authenticatedUser`：取得結果を後から変更しない変数へ保存する
- `await`：認証情報の取得が終わるまで、次の行へ進まず待つ
- `getChatGPTUser()`：サーバーへ渡された認証済みユーザー情報を読み取る

認証情報を取得できなかった場合だけ、中の処理を実行します。

```ts
if (!authenticatedUser) {
```

`!authenticatedUser`は、値が`null`など「ユーザー情報なし」の状態か確認する条件です。

認証されていないことをJSONで返し、API処理を終了します。

```ts
return Response.json(
  { error: "ログインが必要です。" },
  { status: 401 },
);
```

- `return`：結果を返して、これより下の処理へ進まないようにする
- `Response.json()`：JavaScriptの値をJSON形式のHTTPレスポンスへ変換する
- `{ error: "ログインが必要です。" }`：フロントエンドへ返すエラー内容
- `{ status: 401 }`：未認証を表すHTTPステータスを設定する

現在できている処理の流れです。

```text
POST通信を受信
        ↓
ログイン情報を取得
        ↓
情報なし → 401とエラーJSONを返して終了
情報あり → 次に追加するDB検索へ進む
```

### メールアドレスで登録済みユーザーを検索する

Neon PostgreSQLを操作するための共通接続を取得します。

```ts
const db = getDb();
```

`getDb()`が返したDB操作用オブジェクトを、後から変更しない`db`という変数へ保存します。

検索結果が返るまで待ち、結果の配列を`existingUsers`へ保存します。

```ts
const existingUsers = await db
```

DrizzleのDB検索は複数件を返せるため、1件だけの場合でも結果は配列になります。

DBからデータを取得する検索を開始します。

```ts
.select()
```

検索する対象を`users`テーブルへ指定します。

```ts
.from(users)
```

ログイン中のメールアドレスと同じユーザーだけに絞ります。

```ts
.where(eq(users.email, authenticatedUser.email))
```

- `users.email`：DBに保存されているメールアドレスの列
- `authenticatedUser.email`：現在ログインしているユーザーのメールアドレス
- `eq(左, 右)`：左と右が等しいデータだけを検索する条件
- `.where(...)`：指定した条件に合うデータへ絞る

取得するデータを最大1件に制限します。

```ts
.limit(1);
```

メールアドレスには重複禁止の`.unique()`を設定していますが、必要な1件だけ取得する意思をコード上でも明確にしています。

検索結果の先頭を取り出し、存在しない場合は`null`へ統一します。

```ts
const existingUser = existingUsers[0] ?? null;
```

- `existingUsers`：DB検索で返された配列
- `[0]`：配列の先頭にある1件目を取り出す
- データがない場合の`existingUsers[0]`は`undefined`になる
- `?? null`：左側が`null`または`undefined`のときだけ、代わりに`null`を使う
- `existingUser`：登録済みならユーザー情報、未登録なら`null`が入る

`??`は`0`・空文字・`false`を有効な値として残し、`null`と`undefined`だけを右側の値へ置き換えます。

現在できている処理の流れです。

```text
認証済みユーザー
        ↓
getDb()でNeonへ接続
        ↓
users.emailと認証メールを比較
        ↓
一致あり → existingUserにユーザー情報
一致なし → existingUserにnull
```

### 登録済みユーザーの情報を返す

`existingUser`にユーザー情報がある場合だけ、中の処理を実行します。

```ts
if (existingUser) {
```

登録済みなら`existingUser`はオブジェクトなので中へ進み、未登録なら`null`なので中へ進みません。

登録済みユーザーの情報をJSON形式で返します。

```ts
return Response.json({
```

`return`が実行されるとAPI処理はここで終了するため、その下に追加する新規登録処理へ進みません。

DBから取得したユーザー情報を`user`という名前で返します。

```ts
user: existingUser,
```

フロントエンドは、返されたJSONの`user`からID・理想体型・初回設定の状態などを読み取れます。

登録済みユーザーであることを返します。

```ts
isNewUser: false,
```

`isNewUser`は「新しく作成したユーザーか」を表し、今回は登録済みなので`false`です。

登録済みの場合に返るJSONは、次の形です。

```json
{
  "user": {
    "id": "ユーザーID",
    "email": "メールアドレス",
    "displayName": null,
    "onboardingCompleted": false,
    "goalBodyType": null,
    "profileCompleted": false,
    "initialAnalysisCompleted": false,
    "createdAt": "作成日時",
    "updatedAt": "更新日時"
  },
  "isNewUser": false
}
```

このJSONを受け取ったフロントエンドは、`onboardingCompleted`を使って初回セットアップとホームのどちらへ進むか判断できます。

```text
existingUserあり
        ↓
userにDBのユーザー情報を入れる
        ↓
isNewUser: falseを付ける
        ↓
JSONを返してAPI終了
```

### 未登録ユーザーをNeonへ新規登録する

ユーザーが見つからなかった場合は、認証情報を`users`テーブルへ保存します。

```ts
const createdUsers = await db
```

新規登録が完了するまで`await`で待ち、PostgreSQLから返された結果を`createdUsers`へ保存します。

データを追加する対象を`users`テーブルへ指定します。

```ts
.insert(users)
```

`.insert()`は、指定したテーブルへ新しい1行を追加する処理を始めます。

新しいユーザーへ保存する値を指定します。

```ts
.values({
  email: authenticatedUser.email,
  displayName: authenticatedUser.displayName,
})
```

- `.values({...})`：新しい行の各項目へ保存する値を指定する
- `email`：ログイン中のユーザーのメールアドレスを保存する
- `displayName`：ログイン中のユーザーの表示名を保存する

コードで指定していない項目には、`db/schema.ts`で決めた初期値が使われます。

```text
id                       → UUIDを自動生成
onboardingCompleted      → false
goalBodyType             → null
profileCompleted         → false
initialAnalysisCompleted → false
createdAt                → 現在日時
updatedAt                → 現在日時
```

新しく登録されたデータをPostgreSQLから返してもらいます。

```ts
.returning();
```

`.returning()`があるため、登録直後にもう一度検索しなくても、作成されたIDや初期値を取得できます。

配列で返された登録結果から、新規ユーザーを取り出します。

```ts
const createdUser = createdUsers[0];
```

今回はユーザーを1件だけ登録するため、`[0]`で先頭の1件を取り出します。

新規ユーザー情報をJSON形式で返します。

```ts
return Response.json(
  {
    user: createdUser,
    isNewUser: true,
  },
  { status: 201 },
);
```

- `user: createdUser`：新しく登録されたユーザー情報を返す
- `isNewUser: true`：今回新しく登録されたことを返す
- `status: 201`：新しいデータの作成に成功したことをHTTPで表す

ユーザー初期化API全体の流れです。

```text
POST通信
    ↓
認証情報なし → HTTP 401
    ↓ 認証情報あり
メールアドレスでusersを検索
    ↓
登録済み → user + isNewUser: false
    ↓ 未登録
usersへ新規登録
    ↓
user + isNewUser: true + HTTP 201
```

### API全体のエラーを処理する

認証・DB検索・新規登録を、エラーを捕まえられる範囲で囲みます。

```ts
try {
```

`try`の中は通常どおり上から処理され、途中でエラーが発生すると残りを中止して`catch`へ移動します。

発生したエラー情報を受け取ります。

```ts
} catch (error) {
```

- `catch`：`try`内でエラーが発生した場合だけ実行する
- `error`：実際に発生したエラー情報を受け取る変数

開発者が原因を確認できるように、詳しい情報をサーバーログへ残します。

```ts
console.error(
  "ユーザー初期化に失敗しました。",
  error,
);
```

`console.error()`は、どの処理で失敗したかという説明と、実際のエラー内容を開発者向けに記録します。

フロントエンドへは安全な共通メッセージを返します。

```ts
return Response.json(
  {
    error:
      "ユーザー情報の初期化に失敗しました。",
  },
  { status: 500 },
);
```

- 詳しいDBエラーは接続先や内部構造を含む可能性があるため、ブラウザへそのまま返さない
- `error`には利用者が理解できる共通メッセージだけを入れる
- HTTP 500はサーバー内部の処理に失敗したことを表す

エラー処理を含めた流れです。

```text
try内の処理に成功
        ↓
通常のJSONを返す

try内でエラー発生
        ↓
残りの処理を中止
        ↓
catchで詳しい原因をサーバーへ記録
        ↓
安全なエラーJSONとHTTP 500を返す
```

### ユーザー初期化APIの接続テスト

ローカル開発サーバーから、テスト専用の認証情報を使ってAPIを実際に呼びました。

1回目はNeonにユーザーが存在しないため、新規登録されました。

```text
HTTP 201 Created
isNewUser: true
onboardingCompleted: false
goalBodyType: null
```

同じ認証情報で2回目を呼ぶと、同じユーザーIDのデータが取得されました。

```text
HTTP 200 OK
isNewUser: false
```

新しい行は追加されず、メールアドレス検索によって登録済みユーザーを再利用できたことを表します。

認証情報を付けずに呼ぶと、DB操作を行わず未認証エラーが返りました。

```text
HTTP 401 Unauthorized
error: ログインが必要です。
```

テストによって、次の3点を確認できました。

```text
未認証を拒否できる
新規ユーザーをNeonへ登録できる
登録済みユーザーを重複登録せず取得できる
```

Neonには接続確認用として`bootstrap-test-20260808@example.invalid`という実在しないテストユーザーが1件保存されています。

### 今回追加された単語

| 単語 | 意味 |
| --- | --- |
| `bootstrap` | アプリを開始するために必要な状態を準備する処理 |
| `eq` | 2つの値が等しいというDB検索条件を作る関数 |
| `@/` | プロジェクトの一番上からファイル位置を指定する省略記号 |
| サーバー側認証 | ブラウザの入力ではなく、サーバーが確認した利用者情報を使うこと |
| `async` | 関数内で完了を待つ`await`を使えるようにする |
| `await` | 非同期処理が完了するまで次へ進まず待つ |
| `Response.json()` | JSON形式のHTTPレスポンスを作る |
| HTTP 401 | ログイン情報を確認できないことを表す番号 |
| `.select()` | DBからデータを取得する検索を始める |
| `.from()` | 検索対象のテーブルを指定する |
| `.where()` | 条件に合うデータだけへ絞る |
| `.limit()` | 取得する最大件数を指定する |
| `[0]` | 配列の先頭にある1件目を取り出す |
| `??` | 左側が`null`または`undefined`のときだけ右側を使う |
| `isNewUser` | 今回新しく登録されたユーザーかを表す値 |
| `.insert()` | 指定したDBテーブルへ新しいデータを追加する |
| `.values()` | 新しく保存する各項目の値を指定する |
| `.returning()` | 追加・更新されたデータをPostgreSQLから受け取る |
| HTTP 201 | 新しいデータの作成に成功したことを表す番号 |
| `try` | エラーを捕まえたい処理の範囲を作る |
| `catch` | `try`内でエラーが発生した場合の処理を書く |
| `console.error()` | 開発者向けにエラー情報を記録する |
| HTTP 500 | サーバー内部で処理に失敗したことを表す番号 |

## 12-9. 理想体型保存API

担当ファイルは`app/api/users/goal/route.ts`です。

このAPIは、初回セットアップやマイページで選んだ理想体型を、ログイン中のユーザー本人の`goalBodyType`へ保存する場所です。

```text
画面で理想体型を選ぶ
        ↓
自分が書くfetch()でPATCH通信
        ↓
理想体型保存API
        ↓
認証・入力値を確認
        ↓
NeonのgoalBodyTypeを更新
```

メールアドレスが一致するユーザーだけを更新する比較機能を読み込みます。

```ts
import { eq } from "drizzle-orm";
```

現在ログインしているユーザー情報を取得する機能を読み込みます。

```ts
import { getChatGPTUser } from "@/app/chatgpt-auth";
```

Neon PostgreSQLへの共通接続関数を読み込みます。

```ts
import { getDb } from "@/db";
```

更新対象となる`users`テーブルの設計を読み込みます。

```ts
import { users } from "@/db/schema";
```

ユーザー初期化APIと同じ部品を使いますが、今回は検索だけでなく`goalBodyType`の更新に利用します。

### 保存を許可する理想体型

DBへ保存してよい理想体型を配列へまとめます。

```ts
const allowedGoalBodyTypes = [
  "細マッチョ",
  "逆三角形",
  "フィジーク",
  "バルクアップ",
];
```

フロントエンドから受け取った値がこの配列に含まれているか確認し、想定外の文字列が`goalBodyType`へ保存されることを防ぎます。

```text
細マッチョ → 配列に含まれる → 保存できる
逆三角形   → 配列に含まれる → 保存できる
その他     → 配列にない     → HTTP 400
```

### このファイルで使っている言語

`route.ts`の`.ts`はTypeScriptファイルを表します。

```text
直接書いている言語：TypeScript
DB操作に使うもの：Drizzle ORM
受信・返信の形式：JSON
保存先：Neon PostgreSQL
```

`request: Request`の`: Request`は、`request`へ入る値の型を指定するTypeScriptの書き方です。

### PATCH関数と認証確認

PATCH通信とその通信内容を受け取ります。

```ts
export async function PATCH(request: Request) {
```

- `PATCH`：すでに存在するユーザー情報の一部を変更する通信方法
- `request`：フロントエンドから送られた通信内容を受け取る変数
- `: Request`：`request`がWeb通信の情報を持つ型だとTypeScriptへ伝える

ログイン中のユーザー情報を取得し、認証情報がなければHTTP 401を返します。

```ts
const authenticatedUser = await getChatGPTUser();

if (!authenticatedUser) {
  return Response.json(
    { error: "ログインが必要です。" },
    { status: 401 },
  );
}
```

### フロントエンドからJSONを受け取る

通信内容をJSONからJavaScriptの値へ変換します。

```ts
const body = await request
  .json()
  .catch(() => null);
```

- `request.json()`：通信で送られたJSONを読み取る
- `.catch(() => null)`：JSONが壊れていた場合はエラーで停止せず`null`を使う
- `body`：変換後の受信データを保存する変数

受信データから理想体型を取り出します。

```ts
const goalBodyType = body?.goalBodyType;
```

`?.`は`body`が`null`または`undefined`ならエラーを起こさず、結果を`undefined`にします。

### 理想体型の入力値を確認する

文字列でない場合、または許可一覧にない場合はHTTP 400を返します。

```ts
if (
  typeof goalBodyType !== "string" ||
  !allowedGoalBodyTypes.includes(goalBodyType)
) {
```

- `typeof goalBodyType !== "string"`：値が文字列でないことを確認する
- `||`：左か右のどちらかが当てはまれば不正とする
- `.includes(goalBodyType)`：配列の中に受信した体型があるか確認する
- `!`：判定結果を反対にし、配列に含まれない場合を表す

不正な場合は安全なエラーを返します。

```ts
return Response.json(
  {
    error:
      "正しい理想体型を選択してください。",
  },
  { status: 400 },
);
```

HTTP 400は、サーバーではなく送られた入力内容に問題があることを表します。

### Neonの理想体型を更新する

`users`テーブルの既存データを更新します。

```ts
const updatedUsers = await db
  .update(users)
```

- `.update(users)`：`users`テーブルの更新処理を始める
- `updatedUsers`：更新後にPostgreSQLから返された結果の配列

変更する項目を指定します。

```ts
.set({
  goalBodyType,
  updatedAt: new Date(),
})
```

- `goalBodyType,`：`goalBodyType: goalBodyType`を省略した書き方
- `new Date()`：現在の日付と時刻を作る
- `updatedAt`：最後にユーザー情報を変更した日時を更新する

ログイン中のメールアドレスと一致するユーザーだけに絞ります。

```ts
.where(
  eq(
    users.email,
    authenticatedUser.email,
  ),
)
```

`.where()`がないと全ユーザーの理想体型を変更してしまうため、本人のメールアドレスを条件にしています。

更新後のデータをPostgreSQLから受け取ります。

```ts
.returning();
```

### 更新結果を確認して返す

更新結果の先頭を取り出し、存在しなければ`null`にします。

```ts
const updatedUser = updatedUsers[0] ?? null;
```

更新対象が見つからなければHTTP 404を返します。

```ts
if (!updatedUser) {
  return Response.json(
    { error: "ユーザーが見つかりません。" },
    { status: 404 },
  );
}
```

更新に成功した場合は、更新後のユーザー情報をJSONで返します。

```ts
return Response.json({
  user: updatedUser,
});
```

### 予想外のエラーを処理する

認証・JSON読取・DB更新の途中で予想外のエラーが起きた場合は`catch`へ進みます。

```ts
} catch (error) {
```

詳しい原因はサーバーログへ残し、利用者へは安全な共通メッセージとHTTP 500を返します。

```ts
console.error(
  "理想体型の保存に失敗しました。",
  error,
);
```

```ts
return Response.json(
  { error: "理想体型の保存に失敗しました。" },
  { status: 500 },
);
```

### 理想体型保存APIの全体像

```text
PATCH通信を受け取る
        ↓
認証なし → HTTP 401
        ↓
JSONを読み取る
        ↓
不正な体型 → HTTP 400
        ↓
本人のgoalBodyTypeを更新
        ↓
ユーザーなし → HTTP 404
        ↓
更新後のuserをJSONで返す
        ↓
予想外の失敗 → HTTP 500
```

### 理想体型保存APIの接続テスト

既存のテストユーザーを使い、ローカル画面と同じ3000番の開発サーバーからAPIを呼びました。

許可された「細マッチョ」を送ると、Neonの`goalBodyType`と`updatedAt`が更新されました。

```text
HTTP 200 OK
goalBodyType: 細マッチョ
```

許可一覧にない体型を送ると、DB更新前に入力エラーが返りました。

```text
HTTP 400 Bad Request
error: 正しい理想体型を選択してください。
```

認証情報を付けずに送ると、DB更新前に未認証エラーが返りました。

```text
HTTP 401 Unauthorized
error: ログインが必要です。
```

このテストによって、本人の理想体型を保存でき、不正入力と未認証の操作を拒否できることを確認しました。

### 今回追加された単語

| 単語 | 意味 |
| --- | --- |
| TypeScript | JavaScriptへ型の仕組みを追加したプログラミング言語 |
| `PATCH` | 既存データの一部を変更するHTTP通信方法 |
| `request: Request` | 通信内容を受け取る変数と、そのTypeScriptの型指定 |
| `request.json()` | 受信したJSONをJavaScriptの値へ変換する |
| `.catch()` | 直前の非同期処理が失敗した場合の処理を書く |
| `?.` | 左側が`null`などでもエラーを起こさず安全に値を読む |
| `typeof` | 値が文字列など、どの種類かを確認する |
| `||` | 複数条件のどれか1つが当てはまることを表す |
| `.includes()` | 配列に指定した値が含まれるか確認する |
| `.update()` | DBの既存データを更新する |
| `.set()` | DBで変更する項目と値を指定する |
| `new Date()` | 現在の日付と時刻を持つ値を作る |
| HTTP 400 | 送られた入力内容が不正であることを表す番号 |
| HTTP 404 | 対象データが見つからないことを表す番号 |

## 12-10. 身体プロフィールテーブル

担当ファイルは`db/schema.ts`です。

このテーブルは、身長・体重・体脂肪率・週のトレーニング回数などをユーザーごとに保存する場所です。

このファイルへ直接書いている言語はTypeScriptで、Drizzle ORMの機能を使ってPostgreSQLのテーブルを定義します。

```text
TypeScript
    ↓ Drizzle ORMのテーブル定義
PostgreSQLのuser_profilesテーブル
    ↓
Neonへ身体情報を保存
```

週の回数や可能時間など、整数用の列を作る機能を読み込みます。

```ts
integer,
```

`integer`は小数部分を持たない整数をPostgreSQLへ保存します。

身長・体重・体脂肪率など、小数を含められる列を作る機能を読み込みます。

```ts
real,
```

`real`は`172.5`や`65.8`のような小数を含む数値をPostgreSQLへ保存します。

| 型 | 保存する予定の値 |
| --- | --- |
| `integer` | 週の回数、1回に使える分数 |
| `real` | 身長、体重、体脂肪率 |

### user_profilesテーブルの土台

TypeScript内で`userProfiles`という名前を使い、PostgreSQLには`user_profiles`という名前でテーブルを作ります。

```ts
export const userProfiles = pgTable(
  "user_profiles",
  {
```

- `export`：ほかのAPIからテーブル定義を読み込めるようにする
- `userProfiles`：TypeScriptのコード内で使う名前
- `"user_profiles"`：PostgreSQL内で使うテーブル名

プロフィール自体を識別するIDを作ります。

```ts
id: uuid("id")
  .defaultRandom()
  .primaryKey(),
```

新しいプロフィールを作成するとUUIDが自動生成され、そのプロフィールを識別する主キーになります。

プロフィールを`users`テーブルのユーザーと結び付けます。

```ts
userId: uuid("user_id")
  .notNull()
  .unique()
  .references(() => users.id, {
    onDelete: "cascade",
  }),
```

- `userId`：TypeScript内で使う項目名
- `"user_id"`：PostgreSQL内で使う列名
- `.notNull()`：どのユーザーのプロフィールかを必須にする
- `.unique()`：同じユーザーIDのプロフィールを重複作成できないようにする
- `.references(() => users.id)`：`users`テーブルに存在するIDだけを保存できるようにする
- `onDelete: "cascade"`：ユーザーを削除した場合、そのユーザーのプロフィールも削除する

このような別テーブル同士のつながりをリレーションと呼び、参照先を保証する`user_id`を外部キーと呼びます。

```text
users.id
   ↓ 外部キー
user_profiles.user_id

1人のusersデータ
   ↓ .unique()
1件のuser_profilesデータ
```

### 身長・体重・体脂肪率

身長をセンチメートル単位で保存します。

```ts
heightCm: real("height_cm")
  .notNull(),
```

`heightCm`には`172.5`のような小数を保存し、`.notNull()`によって未入力を禁止します。

体重をキログラム単位で保存します。

```ts
weightKg: real("weight_kg")
  .notNull(),
```

`weightKg`には`65.8`のような小数を保存し、`.notNull()`によって未入力を禁止します。

体脂肪率をパーセント単位で保存します。

```ts
bodyFatPercentage: real(
  "body_fat_percentage",
),
```

`bodyFatPercentage`には`15.5`のような小数を保存できます。

身長と体重は`.notNull()`を付けた必須入力で、体脂肪率だけが任意入力です。

```text
身長・体重：入力必須
体脂肪率：入力なしならnull
```

今後作るAPIでは、未入力をエラーにせず、値が送られた項目だけ数値の範囲を確認します。

### 週の回数と可能時間

1週間にトレーニングできる日数を整数で保存します。

```ts
weeklyTrainingDays: integer(
  "weekly_training_days",
),
```

例えば週3回なら`3`を保存します。

1回のトレーニングに使える時間を分単位の整数で保存します。

```ts
availableMinutes: integer(
  "available_minutes",
),
```

例えば1回60分なら`60`を保存します。

どちらにも`.notNull()`を付けていないため任意入力で、未入力時は`null`になります。

```text
weeklyTrainingDays未入力 → null
availableMinutes未入力   → null
```

### トレーニング場所と苦手部位

自宅・ジム・両方など、普段トレーニングする場所を任意入力で保存します。

```ts
trainingLocation: text(
  "training_location",
),
```

APIでは`home`・`gym`・`both`など、保存を許可する値を後から確認します。

苦手部位を複数選べる文字列の配列として保存します。

```ts
weakBodyParts: text(
  "weak_body_parts",
).array(),
```

`.array()`を付けることで、次のように複数の部位を1項目へ保存できます。

```json
["胸", "背中", "脚"]
```

どちらも`.notNull()`がないため任意入力で、未入力時は`null`になります。

### プロフィールの作成日時と更新日時

身体プロフィールを最初に作成した日時を保存します。

```ts
createdAt: timestamp("created_at", {
  withTimezone: true,
})
  .notNull()
  .defaultNow(),
```

身体プロフィールを最後に変更した日時を保存します。

```ts
updatedAt: timestamp("updated_at", {
  withTimezone: true,
})
  .notNull()
  .defaultNow(),
```

この2項目は利用者が入力する項目ではなく、システムが自動的に保存します。

- `timestamp`：日付と時刻を保存する型
- `withTimezone: true`：タイムゾーンを扱える日時にする
- `.notNull()`：システムが必ず日時を保存するため空を禁止する
- `.defaultNow()`：プロフィール作成時の現在日時を自動で入れる

`updatedAt`は、今後作るプロフィール保存APIで情報を変更するたびに`new Date()`へ更新します。

### user_profilesの項目一覧

| TypeScriptの名前 | PostgreSQLの列名 | 入力 | 保存する内容 |
| --- | --- | --- | --- |
| `id` | `id` | 自動 | プロフィール固有のUUID |
| `userId` | `user_id` | 自動 | usersテーブルと結び付くID |
| `heightCm` | `height_cm` | 必須 | 身長（cm） |
| `weightKg` | `weight_kg` | 必須 | 体重（kg） |
| `bodyFatPercentage` | `body_fat_percentage` | 任意 | 体脂肪率（%） |
| `weeklyTrainingDays` | `weekly_training_days` | 任意 | 週のトレーニング日数 |
| `availableMinutes` | `available_minutes` | 任意 | 1回のトレーニングに使える時間（20〜180分） |
| `trainingLocation` | `training_location` | 任意 | 自宅・ジム・両方 |
| `weakBodyParts` | `weak_body_parts` | 任意 | 苦手部位の配列 |
| `createdAt` | `created_at` | 自動 | プロフィール作成日時 |
| `updatedAt` | `updated_at` | 自動 | プロフィール最終更新日時 |

### 今回追加された単語

| 単語 | 意味 |
| --- | --- |
| リレーション | 複数のDBテーブル同士のつながり |
| 外部キー | 別テーブルに存在するデータを参照する列 |
| `.references()` | 参照するテーブルと列を指定する |
| `onDelete: "cascade"` | 親データを削除したとき関連データも削除する |
| 1対1 | 1人のユーザーに1件のプロフィールが対応する関係 |
| 任意入力 | 値がなくても保存でき、DBでは`null`になる項目 |
| `.array()` | PostgreSQLの1項目へ同じ種類の値を複数保存できる配列型にする |

## 12-11. user_profilesのマイグレーション

担当ファイルは`drizzle-postgres/0001_create_user_profiles.sql`です。

`db/schema.ts`へ書いたTypeScriptのテーブル定義を、Drizzle KitがPostgreSQL用のSQLへ変換したファイルです。

```text
db/schema.ts
TypeScript + Drizzle ORM
        ↓ Drizzle Kit
0001_create_user_profiles.sql
SQL
        ↓ 次の作業で適用
Neon PostgreSQL
```

次のコマンドで生成しました。

```bash
npm run db:generate -- --name=create_user_profiles
```

生成結果では、2テーブル・`user_profiles`の11項目・外部キー1件が認識されました。

PostgreSQLへ`user_profiles`テーブルを作るSQLです。

```sql
CREATE TABLE "user_profiles" (
```

プロフィールIDと、必須のユーザーIDを定義します。

```sql
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
```

利用者が任意入力する身体情報を定義します。

```sql
"height_cm" real,
"weight_kg" real,
"body_fat_percentage" real,
"weekly_training_days" integer,
"available_minutes" integer,
"training_location" text,
"weak_body_parts" text[],
```

これらには`NOT NULL`が付いていないため、未入力時は`null`を保存できます。

作成日時と更新日時を必須の自動入力として定義します。

```sql
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
```

1人のユーザーが複数プロフィールを持てないようにします。

```sql
CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
```

`user_profiles.user_id`と`users.id`を外部キーで結び付けます。

```sql
ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE cascade
ON UPDATE no action;
```

- `FOREIGN KEY`：別テーブルの列を参照する外部キーを作る
- `REFERENCES`：参照先を`users.id`へ指定する
- `ON DELETE cascade`：ユーザー削除時にプロフィールも削除する
- `ON UPDATE no action`：参照先IDの更新に合わせた自動処理は行わない

`0001`は2番目のマイグレーションであることを表し、最初の`0000_create_users.sql`の後に実行されます。

この生成ファイルの言語はSQLです。普段はSQLを直接編集せず、TypeScriptの`db/schema.ts`を変更して新しいSQLを生成します。

### Neonへの適用結果

次のコマンドで、`0001_create_user_profiles.sql`をNeon PostgreSQLへ適用しました。

```bash
npx drizzle-kit migrate --config drizzle.config.ts
```

適用後にNeonを読み取り専用で確認し、次の結果を確認しました。

```text
user_profilesテーブル：あり
列数：11
外部キー：あり
主キー：あり
user_idの重複禁止：あり
```

`0001_create_user_profiles.sql`を適用した時点では7項目が`null`を許可していますが、その後に身長と体重を必須へ変更しました。次のマイグレーションでNeonへ反映します。

```text
height_cm              → nullを許可
weight_kg              → nullを許可
body_fat_percentage    → nullを許可
weekly_training_days   → nullを許可
available_minutes      → nullを許可
training_location      → nullを許可
weak_body_parts        → nullを許可
```

システムが管理する`id`・`user_id`・`created_at`・`updated_at`は必須項目です。

## 12-12. 身体プロフィール保存・取得API

担当ファイルは`app/api/users/profile/route.ts`です。

このファイルへ書いている言語はTypeScriptです。ログイン中のユーザー本人の身体プロフィールをNeonへ保存・取得します。

```ts
import { eq } from "drizzle-orm";
```

`eq`は、認証メールやユーザーIDが一致するデータだけを検索・更新する条件に使います。

```ts
import { getChatGPTUser } from "@/app/chatgpt-auth";
```

サーバー側で確認されたログイン中のユーザー情報を取得します。

```ts
import { getDb } from "@/db";
```

Neon PostgreSQLを操作する共通接続を取得します。

```ts
import {
  userProfiles,
  users,
} from "@/db/schema";
```

- `users`：認証メールからアプリ内ユーザーを探す
- `userProfiles`：そのユーザーの身体情報を保存・取得する

### GET通信とログイン確認

身体プロフィールを取得するGET関数をTypeScriptで定義します。

```ts
export async function GET() {
```

サーバー側でログイン中のユーザー情報を取得します。

```ts
const authenticatedUser =
  await getChatGPTUser();
```

認証情報を取得できなければ、DBへ接続せずHTTP 401を返します。

```ts
if (!authenticatedUser) {
  return Response.json(
    { error: "ログインが必要です。" },
    { status: 401 },
  );
}
```

この時点では、認証済みの場合に次のDB検索へ進める状態までできています。

### 認証メールからユーザーIDを取得する

Neon PostgreSQLを操作するDB接続を取得します。

```ts
const db = getDb();
```

`const db`は取得した接続を後から変更しない変数へ保存するという意味です。

DB検索の完了を待ち、結果を`matchedUsers`へ保存します。

```ts
const matchedUsers = await db
```

`.select({`は取得する項目を指定し始めます。

```ts
.select({
```

`id: users.id`は`users`テーブルのIDだけを`id`という名前で取得します。

```ts
id: users.id,
```

`.from(users)`は検索対象を`users`テーブルに指定します。

```ts
.from(users)
```

`.where(`は検索条件を指定し始めます。

```ts
.where(
```

`eq(`は左側と右側が同じデータだけを対象にします。

```ts
eq(
```

`users.email`はDBに保存されているメールアドレス列です。

```ts
users.email,
```

`authenticatedUser.email`は現在ログインしているユーザーのメールアドレスです。

```ts
authenticatedUser.email,
```

`.limit(1)`は取得件数を最大1件に制限します。

```ts
.limit(1);
```

検索結果の先頭を取り出し、データがなければ`null`を使います。

```ts
const currentUser =
  matchedUsers[0] ?? null;
```

`matchedUsers[0]`は検索結果の配列から1件目を取り出します。

`?? null`は左側が`null`または`undefined`の場合だけ`null`を使います。

ユーザーが見つからなかった場合だけエラー処理へ入ります。

```ts
if (!currentUser) {
```

HTTP 404と安全なエラーJSONを返してGET処理を終了します。

```ts
return Response.json(
  { error: "ユーザーが見つかりません。" },
  { status: 404 },
);
```

現在の流れは、認証メールからプロフィール検索に必要な`users.id`を取得するところまでです。

### ユーザーIDから身体プロフィールを取得する

DB検索の完了を待ち、結果を`matchedProfiles`へ保存します。

```ts
const matchedProfiles = await db
```

`.select()`はテーブルからデータを取得する検索を始めます。

```ts
.select()
```

`.from(userProfiles)`は検索対象を`user_profiles`テーブルに指定します。

```ts
.from(userProfiles)
```

`.where(`は取得するプロフィールの条件を指定し始めます。

```ts
.where(
```

`eq(`はプロフィール側とログインユーザー側のIDが同じデータだけに絞ります。

```ts
eq(
```

`userProfiles.userId`はプロフィールに保存されているユーザーIDです。

```ts
userProfiles.userId,
```

`currentUser.id`は認証メールから取得したログイン中のユーザーIDです。

```ts
currentUser.id,
```

`.limit(1)`は取得するプロフィールを最大1件にします。

```ts
.limit(1);
```

検索結果の1件目を取り出し、プロフィールがなければ`null`にします。

```ts
const profile =
  matchedProfiles[0] ?? null;
```

プロフィールまたは`null`をJSON形式でフロントエンドへ返します。

```ts
return Response.json({
  profile,
});
```

`profile,`は`profile: profile`を省略したTypeScript・JavaScriptの書き方です。

プロフィール未作成は異常ではないため、HTTP 404ではなく`profile: null`を返します。

```json
{
  "profile": null
}
```

現在のGET処理は、ログイン中のユーザー本人のプロフィールを取得できるところまで完成しています。

### GET処理の予想外のエラーを捕まえる

`try {`は認証とDB検索で発生するエラーを捕まえる範囲を始めます。

```ts
try {
```

`} catch (error) {`は`try`内でエラーが発生した場合だけ実行します。

```ts
} catch (error) {
```

`console.error(`は詳しい原因を開発者向けのサーバーログへ記録します。

```ts
console.error(
```

`"身体プロフィールの取得に失敗しました。"`は、どの処理で失敗したかをログへ残します。

```ts
"身体プロフィールの取得に失敗しました。",
```

`error`は実際に発生したエラー情報をログへ残します。

```ts
error,
```

`Response.json()`はフロントエンドへ安全な共通エラーを返します。

```ts
return Response.json(
  {
    error:
      "身体プロフィールの取得に失敗しました。",
  },
  { status: 500 },
);
```

HTTP 500は認証不足や入力ミスではなく、サーバー内部の処理に失敗したことを表します。

### PATCH通信とログイン確認

`export async function PATCH(`は身体プロフィールを保存・更新する関数を公開します。

```ts
export async function PATCH(
```

`request: Request,`はフロントエンドから送られた通信内容をTypeScriptの`Request`型で受け取ります。

```ts
request: Request,
```

`const authenticatedUser =`は認証結果を保存する変数を定義します。

```ts
const authenticatedUser =
```

`await getChatGPTUser();`はログイン中のユーザー情報を取得できるまで待ちます。

```ts
await getChatGPTUser();
```

`if (!authenticatedUser) {`は認証情報がない場合だけ中の処理へ進みます。

```ts
if (!authenticatedUser) {
```

`Response.json()`は未認証エラーをJSON形式で返します。

```ts
return Response.json(
  { error: "ログインが必要です。" },
  { status: 401 },
);
```

HTTP 401を返した場合は`return`によってPATCH処理が終了し、DB操作へ進みません。

### PATCH通信のJSONを読み取る

`const body = await request`はJSONの読み取り結果を`body`へ保存する準備をします。

```ts
const body = await request
```

`.json()`はフロントエンドから送られたJSONをJavaScriptの値へ変換します。

```ts
.json()
```

`.catch(() => null)`はJSONが壊れていた場合に、処理を停止せず`null`を返します。

```ts
.catch(() => null);
```

`body === null`はJSONの読み取りに失敗した状態か確認します。

```ts
body === null ||
```

`typeof body !== "object"`は受信値が項目を持つオブジェクトでない状態か確認します。

```ts
typeof body !== "object" ||
```

`Array.isArray(body)`は受信値が配列になっていないか確認します。

```ts
Array.isArray(body)
```

`||`は3つの不正条件のうち、どれか1つでも当てはまることを表します。

入力形式が不正なら安全なエラーJSONとHTTP 400を返します。

```ts
return Response.json(
  { error: "入力内容が不正です。" },
  { status: 400 },
);
```

この確認に通った`body`だけが、次の身体情報の取り出し処理へ進みます。

### JSONから身体情報を取り出す

`const {`はオブジェクトから複数の項目を取り出す分割代入を始めます。

```ts
const {
```

`heightCm = null`は身長を取り出し、送られていなければ`null`にします。

```ts
heightCm = null,
```

`weightKg = null`は体重を取り出し、送られていなければ`null`にします。

```ts
weightKg = null,
```

`bodyFatPercentage = null`は体脂肪率を取り出し、送られていなければ`null`にします。

```ts
bodyFatPercentage = null,
```

`} = body;`は3項目の取得元を受信した`body`に指定します。

```ts
} = body;
```

この書き方をオブジェクトの分割代入と呼び、任意項目が`undefined`になる場合だけ初期値の`null`を使います。

`weeklyTrainingDays = null`は週のトレーニング日数を取り出し、送られていなければ`null`にします。

```ts
weeklyTrainingDays = null,
```

`availableMinutes = null`は1回のトレーニングに使える時間を取り出し、送られていなければ`null`にします。

```ts
availableMinutes = null,
```

`trainingLocation = null`はトレーニング場所を取り出し、送られていなければ`null`にします。

```ts
trainingLocation = null,
```

`weakBodyParts = null`は苦手部位の配列を取り出し、送られていなければ`null`にします。

```ts
weakBodyParts = null,
```

`} = body;`は4項目の取得元を受信した`body`に指定します。

現在の分割代入では未送信項目を`null`にしますが、次の入力値チェックで身長と体重の`null`を拒否します。残り5項目は任意入力です。

### 任意入力の数値を確認する共通関数

`function isOptionalNumberInRange(`は任意入力の数値が指定範囲内か確認する関数を定義します。

```ts
function isOptionalNumberInRange(
```

`value: unknown`は確認前で種類が分からない入力値を受け取ります。

```ts
value: unknown,
```

`minimum: number`は許可する最小値を数値として受け取ります。

```ts
minimum: number,
```

`maximum: number`は許可する最大値を数値として受け取ります。

```ts
maximum: number,
```

`return (`は確認結果を`true`か`false`で返し始めます。

```ts
return (
```

`value === null`は任意入力なので未入力の`null`を正しい値として許可します。

```ts
value === null ||
```

`typeof value === "number"`は入力値が数値か確認します。

```ts
typeof value === "number" &&
```

`Number.isFinite(value)`は`NaN`や`Infinity`ではない通常の数値か確認します。

```ts
Number.isFinite(value) &&
```

`value >= minimum`は入力値が最小値以上か確認します。

```ts
value >= minimum &&
```

`value <= maximum`は入力値が最大値以下か確認します。

```ts
value <= maximum
```

`||`は`null`または数値条件を満たす場合に`true`を返すことを表します。

`&&`は数値に関するすべての条件を満たす必要があることを表します。

### 任意入力の整数を確認する共通関数

`function isOptionalIntegerInRange(`は任意入力の整数が指定範囲内か確認する関数を定義します。

```ts
function isOptionalIntegerInRange(
```

`value: unknown`は確認前で種類が分からない入力値を受け取ります。

```ts
value: unknown,
```

`minimum: number`は許可する最小値を受け取ります。

```ts
minimum: number,
```

`maximum: number`は許可する最大値を受け取ります。

```ts
maximum: number,
```

`value === null`は任意入力なので未入力を許可します。

```ts
value === null ||
```

`Number.isInteger(value)`は入力値が小数を含まない整数か確認します。

```ts
Number.isInteger(value) &&
```

`typeof value === "number"`は入力値が数値型か確認します。

```ts
typeof value === "number" &&
```

`value >= minimum`は入力値が最小値以上か確認します。

`value <= maximum`は入力値が最大値以下か確認します。

この関数は週のトレーニング日数と1回に使える時間の確認へ再利用します。

### 身体情報の数値範囲を確認する

`if (`は必須の身長・体重が未入力、または5つの数値のどれかに問題がある場合の条件分岐を始めます。

`heightCm === null`は身長が未入力ならエラーにする必須チェックです。

`weightKg === null`は体重が未入力ならエラーにする必須チェックです。

`!isOptionalNumberInRange(heightCm, 50, 250)`は入力された身長が50〜250cmの数値か確認します。

`!isOptionalNumberInRange(weightKg, 20, 500)`は入力された体重が20〜500kgの数値か確認します。

`!isOptionalNumberInRange(bodyFatPercentage, 0, 80)`は体脂肪率が`null`または0〜80%でなければ不正とします。

`!isOptionalIntegerInRange(weeklyTrainingDays, 0, 7)`は週の回数が`null`または0〜7の整数でなければ不正とします。

`!isOptionalIntegerInRange(availableMinutes, 20, 180)`は、1回のトレーニングに使える時間が`null`または20〜180分の整数でなければ不正とします。

`||`は5つの確認のどれか1つでも不正ならエラーにすることを表します。

`Response.json()`は安全な入力エラーとHTTP 400を返します。

```ts
return Response.json(
  {
    error:
      "身体情報の数値が正しくありません。",
  },
  { status: 400 },
);
```

この確認によって、不正な文字列・範囲外の数値・週3.5回などの小数をDBへ保存しません。

### PATCHで保存対象のユーザーIDを検索する

`const db = getDb();`はNeon PostgreSQLを操作する接続を取得します。

`const matchedUsers = await db`はユーザー検索の完了を待ち、結果を配列として保存します。

`.select({ id: users.id })`はプロフィール保存に必要なユーザーIDだけを取得します。

`.from(users)`は検索対象を`users`テーブルにします。

`.where(eq(users.email, authenticatedUser.email))`は認証メールと同じメールを持つユーザーへ絞ります。

`.limit(1)`は検索結果を最大1人に制限します。

この検索によって、これから保存するプロフィールをログイン中のユーザーIDと結び付けられます。

### PATCHの検索結果から現在のユーザーを取り出す

`const currentUser =`はプロフィールを保存するユーザーを入れる変数を作ります。

`matchedUsers[0]`は検索結果の配列から1人目を取り出します。

`?? null`は検索結果が空なら値を`null`へ統一します。

`if (!currentUser)`は保存先のユーザーが存在しない場合だけ中の処理を実行します。

`Response.json()`は「ユーザーが見つかりません」というエラーとHTTP 404を返し、保存処理へ進ませません。

この処理によって、プロフィールを存在しないユーザーIDへ保存することを防ぎます。

### プロフィールとして保存する値をまとめる

`const profileValues = {`は、DBへ保存するプロフィール情報を1つのオブジェクトにまとめます。

`userId: currentUser.id`は、プロフィールをログイン中のユーザーと結び付けます。

`heightCm`と`weightKg`は、入力必須として確認済みの身長と体重です。

`bodyFatPercentage`、`weeklyTrainingDays`、`availableMinutes`、`trainingLocation`、`weakBodyParts`は任意入力のプロフィール情報です。

`updatedAt: new Date()`は、プロフィールを保存・更新した現在日時を記録します。

ここでは保存内容を準備しただけで、まだPostgreSQLへの書き込みは実行していません。

### プロフィールを新規保存または更新する

`const savedProfiles = await db`は、DBへの保存完了を待って保存結果を受け取ります。

`.insert(userProfiles)`は`user_profiles`テーブルへプロフィールを新規作成しようとします。

`.values(profileValues)`は、保存する内容として先ほどまとめたプロフィール情報を渡します。

`.onConflictDoUpdate()`は、同じユーザーのプロフィールがすでにある場合に新規作成から更新へ切り替えます。

`target: userProfiles.userId`は、重複しているかをユーザーIDで判断します。

`set: profileValues`は、既存プロフィールを今回受け取った内容へ更新します。

`.returning()`は、新規作成または更新されたプロフィールを配列として返します。

初回は新規作成、マイページなどから変更した2回目以降は同じ1件を更新するため、プロフィールが重複しません。

### 身体情報の保存完了状態を記録する

`await db`は、ユーザー状態の更新が完了するまで待ちます。

`.update(users)`は、初回設定の進み具合を管理する`users`テーブルを更新します。

`.set({ profileCompleted: true })`は、身体情報の入力と保存が完了した状態にします。

`updatedAt: new Date()`は、ユーザー状態を変更した現在日時を記録します。

`.where(eq(users.id, currentUser.id))`は、ログイン中のユーザー本人だけを更新します。

この時点では初回分析が残っているため、初回設定全体を表す`onboardingCompleted`はまだ変更しません。

### 保存結果をフロントエンドへ返す

`const savedProfile =`は、保存されたプロフィールを入れる変数を作ります。

`savedProfiles[0] ?? null`は保存結果の配列から1件目を取り出し、結果がなければ`null`にします。

`return Response.json()`は、保存結果をJSONとしてフロントエンドへ返してPATCH処理を終了します。

`profile: savedProfile`は、PostgreSQLへ保存された最新のプロフィールです。

`profileCompleted: true`は、身体情報の入力・保存が完了したことをフロントエンドへ伝えます。

フロントエンドは成功レスポンスを受け取った後、初回分析画面へ進めます。

ステータスを明示していない成功レスポンスにはHTTP 200が使われます。

# 13. 現在まだ実装していないこと

- 参考画像の永続保存とサーバーへのアップロード
- 本番用画像ストレージへ身体写真を保存する処理
- AI回答のMarkdownをスマホ画面で見やすく表示する処理
- API利用回数、連続送信、入力文字数などの本番用制限
- TypeScriptバックエンドの開発用デプロイと公開URLへの切り替え
- 全機能の実端末通しテストとエラー処理の最終確認
- App Store用ビルド、プライバシー表示、審査準備
- 必要に応じた課金機能

現在の次工程は、AI回答のMarkdown表示と本番用の利用制限です。

## 12-13. 身長・体重をNeon側でも必須にする

対象ファイル：`drizzle-postgres/0002_luxuriant_sprite.sql`

このファイルは、`db/schema.ts`で身長と体重へ追加した`.notNull()`と、Neonの実テーブルとの差分からDrizzle Kitが自動生成したマイグレーションです。

```sql
ALTER TABLE "user_profiles" ALTER COLUMN "height_cm" SET NOT NULL;
ALTER TABLE "user_profiles" ALTER COLUMN "weight_kg" SET NOT NULL;
```

`ALTER TABLE "user_profiles"`は、既存の`user_profiles`テーブルの設計を変更します。

`ALTER COLUMN "height_cm" SET NOT NULL`は、身長へ`null`を保存できないようにします。

`ALTER COLUMN "weight_kg" SET NOT NULL`は、体重へ`null`を保存できないようにします。

適用前に、身長または体重が`null`の既存プロフィールを確認し、0件であることを確認しました。

2026年8月9日にNeonの`musclepas`プロジェクトへ適用し、`information_schema.columns`で両方の`is_nullable`が`NO`になったことを確認しました。

これにより、フロントエンド、プロフィールAPI、TypeScriptのスキーマ、Neon PostgreSQLのすべてで「身長・体重のみ必須」という仕様が一致しています。

## 12-14. 一般公開用の認証にClerkを採用する

大勢のユーザーが利用する場合、身体情報・写真・トレーニング記録・AIチャット・長期記憶をユーザーごとに安全に分ける必要があります。

そのため、プロフィールAPIとフロントエンドを本接続する前にClerk認証を導入します。

最初に用意するログイン方法は、Googleログインとメール認証コードです。

Clerkはログイン、セッション、本人確認を担当します。

Neon PostgreSQLは理想体型、身体情報、記録、分析、AIチャットなどのアプリデータを保存します。

`users.id`は、プロフィールや記録との外部キーに使うアプリ内部のUUIDとして残します。

`users.clerkUserId`を新しく追加し、Clerkが発行する固定のユーザーIDを保存します。

```ts
clerkUserId: text("clerk_user_id")
  .unique(),
```

`clerkUserId`はTypeScript内で使う項目名です。

`text("clerk_user_id")`は、Neon PostgreSQLへClerkユーザーIDを文字列として保存します。

`.unique()`は、同じClerkユーザーIDを複数の`users`データへ保存できないようにします。

既存のテストユーザーにはClerk IDがないため、最初の移行では`.notNull()`を付けず`null`を許可します。

Clerkへの移行が完了し、すべての実ユーザーへ`clerkUserId`が入った後で必須化を検討します。

今後のAPIは変更される可能性があるメールアドレスではなく、`clerkUserId`でログイン中のユーザーを検索します。

```text
Clerkが本人確認
        ↓
Clerk userIdを取得
        ↓
users.clerk_user_idを検索
        ↓
アプリ内部のusers.idを取得
        ↓
本人のプロフィール・記録・AIデータだけを操作
```

現在の`getChatGPTUser()`を使う認証は、Clerkの最小動作確認が成功した後に共通のClerk認証関数へ置き換えます。

フロントエンド担当はログイン・新規登録画面、ログアウト、認証中表示、画面遷移を担当します。

バックエンド担当はClerkセッション検証、`clerkUserId`とNeonの紐づけ、APIごとの本人確認とアクセス制御を担当します。

このプロジェクトはVinextとCloudflare Workersを使っているため、全APIを書き換える前にClerk SDKの最小ログイン・API認証テストを行います。

### clerk_user_idをNeonへ追加するマイグレーション

対象ファイル：`drizzle-postgres/0003_workable_giant_girl.sql`

```sql
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");
```

1行目は`users`テーブルへClerkユーザーIDを保存する文字列列を追加します。

2行目は同じClerkユーザーIDを複数のユーザーへ保存できないようにします。

2026年8月9日にNeonの`musclepas`プロジェクトへ適用しました。

確認結果は`data_type: text`、`is_nullable: YES`、`has_unique_constraint: true`です。

`is_nullable: YES`なのは、Clerk IDをまだ持たない既存テストユーザーを残したまま安全に移行するためです。

### Clerkのバックエンド用環境変数

`.env.local`へ次の2種類のキーを設定します。

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=ClerkのPublishable Key
CLERK_SECRET_KEY=ClerkのSecret Key
```

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`は、このアプリがどのClerk環境を利用するか識別する公開可能キーです。

`CLERK_SECRET_KEY`は、バックエンドがClerkへ接続し、認証情報を安全に確認するための秘密鍵です。

`CLERK_SECRET_KEY`はReactコード、Expoアプリ、localStorage、GitHub、チャットへ載せません。

2026年8月9日に、両方の環境変数が設定済みであることを値を表示せず確認しました。

### モバイルアプリの認証を確認するバックエンドSDK

`@clerk/backend`を直接インストールしています。

`@clerk/nextjs`はWeb版のClerk連携に利用でき、`@clerk/backend`はExpoなど別のクライアントから届く認証トークンをバックエンドで検証するために使います。

共通認証ファイルは`app/lib/auth/clerk-auth.ts`です。

このファイルへ認証処理を一度だけ書き、プロフィール・トレーニング記録・身体分析・AIメニュー・AIチャットの各APIから呼び出します。

```ts
import { createClerkClient } from "@clerk/backend";
```

`import`は別のパッケージやファイルが公開している機能を現在のファイルへ読み込む文法です。

`{ createClerkClient }`は`@clerk/backend`が公開する複数の機能から、Clerk接続を作る機能だけを選びます。

```ts
const publishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
```

`const publishableKey`は公開可能キーを保存する変数を定義します。

`process.env`はサーバーの環境変数を読み取るための仕組みです。

```ts
const secretKey =
  process.env.CLERK_SECRET_KEY;
```

`secretKey`はトークン検証に使う秘密鍵を保存します。

秘密鍵の実際の値をTypeScriptへ直接書かないため、GitHubへ誤って公開することを防ぎます。

```ts
if (!publishableKey || !secretKey) {
  throw new Error(
    "Clerkの環境変数が設定されていません。",
  );
}
```

`!publishableKey`は公開可能キーが空または未設定か確認します。

`||`は左右のどちらか一方でも問題があれば条件を成立させる「または」です。

`!secretKey`は秘密鍵が空または未設定か確認します。

`throw new Error()`は、必要な設定がない状態で不明な認証エラーを起こす前に、開発者向けの分かりやすいエラーで停止します。

```ts
const clerkClient = createClerkClient({
  publishableKey,
  secretKey,
});
```

`createClerkClient()`は、設定した2つのキーを使ってClerkのバックエンド機能を利用できる状態にします。

`publishableKey`は利用するClerkアプリを識別します。

`secretKey`はバックエンドだけが使い、認証トークンの検証に必要です。

`clerk-auth.ts`はTypeScriptファイルです。

認証結果やClerkユーザーIDの型を確認できるため、存在しない項目の利用や文字列以外の値を誤って扱う問題を実行前に見つけやすくなります。

フロントエンドの既存画面にはJavaScript・JSXがありますが、新しく作る認証・DB・APIなどのバックエンドは安全性を優先してTypeScriptを使います。

### リクエストからClerkユーザーIDを取得する共通関数

```ts
export async function getClerkUserId(
  request: Request,
): Promise<string | null> {
```

`export`は、この関数をプロフィールなど別のAPIファイルから読み込めるようにします。

`async`は、Clerkの確認完了を`await`で待てる非同期関数を表します。

`request: Request`は、引数`request`へHTTPリクエストを受け取るというTypeScriptの型指定です。

`Promise<string | null>`は、確認完了後にユーザーIDの文字列、または未認証を表す`null`を返すという型です。

```ts
const requestState =
  await clerkClient.authenticateRequest(
    request,
    {
      acceptsToken: "session_token",
    },
  );
```

`authenticateRequest()`は、リクエスト内のClerkトークンが本物で有効か検証します。

`acceptsToken: "session_token"`は、人間のログインセッション用トークンだけを受け付けます。

```ts
if (!requestState.isAuthenticated) {
  return null;
}
```

`isAuthenticated`は、Clerkがログイン済みと確認できたかを表します。

未ログイン・期限切れ・不正なトークンの場合は`null`を返します。

```ts
return requestState.toAuth().userId;
```

`toAuth()`は検証結果をAPIで使いやすい認証情報へ変換します。

`.userId`はClerkがユーザーごとに発行した固定IDです。

この難しい認証処理を共通関数へまとめることで、各APIは`getClerkUserId(request)`を呼ぶだけで本人確認できます。

### bootstrap APIでClerk認証を使う

`bootstrap`のPOST関数で`request: Request`を受け取り、iPhoneアプリから届いた認証トークンを共通関数へ渡します。

```ts
const clerkUserId =
  await getClerkUserId(request);
```

`await getClerkUserId(request)`は、リクエスト内のClerkトークンの検証完了を待ちます。

成功時は固定のClerkユーザーID、未認証時は`null`が`clerkUserId`へ入ります。

```ts
if (!clerkUserId) {
  return Response.json(
    { error: "ログインが必要です。" },
    { status: 401 },
  );
}
```

`if (!clerkUserId)`はユーザーIDを取得できなかった場合だけ中の処理を実行します。

HTTP 401を返して処理を終了するため、未認証のリクエストはNeonのユーザーデータへ進めません。

### bootstrap APIでClerkユーザーとNeonを紐づける

```ts
.where(
  eq(
    users.clerkUserId,
    clerkUserId,
  ),
)
```

`.where()`はNeonから取得するユーザーの条件を指定します。

`eq()`は左右の値が等しいデータだけに絞ります。

`users.clerkUserId`はNeonの`users.clerk_user_id`列です。

`clerkUserId`は検証済みのClerkトークンから取得した本人の固定IDです。

メールアドレスではなくClerkユーザーIDで検索するため、メール変更後も同じアプリユーザーとして認識できます。

### 初回登録に必要なClerkユーザー詳細を取得する

```ts
export async function getClerkUserDetails(
  clerkUserId: string,
) {
  return clerkClient.users.getUser(
    clerkUserId,
  );
}
```

`getClerkUserDetails`は、ClerkユーザーIDからメールアドレスや名前などのアカウント情報を取得する共通関数です。

`clerkUserId: string`は取得対象のClerkユーザーIDを文字列として受け取ります。

`clerkClient.users.getUser()`はClerkのユーザー管理機能から該当ユーザーを取得します。

この関数はNeonにユーザーがまだ存在しない初回登録時だけ呼び、登録済みユーザーでは不要なClerk API通信を行いません。

### bootstrapで初回ユーザーのメールアドレスを取得する

`existingUser`が見つかった場合はその前でレスポンスを返すため、次の処理はNeonに未登録の場合だけ実行されます。

```ts
const clerkUserDetails =
  await getClerkUserDetails(
    clerkUserId,
  );
```

`clerkUserDetails`にはClerkが管理するメールアドレス、名前、画像などのユーザー情報が入ります。

```ts
const email =
  clerkUserDetails.primaryEmailAddress
    ?.emailAddress ?? null;
```

`primaryEmailAddress`はClerkで主要メールとして設定された情報です。

`?.emailAddress`は主要メール情報が存在する場合だけ、その中のメール文字列を読みます。

`?.`は途中の値が`null`や`undefined`でもエラーにせず`undefined`を返すオプショナルチェーンです。

`?? null`は取得結果が`null`または`undefined`なら、扱いやすい`null`へ統一するNull合体演算子です。

```ts
if (!email) {
  return Response.json(
    {
      error:
        "メールアドレスを取得できません。",
    },
    { status: 400 },
  );
}
```

`if (!email)`はメールアドレスが`null`または空の場合だけ中の処理を実行します。

Neonの`users.email`は必須なので、不完全なユーザーを登録せずHTTP 400で終了します。

### Clerkの姓名から表示名を作る

```ts
const displayName =
  [
    clerkUserDetails.firstName,
    clerkUserDetails.lastName,
  ]
    .filter(Boolean)
    .join(" ") || email;
```

`[]`は複数の値を順番にまとめる配列です。

`.filter(Boolean)`は`null`、`undefined`、空文字などの空の値を配列から取り除きます。

`.join(" ")`は配列の文字列を半角スペースでつなぎ、1つの表示名にします。

`|| email`は姓名から表示名を作れなかった場合に、メールアドレスを代わりに使います。

#### 単語帳への追加

- `.filter()`：条件に合う配列の要素だけを残して新しい配列を作る
- `Boolean`：値を`true`または`false`として判定する
- `.filter(Boolean)`：空の値を配列から取り除く定番の書き方
- `.join(" ")`：配列の文字列を指定した区切り文字でつなぐ
- `||`：左側が空や`false`なら右側を使う

### ClerkユーザーをNeonへ新規保存する

担当ファイルは`app/api/users/bootstrap/route.ts`です。

ここまでの処理で、Clerkによる本人確認、Neonの既存ユーザー検索、メールアドレスの確認、表示名の作成まで終わっています。

既存ユーザーが見つからなかった場合だけ、次の処理でNeonの`users`テーブルへ新しい1行を追加します。

```ts
const createdUsers = await db
  .insert(users)
  .values({
    clerkUserId,
    email,
    displayName,
  })
  .returning();
```

#### 1行ずつの説明

`const createdUsers = await db`は、Neonの処理が完了するまで待ち、返された作成結果を`createdUsers`という定数へ保存します。

`const`は、あとから別の値を代入し直さない名前を定義します。

`await`は、データベースから結果が返る前に次の処理へ進まないように待ちます。

`db`は、`getDb()`で用意したNeon PostgreSQLへの接続です。

`.insert(users)`は、`users`テーブルへ新しいデータを1行追加する命令です。

`.values({`は、新しい行の各列へ保存する内容の指定を開始します。

`clerkUserId,`は、Clerkで本人確認できた固定ユーザーIDを`clerk_user_id`列へ保存します。

このIDがあることで、今後プロフィールや記録を「どの利用者のデータか」で正しく分けられます。

`email,`は、Clerkから取得して必須確認まで終わったメールアドレスを`email`列へ保存します。

`displayName,`は、Clerkの姓名から作成した表示名を`display_name`列へ保存します。

`})`は、保存内容の指定を終了します。

`.returning()`は、新しくNeonへ保存された行を結果として返してもらいます。

最後の`;`は、TypeScriptの文が終了したことを表します。

#### 省略記法の意味

次のように、オブジェクトの項目名と変数名が同じ場合は1回だけ書けます。

```ts
clerkUserId,
email,
displayName,
```

これは内部的には次と同じ意味です。

```ts
clerkUserId: clerkUserId,
email: email,
displayName: displayName,
```

左側は保存先の項目名、右側は現在の変数に入っている値です。

#### なぜこの3項目を保存するのか

| 保存する値 | 目的 |
| --- | --- |
| `clerkUserId` | ログインした本人とNeonのデータを安全に結び付ける |
| `email` | アカウントの連絡先・必須ユーザー情報として保持する |
| `displayName` | 画面上で利用者を表示する名前として利用する |

最も重要なのは`clerkUserId`です。

メールアドレスは利用者が変更する可能性がありますが、ClerkユーザーIDは同じアカウントで固定されるため、本人検索の基準に使います。

#### 保存結果が配列になる理由

Drizzleの`.returning()`は複数行を作成できる形に合わせ、結果を配列で返します。

今回は1人だけ作るため、次のコードで配列の先頭を取り出します。

```ts
const createdUser = createdUsers[0];
```

`createdUsers`は作成結果の配列です。

`[0]`は配列の最初の要素を取り出します。配列の番号は`0`から始まります。

#### 保存後にフロントエンドへ返す

```ts
return Response.json(
  {
    user: createdUser,
    isNewUser: true,
  },
  { status: 201 },
);
```

`return`はレスポンスを返し、このAPIの処理を終了します。

`Response.json()`は、フロントエンドへJSON形式で結果を返します。

`user: createdUser`は、新しく作成されたユーザー情報を`user`という名前で返します。

`isNewUser: true`は、今回が初回登録だったことをフロントエンドへ伝えます。

`status: 201`は、新しいデータの作成に成功したことを表します。

フロントエンドは`isNewUser`などの結果を使い、初回設定画面へ進めるかホーム画面へ進めるかを判断できます。

#### 今回の処理全体を日本語にすると

```text
ログイン中のClerkユーザーIDを確認する
        ↓
同じClerkユーザーIDがNeonにあるか探す
        ↓
あれば既存ユーザーとして返す
        ↓ なければ
Clerkからメールと名前を取得する
        ↓
clerkUserId・email・displayNameをNeonへ保存する
        ↓
作成したユーザーと「初回登録」をフロントエンドへ返す
```

### プロフィールAPIをClerk認証へ変更する

担当ファイルは`app/api/users/profile/route.ts`です。

このAPIには、保存済みプロフィールを取得する`GET`と、プロフィールを保存・更新する`PATCH`があります。

両方とも本人の身体情報を扱うため、同じClerk認証の基本形を使います。

```ts
export async function GET(
  request: Request,
) {
  const clerkUserId =
    await getClerkUserId(request);

  if (!clerkUserId) {
    return Response.json(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }
}
```

`request: Request`は、フロントエンドから届いたHTTP通信全体を受け取ります。

`getClerkUserId(request)`は、その通信に付いたClerkセッショントークンを検証します。

認証成功時は本人の固定ClerkユーザーID、失敗時は`null`が返ります。

`if (!clerkUserId)`は、IDを取得できなかった場合にNeonを操作せずHTTP 401で終了します。

`PATCH`はもともとJSON入力を読むために`request: Request`を受け取っていました。同じ`request`をJSONの読み取りとClerk認証の両方に使えます。

本人のNeonユーザーを探す条件も、メールアドレスからClerkユーザーIDへ変更しました。

```ts
const matchedUsers = await db
  .select({
    id: users.id,
  })
  .from(users)
  .where(
    eq(
      users.clerkUserId,
      clerkUserId,
    ),
  )
  .limit(1);
```

`.select({ id: users.id })`は、後のプロフィール検索・保存に必要なアプリ内ユーザーIDだけを取得します。

`.from(users)`は、検索対象をNeonの`users`テーブルに指定します。

`.where()`は、取得するデータの条件を指定します。

`eq(users.clerkUserId, clerkUserId)`は、Neonに保存済みのClerk IDと今回認証できた本人のClerk IDが等しい行だけを探します。

`.limit(1)`は、取得件数を最大1件にします。`clerk_user_id`には一意制約があるため、同じClerk IDのユーザーが複数作られることも防いでいます。

```text
GET
→ 本人確認 → Neonユーザー検索 → 本人のプロフィール取得 → JSONで返す

PATCH
→ 本人確認 → JSON入力チェック → Neonユーザー検索 → 本人のプロフィール保存・更新
```

認証コードは`GET`と`PATCH`の両方に書きますが、難しいトークン検証本体は`app/lib/auth/clerk-auth.ts`へ共通化されています。

各APIに残るのは、「今回の通信を確認する関数を呼ぶ」「認証できなければ停止する」という部分です。

2026年8月9日に古い`getChatGPTUser`とメール検索をプロフィールAPIから削除し、ESLintで構文・静的検査が成功したことを確認しました。

### 理想体型保存APIをClerk認証へ変更する

担当ファイルは`app/api/users/goal/route.ts`です。

このAPIは、フロントエンドで選択された理想体型を、ログイン中の本人の`users`データへ保存します。

処理の流れは次のとおりです。

```text
PATCHリクエストを受け取る
        ↓
Clerkトークンを検証する
        ↓
理想体型が許可された4種類か確認する
        ↓
Clerk IDが一致する本人だけをNeonで更新する
        ↓
更新結果をJSONで返す
```

認証部分では、プロフィールAPIと同じ共通関数を使います。

```ts
const clerkUserId =
  await getClerkUserId(request);

if (!clerkUserId) {
  return Response.json(
    { error: "ログインが必要です。" },
    { status: 401 },
  );
}
```

`getClerkUserId(request)`は、今回の通信に付いたClerkトークンを検証します。

認証できなければ`null`が返るため、HTTP 401を返してNeonの更新前に終了します。

更新処理は次の形です。

```ts
const updatedUsers = await db
  .update(users)
  .set({
    goalBodyType,
    updatedAt: new Date(),
  })
  .where(
    eq(
      users.clerkUserId,
      clerkUserId,
    ),
  )
  .returning();
```

`.update(users)`は、Neonの`users`テーブルを更新対象にします。

`.set()`は、更新する列と新しい値を指定します。

`goalBodyType`は、入力チェックを通過した「細マッチョ」「逆三角形」「フィジーク」「バルクアップ」のいずれかです。

`updatedAt: new Date()`は、理想体型を変更した現在日時を保存します。

`.where()`は、更新してよいユーザーを絞る条件です。

`eq(users.clerkUserId, clerkUserId)`は、Neonに保存されたClerk IDと今回認証した本人のClerk IDが同じ行だけを更新します。

この`.where()`がないと`users`テーブルの全利用者を更新する危険があるため、本人だけに限定する重要な条件です。

`.returning()`は、更新後のユーザー情報を配列で受け取ります。

古い処理ではメールアドレスで本人を検索していましたが、現在は変更されにくい固定のClerkユーザーIDで検索します。

2026年8月9日に`bootstrap`・プロフィール・理想体型の3APIをまとめてESLintで検査し、古い認証関数の参照と構文エラーがないことを確認しました。

### Expoスマホ版とbootstrap APIを接続する

スマホ側の担当ファイルは`mobile/src/lib/bootstrap.ts`と`mobile/src/lib/api.ts`です。

バックエンド側の担当ファイルは`app/api/users/bootstrap/route.ts`です。

今回、スマホ版とバックエンドのAPI契約を次へ統一しました。

```text
通信方法：POST
接続先：/api/users/bootstrap

レスポンス：
{
  "userId": "ClerkユーザーID",
  "onboardingCompleted": false
}
```

初回ログインではNeonへユーザーを新規登録する可能性があるため、データ取得だけを表す`GET`ではなく、登録処理に使う`POST`を利用します。

スマホ側の基本形は次のとおりです。

```ts
export function fetchBootstrap(token: string) {
  return apiRequest<BootstrapResponse>(
    "/api/users/bootstrap",
    {
      method: "POST",
      token,
    },
  );
}
```

`token: string`は、Clerkログイン後にスマホ版が取得したセッショントークンです。

`apiRequest<BootstrapResponse>`は、APIの返却値が`BootstrapResponse`の形になる想定で共通通信関数を呼びます。

`"/api/users/bootstrap"`は、バックエンドの`app/api/users/bootstrap/route.ts`へ対応するURLです。

`method: "POST"`は、ユーザーの検索または初回登録処理を開始します。

共通通信関数は、Clerkトークンを次のHTTPヘッダーへ付けます。

```ts
Authorization: `Bearer ${options.token}`
```

`Authorization`は、バックエンドへ認証情報を渡すためのHTTPヘッダーです。

`Bearer`は、この後ろの文字列が認証トークンであることを表します。

バックエンドの`getClerkUserId(request)`がこのトークンを検証し、本人のClerkユーザーIDを取得します。

バックエンドはユーザーデータ全体ではなく、初回の画面分岐に必要な値だけを返す形へ変更しました。

```ts
return Response.json({
  userId: clerkUserId,
  onboardingCompleted:
    existingUser.onboardingCompleted,
});
```

`userId`は認証済みのClerkユーザーIDです。

`onboardingCompleted`は初回設定が完了しているかを表す真偽値です。

`false`なら理想体型などの初回設定へ進み、`true`ならホーム画面へ進みます。

APIのエラー本文はバックエンドが`{ error: "..." }`で返すため、スマホ版は`error`と`message`の両方を読み取れるようにしました。

```ts
message =
  body.error ??
  body.message ??
  fallbackMessage;
```

`body.error`を最初に使い、なければ`body.message`、それもなければHTTPステータスに対応した共通メッセージを使用します。

開発中の実機接続先は`mobile/.env.local`の`EXPO_PUBLIC_API_BASE_URL`へ設定します。

実機の`localhost`はMacではなくスマホ自身を指すため、同じWi-Fi内にあるMacのIPアドレスとバックエンドのポートを指定します。

`mobile/.env.local`は端末ごとの開発設定なのでGitの管理対象外です。Wi-FiやMacのIPアドレスが変わった場合は更新が必要です。本番では公開済みHTTPS APIのURLへ変更します。

2026年8月9日に次を確認しました。

- バックエンドのESLint成功
- Expoスマホ版のLint成功
- Expoスマホ版のTypeScript型検査成功
- トークンなしの`POST /api/users/bootstrap`がHTTP 401を返すことを確認

実際のログイン済みトークンによるNeon登録と画面分岐は、スマホ版を再起動して実機から確認します。

### 使用済み認証コードが繰り返し表示される問題の修正

担当ファイルは`mobile/src/app/sign-in.tsx`です。

画面に表示された`This verification has already been verified.`は、Clerkが「その確認コードはすでに認証処理で使用済み」と返したエラーです。

赤いエラー表示自体が原因ではなく、同じコード確認処理が複数回実行されることと、前回途中で止まった認証状態が残ることが原因でした。

今回、次の3点を修正しました。

```text
1. 新しい認証を始める前に前回のClerk状態をresetする
2. 登録済みはsignIn、未登録はsignUpへ分ける
3. useRefのロックでEnterとボタンによる二重送信を防ぐ
```

#### 前回の認証状態を消す

```ts
await signIn.reset();
await signUp.reset();
```

`signIn.reset()`は、途中で止まったログイン確認の状態を最初へ戻します。

`signUp.reset()`は、途中で止まった新規登録確認の状態を最初へ戻します。

`await`を付けることで、リセットが完了する前に新しいコード送信を開始しません。

#### 登録済みユーザーかを最初に確認する

```ts
const createResult = await signIn.create({ identifier: normalizedEmail });
```

`identifier`には、空白を除いて小文字へ統一したメールアドレスを渡します。

Clerkに登録済みなら、`signIn.emailCode.sendCode()`でログイン用コードを送ります。

未登録を表す`form_identifier_not_found`が返った場合は、`signUp.create()`で新規登録を始めます。

```ts
const signUpResult = await signUp.create({ emailAddress: normalizedEmail });
```

このように分ける理由は、新規登録ではメール確認後にユーザーとセッションの両方を作る必要があるためです。

`signIn`から`signUp`へ途中で移動してすぐ`finalize()`すると、セッションが未作成のままになり、`Cannot finalize sign-up without a created session.`が発生する場合があります。

`authMode`には、今回がログインなのか新規登録なのかを保存し、コード確認時に正しいClerk処理を選びます。

#### 二重送信を即座に防ぐ

```ts
const submissionLock = useRef(false);
```

`useRef(false)`は、画面の再描画とは別に、現在送信中かを保持します。

```ts
if (submissionLock.current) return;
submissionLock.current = true;
```

`.current`が`true`なら、すでに別の認証処理が動いているため次の処理を開始しません。

Reactの`setIsSubmitting(true)`が画面へ反映されるより先にロックできるため、Enterとログインボタンがほぼ同時に押されても確認コードを2回送りません。

処理が成功または失敗した後は、`finally`で必ずロックを解除します。

```ts
finally {
  submissionLock.current = false;
  setIsSubmitting(false);
}
```

`finally`は、`try`が成功した場合も`catch`へ進んだ場合も最後に実行される場所です。

#### コード確認後の流れ

```text
既存ユーザー
→ signInでコード確認
→ signIn.finalize()
→ Clerkセッション確定

新規ユーザー
→ signUpでユーザー登録開始
→ signUpでコード確認
→ ユーザーとセッション作成を確認
→ signUp.finalize()
→ Clerkセッション確定
```

`finalize()`は、コード確認済みの処理を実際のログインセッションとして有効にします。

2026年8月12日にExpo LintとTypeScript型検査が成功したことを確認しました。

### スマホから開発中のバックエンドへ接続する設定

ここでは、Expoアプリが動くスマホから、Macで起動しているbootstrap APIへ接続できるようにしています。

#### `package.json` の起動命令

```json
"dev": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext dev --hostname 0.0.0.0"
```

`vinext dev`は、React／Next.js形式で作ったバックエンドを開発用に起動する命令です。

`--hostname 0.0.0.0`は、Mac自身の`localhost`だけでなく、同じWi-Fi上のスマホからも3000番ポートへ接続できるようにする指定です。

この指定がない場合、スマホが`EXPO_PUBLIC_API_BASE_URL=http://MacのIPアドレス:3000`へアクセスしてもバックエンドまで届きません。

#### `vite.config.ts` のWorker設定

```ts
dev: {
  inspector: {
    hostname: "127.0.0.1",
  },
  server: {
    hostname: "0.0.0.0",
  },
},
```

`server.hostname: "0.0.0.0"`は、Cloudflare Worker側の開発サーバーもLAN接続を受け取れるようにします。

`inspector.hostname: "127.0.0.1"`は、デバッグ専用機能をMac内部だけで使えるように制限します。

つまり、アプリが使うAPIはスマホから接続可能にし、開発者用のデバッグ機能は外へ公開しない構成です。

#### `mobile/.env.local` のAPI接続先

```env
EXPO_PUBLIC_API_BASE_URL=http://MacのIPアドレス:3000
```

この値は、ExpoアプリがどのバックエンドへHTTPリクエストを送るかを表します。

Macとスマホは同じWi-Fiへ接続し、MacのIPアドレスが変わった場合はこの値も変更してExpoを再起動します。

#### 接続確認で401が返る理由

認証トークンを付けずにbootstrap APIを確認すると、`401 ログインが必要です`が返ります。

これは接続失敗ではなく、「APIには到達したが、認証情報がないのでDB処理を止めた」という正常な結果です。

### Clerk認証でフロントエンド担当が行うこと

フロントエンド担当は、ユーザーが実際に触るログイン画面と、ログイン状態に応じた画面遷移を作ります。

#### 1. アプリ全体でClerkを利用できるようにする

アプリの一番外側へ`ClerkProvider`を配置し、どの画面からでもログイン状態を参照できるようにします。

ただし、このプロジェクトはVinextを使っているため、最初に小さな画面でClerk SDKが正常に動くか確認してから全体へ広げます。

#### 2. ログイン・新規登録画面を作る

Googleログインとメール認証コードを使えるログイン・新規登録画面を表示します。

Clerkが用意する画面部品を最初に利用し、認証成功後にアプリのデザインへ合わせて見た目を調整します。

パスワードはアプリ側やNeonへ保存しません。

#### 3. 認証状態の読み込み表示を作る

アプリ起動直後はClerkの認証確認が終わるまでローディングを表示します。

確認前にホームや初回設定を一瞬表示しないようにします。

#### 4. ログイン状態で画面を分ける

未ログインの場合はログイン・新規登録画面へ移動します。

ログイン済みの場合はバックエンドのユーザー初期化APIを呼び、`onboardingCompleted`を受け取ります。

`onboardingCompleted`が`false`なら理想体型の設定へ移動します。

`onboardingCompleted`が`true`ならホーム画面へ移動します。

```text
タイトル画面
    ↓
Clerkの認証確認中
    ↓
未ログイン → ログイン・新規登録
    ↓
ログイン済み → bootstrap API
    ↓
初回設定未完了 → 理想体型
初回設定完了   → ホーム
```

#### 5. ログアウト操作を作る

マイページなどにログアウトボタンを配置します。

ログアウト後は身体情報や記録を画面上から消し、ログイン画面へ戻します。

#### 6. 認証が必要な画面を保護する

ホーム、理想体型、身体情報、初回分析、トレーニング記録、AIチャット、マイページはログイン済みユーザーだけが表示できるようにします。

URLを直接入力しても、未ログインならログイン画面へ移動させます。

#### 7. API通信時の状態を画面へ表示する

API送信中はボタンの連打を防ぎ、読み込み中の表示を出します。

HTTP 401が返った場合はログイン切れとしてログイン画面へ案内します。

HTTP 400や500が返った場合は、バックエンドから受け取った安全なエラーメッセージを画面へ表示します。

#### 8. フロントエンドが保存しないもの

`CLERK_SECRET_KEY`はフロントエンド、Reactのコード、localStorageへ保存しません。

パスワード、身体写真そのもの、他ユーザーのデータをlocalStorageへ保存しません。

Clerkの秘密鍵とNeonの`DATABASE_URL`はバックエンドの環境変数だけで管理します。

#### フロントエンド担当の作業一覧

- Clerkのログイン・新規登録UI
- Googleログインボタン
- メール認証コード入力UI
- 認証確認中のローディング
- 未ログイン時のリダイレクト
- ログイン後の`bootstrap` API呼び出し
- 初回設定またはホームへの振り分け
- ログアウトボタン
- 認証が必要な画面の保護
- API送信中・認証エラー・通信エラーの表示
- スマートフォン向けのログイン画面デザイン

## トレーニング記録：1回分の親テーブル

### どこに書くコードか

担当ファイルは`db/schema.ts`で、`userProfiles`より下に書きます。

使用言語はTypeScriptで、Drizzleを使ってNeon PostgreSQLのテーブルを定義しています。

TypeScriptで「保存するデータの形」を書き、Drizzleがその内容をPostgreSQL用のテーブル設計へ変換します。

### 何をする場所か

`trainingSessions`は、1回のトレーニング全体を表す親データです。

例えば「8月12日に60分トレーニングして、調子は8、メモは胸の調子が良かった」という情報を1件にまとめます。

ベンチプレスなどの種目や各セットの重量・回数は、後から別の子テーブルとして結び付けます。

### 基本の文の構造

```ts
export const trainingSessions = pgTable("training_sessions", {
  // 保存する列を書く
});
```

`export`は、別のAPIファイルからこのテーブルを読み込めるようにする命令です。

`const trainingSessions`は、TypeScript内でテーブル定義を使うための名前です。

`pgTable()`は、PostgreSQLのテーブルを定義するDrizzleの関数です。

`"training_sessions"`は、Neon上で実際に作られるテーブル名です。

波括弧`{}`の中には、そのテーブルで保存する列を書きます。

### 各項目の意味

```ts
id: uuid("id").defaultRandom().primaryKey(),
```

`id`は、1回ごとのトレーニング記録を重複なく区別する番号です。

`uuid()`は、推測されにくい長いIDを保存する型です。

`defaultRandom()`は、新規保存時にUUIDを自動生成します。

`primaryKey()`は、この列をテーブル内の代表IDにします。

```ts
userId: uuid("user_id")
  .notNull()
  .references(() => users.id, {
    onDelete: "cascade",
  }),
```

`userId`は、この記録を行ったユーザーを表します。

`notNull()`は、ユーザーIDを必須にして空の記録を防ぎます。

`references(() => users.id)`によって、トレーニング記録を`users`テーブルの本人と結び付けます。

`onDelete: "cascade"`は、ユーザーを削除した場合に、そのユーザーのトレーニング記録も一緒に削除する設定です。

```ts
performedAt: timestamp("performed_at", {
  withTimezone: true,
})
  .notNull()
  .defaultNow(),
```

`performedAt`は、トレーニングを実施した日時です。

`timestamp()`は日付と時刻を保存する型です。

`withTimezone: true`は、日本時間などのタイムゾーンの違いを扱えるようにします。

`defaultNow()`は、日時が渡されなかった場合に現在日時を自動保存します。

`durationMinutes`はトレーニング時間、`conditionScore`は当日の調子、`memo`は任意のメモを保存します。

この3項目に`notNull()`がないため、入力しなくても保存できます。

`createdAt`は、このデータがデータベースへ登録された日時です。

### 覚える単語

- `pgTable()`：PostgreSQLのテーブルを定義する
- `uuid()`：重複しにくいIDを保存する
- `integer()`：整数を保存する
- `text()`：文字列を保存する
- `timestamp()`：日時を保存する
- `notNull()`：必須項目にする
- `defaultNow()`：現在日時を初期値にする
- `references()`：別のテーブルと結び付ける
- `cascade`：親データ削除時に関連データも削除する

### `pgTable()`とは

`pgTable()`は、PostgreSQLのテーブルをTypeScriptで定義するDrizzleの関数です。

`pg`はPostgreSQL、`Table`はデータを保存する表という意味です。

```ts
export const bodyAnalyses = pgTable("body_analyses", {
  // 保存する列
});
```

この文は「PostgreSQLへ`body_analyses`というテーブルを用意し、波括弧内で定義した列を保存できるようにする」と読みます。

`bodyAnalyses`はTypeScriptのコード内で使う名前です。

`"body_analyses"`はNeon PostgreSQL上で実際に使われるテーブル名です。

波括弧`{}`の中には、`id`、`userId`、`status`など、テーブルへ保存する項目を定義します。

`pgTable()`自体はデータを保存する処理ではなく、保存できる表の形を決める設計です。

`schema.ts`へ`pgTable()`で設計を書き、`drizzle-kit push`などを実行すると、Neonへ実際のテーブルが作成されます。

```text
schema.tsでpgTable()を書く
          ↓
Drizzle KitでDBへ反映する
          ↓
Neonに実際のテーブルが作られる
          ↓
route.tsからデータを保存・取得する
```

### `userId`で分析結果とユーザーを結び付ける文

```ts
userId: uuid("user_id")
  .notNull()
  .references(() => users.id, {
    onDelete: "cascade",
  }),
```

このまとまりは「このデータが誰のものか」を保存し、`users`テーブルの本人と結び付けます。

#### `userId:`

`userId`は、TypeScriptやDrizzleのコード内でこの列を呼ぶときの名前です。

例えば保存処理では`userId: user.id`のように使用します。

#### `uuid("user_id")`

`uuid()`は、この列へUUID形式のIDを保存すると決めます。

`"user_id"`は、Neon PostgreSQL上で実際に作られる列名です。

`users.id`もUUIDなので、結び付ける両方の列を同じ型にします。

#### `.notNull()`

`.notNull()`は、この列を必須にします。

身体分析結果には必ず所有者が必要なため、ユーザーIDが空の分析結果は保存できません。

これは「誰の写真・分析結果か分からないデータ」を作らないためにも重要です。

#### `.references(() => users.id)`

`.references()`は、この列が別テーブルのどの列を参照するかを指定します。

`() => users.id`は、「`users`テーブルの`id`を参照する」という値を返すアロー関数です。

これにより、実際に`users`テーブルへ存在するユーザーIDだけを保存できます。

このように別テーブルのIDを参照する列を外部キーと呼びます。

#### `{ onDelete: "cascade" }`

これは参照先のユーザーが削除された場合の動きを指定する設定オブジェクトです。

`cascade`は、親であるユーザーが削除されたら、そのユーザーに属する身体分析結果も一緒に削除する設定です。

身体写真や分析結果を退会後も所有者不明のまま残さないために使います。

```text
users.id（親のユーザー）
   ↓ userIdで結び付く
body_analyses（子の分析結果）

ユーザー削除
   ↓ cascade
そのユーザーの分析結果も削除
```

#### 最後の`,`

最後のカンマは、`userId`の列定義がここで終わり、次の列定義へ進むことを表します。

### 覚える単語

- 外部キー：別テーブルのデータと結び付けるための列
- 親テーブル：参照される側のテーブル
- 子テーブル：親のIDを保存して参照する側のテーブル
- 参照整合性：存在しないユーザーIDなどを保存させない仕組み
- 設定オブジェクト：処理方法を`{ 名前: 値 }`で渡すデータ

## 身体分析結果のDB設計

### `bodyAnalyses`親テーブル

`bodyAnalyses`は、Pythonが行う1回分の身体分析全体を保存する親テーブルです。

`userId`で分析結果を本人へ結び付け、`status`で分析待ち・成功・失敗の状態を管理します。

`summary`は身体全体の説明、`goalDifference`は設定中の理想体型との差を保存します。

`analyzedAt`はPythonによる分析が完了した日時です。分析待ちの段階では空にできるため`notNull()`を付けていません。

### `bodyAnalysisAreas`子テーブル

`bodyAnalysisAreas`は、肩・胸・背中・腕・腹部・脚などの部位別結果を保存します。

`analysisId`は`bodyAnalyses.id`を参照し、部位別結果がどの身体分析に属するかを表します。

1件の`bodyAnalyses`に複数件の`bodyAnalysisAreas`を持てるため、親子の1対多関係です。

`bodyPart`は部位名で、分析結果に必ず必要なので`notNull()`を付けています。

`score`は部位の評価点、`priority`は優先度を保存します。

`observation`はPythonが画像から読み取った外見上の傾向、`recommendation`は今後のトレーニング提案です。

これらは分析方法の変更や判定不能に対応するため、現段階では任意項目にしています。

親の身体分析を削除すると、`onDelete: "cascade"`により、その分析に属する全部位の結果も削除されます。

```text
body_analyses（1回分の分析全体）
├─ body_analysis_areas（肩）
├─ body_analysis_areas（胸）
├─ body_analysis_areas（背中）
└─ body_analysis_areas（脚）
```

## Python身体画像分析API

### なぜPythonを分けるのか

Clerk認証・Neon保存・フロントとの通信はTypeScriptバックエンドが担当し、画像処理だけをPythonサービスへ分けます。

PythonはOpenCV・MediaPipe・PyTorchなど、画像処理や機械学習向けのライブラリを利用しやすいためです。

### `main.py`の役割

`python-analysis/app/main.py`は、身体画像分析用Python APIの入口です。

`from fastapi import FastAPI`は、インストールしたFastAPIからAPI本体を作る機能を読み込みます。

`app = FastAPI(...)`はPython API全体を表す`app`を作ります。

`title`はAPIの名前で、処理内容には影響しませんが、自動生成されるAPI説明画面などに表示されます。

`@app.get("/health")`は、GET通信で`/health`へアクセスしたとき、直後の関数を実行する指定です。この`@`から始まる文をデコレーターと呼びます。

`def health_check():`は、サーバーの稼働確認を行うPython関数です。

`return`でPythonの辞書を返すと、FastAPIが自動的にJSONへ変換します。

`/health`は画像を受け取らず、Pythonサービスが起動中かだけを確認する安全な入口です。

### `requirements.txt`

`requirements.txt`は、このPythonサービスに必要な外部ライブラリの一覧です。

`fastapi`はAPIを作り、`uvicorn`は作ったAPIをローカルサーバーとして起動します。

`python-multipart`は、正面・横・背面などの画像ファイルを`multipart/form-data`形式で受け取るためのライブラリです。

`python-multipart`自体をターミナルで直接実行するのではなく、`python -m pip install -r requirements.txt`でPython環境へインストールします。

`multipart/form-data`は、文字だけのJSONではなく、画像などのファイルをHTTP通信で送るときに使うデータ形式です。

### 覚える単語

- FastAPI：PythonでAPIを作るフレームワーク
- Uvicorn：FastAPIを起動するサーバー
- python-multipart：FastAPIでアップロードファイルを受け取れるようにするライブラリ
- multipart/form-data：画像などのファイルを送受信するためのHTTPデータ形式
- デコレーター：関数へAPIのURLなどの役割を付ける`@`から始まる文
- 辞書：Pythonの`{ キー: 値 }`形式のデータ
- ヘルスチェック：サービスが起動しているか確認する処理

### Pydanticで分析結果JSONの形を決める

`from pydantic import BaseModel, Field`は、受信・返却データの型と入力条件を作る機能を読み込みます。

Pydanticは、Pythonのデータが決めた型や範囲に合っているか自動確認するライブラリです。FastAPIに含まれる依存関係として利用できます。

`class BodyAreaResult(BaseModel):`は、肩や胸など1部位分の分析結果の設計図を作ります。

Pythonの`class`は、関連するデータや処理を1つの型としてまとめる仕組みです。

`body_part: str`は部位名を文字列、`priority: str`なども文字列として必須にします。

`score: int = Field(ge=1, le=10)`は、スコアを整数かつ1以上10以下に制限します。

`ge`はgreater than or equal（以上）、`le`はless than or equal（以下）の略です。

`BodyAnalysisResponse`は1回分の分析全体を表し、全体説明、理想との差、部位別結果を持ちます。

`areas: list[BodyAreaResult]`は、`BodyAreaResult`型の部位別結果を複数持つリストです。

この型を決めることで、Pythonが毎回異なる構造を返すことを防ぎ、TypeScript側が安全にNeonへ保存できます。

### 覚える単語

- Pydantic：Pythonデータの型や条件を検証するライブラリ
- `BaseModel`：Pydanticのデータモデルを作る親クラス
- `Field()`：数値範囲などの細かい条件を付ける
- `class`：データや処理をまとめた型を作る
- `str`：Pythonの文字列型
- `int`：Pythonの整数型
- `list`：複数の値を順番に持つPythonの配列

### 仮の身体分析API

`@app.post("/analyze")`は、POST通信で身体分析を開始する入口です。

`response_model=BodyAnalysisResponse`は、返すJSONが決めた分析結果の型に合うかFastAPIに確認させます。

`analyze_body()`は現時点では画像を受け取らず、TypeScriptとの接続確認に使う仮の分析結果を返します。

### 正面・横・背面画像を受け取る基本の型

`from fastapi import FastAPI, File, UploadFile`では、API本体に加えて、送信された画像を受け取る`File`と`UploadFile`を読み込みます。

`async def analyze_body(...):`は、画像の読み込みなど完了まで待つ可能性がある処理を、非同期関数として定義します。

`front_image`、`side_image`、`back_image`は、それぞれ正面・横・背面画像を受け取る変数です。

`UploadFile`は、その値がアップロードされたファイルであることをFastAPIへ伝える型です。

`File(...)`の`File`はフォーム通信からファイルを受け取る指定で、`...`はそのファイルが必須であることを表します。

この段階では画像を受け取る入口を作っただけで、画像の永続保存や本物の身体分析はまだ行いません。

### Python側の画像検査設定

`HTTPException`は、Python APIで入力エラーを見つけたときに、HTTP 400番台のエラーとして処理を中断するFastAPIの機能です。

`ALLOWED_IMAGE_TYPES`は、Pythonが受け付けるJPEG・PNG・WebPのMIMEタイプをPythonの`set`へまとめます。

Pythonでは、途中で変更しない設定値を`ALLOWED_IMAGE_TYPES`のような大文字名で書く慣習があります。

`MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024`は、1枚あたり8MBという上限をバイト単位で表します。

`MAX_TOTAL_IMAGE_SIZE_BYTES = 24 * 1024 * 1024`は、正面・横・背面の画像データ3枚を合計24MB以下にする設定です。

TypeScript側だけでなくPython側でも確認することで、Python APIが直接呼ばれた場合にも不正な画像を拒否できます。この考え方を多層防御と呼びます。

### Pythonの画像検査関数

`async def validate_image(image: UploadFile) -> int:`は、アップロード画像1枚を検査する非同期関数です。`-> int`は、正常な画像の容量を整数で返すことを表します。

`image.content_type not in ALLOWED_IMAGE_TYPES`は、送信者が申告した画像形式が許可一覧にないか確認します。

`raise HTTPException(...)`は、その場で通常処理を中断し、FastAPIから指定したHTTPエラーを返します。

`await image.read(MAX_IMAGE_SIZE_BYTES + 1)`は、上限より1バイト多い位置まで読み、8MBを超えたか判定できるようにします。

`len(image_bytes)`は読み取った実際のバイト数を返します。`0`なら空ファイル、上限より大きければ容量超過です。

`await image.seek(0)`は、検査で末尾へ進んだファイルの読み取り位置を先頭へ戻します。これを行わないと、後の画像分析が空の続きから読もうとして失敗します。

`for image in (front_image, side_image, back_image):`は、3枚を順番に取り出し、同じ`validate_image()`を繰り返します。返された容量を`total_image_size_bytes`へ足し、3枚合計も確認します。

現時点ではMIMEタイプと容量を確認しています。ファイルの中身が本物の画像かどうかは、次に画像ライブラリで検証します。

### Pillowで画像の中身を確認する準備

`pillow`は、PythonでJPEG・PNG・WebPなどの画像を開き、形式・縦横サイズ・破損の有無などを確認する画像処理ライブラリです。

`requirements.txt`へ`pillow`を書くことで、このPython分析サービスにPillowが必要であることを記録します。

`python -m pip install -r requirements.txt`は、一覧に書かれたライブラリを現在のPython環境へインストールします。

今回Pillowを使う理由は、`content_type`の申告だけを信用せず、受信データを実際に画像として開けるか確認するためです。

### Pillowで本物の画像か検査する

`from io import BytesIO`は、メモリ上の画像バイト列をファイルのように読み取るための機能を読み込みます。

`from PIL import Image, UnidentifiedImageError`は、画像を開く`Image`と、画像として認識できない場合のエラーを読み込みます。インストール名は`pillow`ですが、コードでは`PIL`からimportします。

`ALLOWED_IMAGE_FORMATS`は、Pillowが画像内部を調べて判定した実際の形式について、JPEG・PNG・WebPだけを許可します。

`MAX_IMAGE_PIXELS = 25_000_000`は、画像の総画素数を最大2500万画素に制限する設定値です。

`Image.open(BytesIO(image_bytes))`は、受信したバイト列を実際の画像として開きます。

`with ... as opened_image:`は、処理が終わったときに画像を自動的に閉じるPythonの書き方です。

`opened_image.format`はファイル内部から判定された実際の画像形式、`opened_image.size`は`(横幅, 高さ)`を返します。

`width, height = opened_image.size`は、2つの値を横幅と高さの変数へ分けるアンパックという書き方です。

`width * height`で総画素数を計算し、2500万画素を超える画像を拒否します。ファイル容量が小さくても、展開すると非常に大きくなる画像による負荷を抑えるためです。

`opened_image.verify()`は画像データが壊れていないか検査します。画像の加工や分析はまだ行いません。

`except (...) as error:`は、画像を開けない・破損している・危険な大きさとしてPillowが拒否した場合のエラーをまとめて受け取ります。

`raise HTTPException(...) from error`は、元の原因を開発者向けに残しながら、利用者には安全な共通エラーメッセージを返します。

### Python画像検査の動作確認結果

ローカルの`POST /analyze`へ正常なJPEGを3枚送信し、HTTP 200と仮の身体分析JSONが返ることを確認しました。

文字ファイルを`image/jpeg`と偽って送信した場合は、Pillowが中身を画像として開けず、HTTP 400の`正常な画像ファイルではありません。`で拒否しました。

未対応の`text/plain`を送信した場合はHTTP 415、容量0の空画像を送信した場合はHTTP 400で拒否しました。

これにより、Python側のMIMEタイプ・空ファイル・画像内部の形式と破損確認が実際に機能していることを確認できました。

## スマホ版から身体画像を送る

### JSON用と画像用のAPI関数を分ける理由

`mobile/src/lib/api.ts`の`apiRequest()`は、プロフィールなどの文字・数値をJSONで送るため、`Content-Type: application/json`を設定します。

画像はJSONではなく`FormData`を使うため、画像送信専用の`apiUploadRequest()`を別に作ります。

`apiUploadRequest<T>(path, token, body)`の`path`はAPIの住所、`token`はClerkのログイン証明、`body`は画像入りの`FormData`です。

戻り値の`Promise<T>`は、通信完了後に呼び出し側が指定した型`T`のJSONを返すことを表します。

`Authorization: Bearer ${token}`は、TypeScriptバックエンドへログイン中の本人であることを伝えます。

画像送信では`Content-Type`を手動設定しません。`fetch()`が`multipart/form-data`と、各データの境界を示す`boundary`を自動的に設定するためです。

`response.ok`が`false`ならエラーJSONを読み、バックエンドのメッセージを`ApiError`として画面側へ渡します。

既存のJSON用関数と画像用関数を分けることで、プロフィールなど他のAPI通信へ影響を与えずに画像送信を追加できます。

### 身体分析画面でClerk認証を使う

`import { useAuth } from '@clerk/expo'`は、Expoスマホ版で現在のログイン状態や認証トークンを扱うClerkのHookを読み込みます。

`import { ApiError, apiUploadRequest } from '@/lib/api'`は、画像送信関数とAPI用エラー型を身体分析画面で使えるようにします。

`const { getToken } = useAuth(...)`は、Clerkの認証機能からトークン取得関数だけを分割代入で取り出します。

`treatPendingAsSignedOut: false`は、Clerkが認証状態を確認している途中の利用者を、すぐ未ログイン扱いにしない設定です。

画像送信直前に`getToken()`を呼び、そのトークンを`Authorization`ヘッダーへ付けることで、TypeScriptバックエンドが画像の所有者を判断できます。

### 身体分析結果の型とstate

`BodyAnalysisApiResponse`は、TypeScriptバックエンドから返る身体分析JSONの構造をスマホ版へ教える型です。

`bodyAnalysisId`はNeonへ保存された1回分の分析ID、`analysis`はPythonが返した分析内容です。

`areas: {...}[]`は、肩・胸・背中などの部位別結果を複数持つ配列です。

`useState<BodyAnalysisApiResponse | null>(null)`は、API結果または未分析を表す`null`を保存できるstateを作ります。

分析前は`null`で、通信成功後に`setAnalysisResult()`へAPI結果を渡すと画面表示に使える状態になります。

### 3枚の画像を身体分析APIへ送る

`async function beginAnalysis()`は、入力確認・認証トークン取得・画像送信・結果保存を順番に行う非同期関数です。

`const frontImage = photos.front`などは、state内の正面・横・背面URIを個別の変数へ取り出します。

3つのうち1つでも空なら、API通信を始めず画面へエラーを表示します。

`setStatus('loading')`は通信中画面へ切り替え、`setAnalysisResult(null)`は前回の分析結果を消します。

`await getToken()`はClerkから現在のログイン証明を取得します。取得できなければHTTP通信を行いません。

`new FormData()`は、3枚の画像をまとめて送るフォーム形式のデータを作ります。

`formData.append('front_image', {...})`は、正面画像のURI・送信用ファイル名・MIMEタイプを追加します。`side_image`と`back_image`も同じ考え方です。

項目名はTypeScriptバックエンドの`requestFormData.get(...)`およびPythonの引数名と完全に一致させます。

`apiUploadRequest<BodyAnalysisApiResponse>(...)`は、画像を認証付きで送信し、返却JSONを指定した型として受け取ります。

成功時は`setAnalysisResult(result)`で結果を保存して結果画面へ進み、失敗時は`catch`で入力画面へ戻してエラーメッセージを表示します。

以前の`useEffect`と`setTimeout`は、API完了と関係なく1.7秒後に仮結果を表示する開発用処理だったため削除します。

### React Nativeの画像オブジェクトとBlob型

Expoのネイティブアプリでは、`FormData.append()`へ`{ uri, name, type }`形式の画像オブジェクトを渡します。

一方、TypeScriptがブラウザ版の`FormData`型を参照すると、文字列または`Blob`しか受け付けないと判定し、画像オブジェクトへ型エラーを出す場合があります。

`} as unknown as Blob`は、値を一度`unknown`として扱い、その後`Blob`型としてTypeScriptへ伝える型アサーションです。

これは実際の画像オブジェクトをBlobへ変換する処理ではありません。実行時にはExpoが`uri・name・type`を使って端末内の画像を送信します。

この指定により、Apple Store向けのReact Native実装を維持しながら、TypeScriptの型検査を通せます。

### API結果を身体分析画面へ表示する

`status === 'result' && analysisResult`は、通信が完了し、実際の結果データも存在するときだけ結果画面を表示します。

`analysisResult.analysis.summary`はPythonが返した分析全体の説明、`goal_difference`は設定済み理想体型との差を表示する場所です。

`analysisResult.analysis.areas.map((area, index) => ...)`は、部位別結果の配列を1件ずつReactのカードへ変換します。

`area`には現在処理中の部位名・点数・観察・提案が入り、`index`には配列内の0から始まる順番が入ります。

`key={`${area.body_part}-${index}`}`は、Reactが各カードを区別するための識別値です。

`String(index + 3).padStart(2, '0')`は、全体結果と理想との差を01・02で表示した続きとして、部位カードを03・04の形式で表示します。

`.padStart(2, '0')`は、文字が2桁未満なら先頭へ`0`を追加します。

この変更により、開発用の固定文章ではなく、TypeScriptバックエンドから返った検品済みJSONが画面へ表示されます。

### ブラウザとiPhoneで画像追加方法を切り替える

`Platform.OS`は、現在アプリが動作している環境を表します。ブラウザでは`web`、iPhoneでは`ios`になります。

`appendPhotoToFormData()`は、実行環境に合わせて画像を`FormData`へ追加する共通関数です。

ブラウザでは画像URIを`fetch(imageUri)`で読み、`response.blob()`で実際の画像データへ変換してから追加します。

iPhoneでは、Expoが扱える`{ uri, name, type }`形式の画像オブジェクトをそのまま追加します。

関数を定義する場所では`formData・fieldName・imageUri・fileName`という汎用的な引数を使い、正面などの具体的な変数は使用しません。

`beginAnalysis()`の中でこの共通関数を3回呼び、正面・横・背面の具体的な画像を渡します。

```text
appendPhotoToFormData()の定義
└─ 渡された画像1枚を環境に合わせて追加する

beginAnalysis()の実行
├─ 正面画像で呼ぶ
├─ 横画像で呼ぶ
└─ 背面画像で呼ぶ
```

これにより、開発中のブラウザ確認とApple Store向けiPhoneアプリの両方で同じ身体分析処理を利用できます。

### 画像送信エラーの詳細を画面へ渡す

画像送信APIは、TypeScriptバックエンドの`error`、一般的なAPIの`message`、FastAPIの`detail`の順番でエラーメッセージを探します。

`errorBody.error ?? errorBody.message ?? errorBody.detail ?? message`は、左から最初に存在する値を採用するNull合体演算子のつながりです。

応答本文がJSONではなく読めない場合にも原因を絞れるよう、初期メッセージへ`response.status`のHTTP番号を含めます。

今回のブラウザテストではHTTP 403が確認され、画像やPythonではなく、TypeScript開発サーバーの送信元チェックで拒否されていると切り分けられました。

### Vinextで3枚入りの通信を受け入れる

Vinextは`multipart/form-data`を受け取る前に、送信元と通信全体の容量を確認します。そのため、`route.ts`より前の入口設定が必要です。

`experimental.serverActions.allowedOrigins`は、開発中に画像フォームを送ってよいブラウザのホストとポートを限定します。

`127.0.0.1:8081`と`localhost:8081`は同じMac上のブラウザ、`192.168.68.54:8081`は現在のローカルネットワーク上のExpo開発画面です。

`bodySizeLimit: "26mb"`は、1枚8MB以下の画像3枚で最大24MBと、FormDataの付加情報を合わせた1通信全体の入口上限です。

これは画像1枚を26MBまで許可する設定でも、画像を保存する設定でもありません。

フロント・TypeScript・Pythonの1枚ごとの検査は引き続き必要で、Vinextの設定はそれらの検査場所まで通信を通す役割です。

`next.config.ts`はサーバー起動時に読み込まれるため、変更後はTypeScriptバックエンドを再起動します。

### VinextへNext設定を明示的に渡す

このプロジェクトではNext.js互換環境としてVinextをViteプラグインから起動しています。

`import nextConfig from "./next.config"`は、画像送信の送信元許可と容量上限をVite設定へ読み込みます。

`vinext({ nextConfig })`は、その設定を実際に動作するVinextへ明示的に渡します。

Next.js本家とVinextでは`NextConfig`の型定義が別なので、`next.config.ts`では`import type { NextConfig } from "vinext"`を使用します。

設定反映後、異なる開発Originから無害なmultipartフォームを送信し、HTTP 403ではなくAPI内のHTTP 401まで進むことを確認しました。これはVinextのCSRF拒否を通過して`route.ts`へ届いたことを表します。

### 身体分析の一連動作確認

ブラウザでテスト画像を正面・横・背面の3枚として設定し、ログイン済み状態で身体分析APIへ送信しました。

TypeScriptバックエンドがClerk認証と画像検査を行い、Python APIが画像内部を確認して仮の分析JSONを返しました。

TypeScriptが返却JSONを検品し、Neonの`body_analyses`へ`completed`状態で分析全体、`body_analysis_areas`へ肩の部位別結果1件を保存しました。

スマホ版では保存済みの仮分析結果・理想との差・肩のスコアと提案が結果画面へ表示されることを確認しました。

このテストで保存したのは分析JSONだけで、テストに使用した画像自体はNeonや画像ストレージへ保存していません。

実際に`POST /analyze`を呼び、HTTP 200と、全体説明・理想との差・肩の部位別結果を含むJSONが返ることを確認しました。

この段階では画像や個人情報をPythonへ送信していません。

## TypeScriptからPython分析APIへ接続する

### なぜTypeScriptを間に置くのか

フロントエンドからPythonへ直接送らず、最初にTypeScriptバックエンドでClerk認証・入力確認・アクセス制御を行います。

Pythonは画像分析へ集中し、ユーザー認証やNeonへの保存はTypeScriptが担当します。

### Python APIの接続先

`process.env.PYTHON_ANALYSIS_URL`は、環境変数からPython分析APIのURLを読み取ります。

環境変数を使うと、開発環境と本番環境で接続先が変わっても、処理コードを書き換えずに対応できます。

`?? "http://127.0.0.1:8000"`は、環境変数が設定されていない開発中だけ、Mac上のPython APIを使用する指定です。

`127.0.0.1`は同じMac自身、`8000`はUvicornで起動したPythonサービスのポート番号です。

```text
TypeScriptバックエンド
  ↓ http://127.0.0.1:8000/analyze
Python FastAPI
  ↓ 分析結果JSON
TypeScriptバックエンド
```

### `fetch()`でPythonへHTTP通信する

TypeScript側の`POST()`は、最初に`getClerkUserId(request)`でClerkトークンを検証します。

未ログインならHTTP 401を返し、Python APIを呼びません。これによりTypeScriptが分析機能の正規の入口になります。

`fetch(`${pythonAnalysisUrl}/analyze`, { method: "POST" })`は、Pythonの`POST /analyze`へHTTPリクエストを送ります。

### TypeScriptで3枚の画像を中継する

`await request.formData()`は、フロントから届いた`multipart/form-data`を読み取り、フォーム内の文字や画像を取り出せる形にします。

`requestFormData.get("front_image")`は、`front_image`という名前で送信された正面画像を1件取り出します。横は`side_image`、背面は`back_image`を使います。

`.get()`の結果には文字列・ファイル・`null`の可能性があるため、`instanceof File`で3つすべてがファイルか確認します。

画像が不足している場合はHTTP 400を返し、Pythonの分析処理を呼びません。

`new FormData()`はPythonへ渡す新しいフォームデータを作ります。

`pythonFormData.append("front_image", frontImage)`は、Python側の引数名と同じ名前を付けて正面画像を追加します。

`body: pythonFormData`は、作成した3枚入りのフォームデータを`fetch()`の通信本文としてPythonへ送ります。

この処理は画像をTypeScriptへ永続保存するものではなく、認証済みの通信からPythonへ画像を中継する処理です。

### 画像形式と容量を送信前に確認する

`allowedImageTypes`は、Pythonへ送信してよいJPEG・PNG・WebPのMIMEタイプを`Set`へまとめます。

`Set`の`.has(image.type)`は、現在の画像形式が許可一覧に含まれているか確認します。

`maxImageSizeBytes = 8 * 1024 * 1024`は、1枚の上限である8MBをバイト単位で表した値です。

`maxTotalImageSizeBytes = 24 * 1024 * 1024`は、画像3枚そのものの合計上限です。`reduce()`で各画像の`size`を足し、24MBを超えた場合はPythonへ送る前にHTTP 413を返します。

`bodyImages`へ正面・横・背面をまとめることで、同じ検査コードを3回書かずに済みます。

`bodyImages.some(...)`は、3枚のうち1枚でも禁止形式・空ファイル・容量超過に当てはまるか確認します。

形式が不正な場合のHTTP 415は「対応していないメディア形式」、容量超過時のHTTP 413は「送信データが大きすぎる」という意味です。

検査は`fetch()`より前へ置きます。先にPythonへ送ってから検査すると、安全確認として機能しないためです。

iPhoneのHEICは初期版では直接許可せず、フロント側でJPEGへ変換してから送る想定です。

`await`はPythonから応答が返るまで次の処理を待ちます。

`pythonResponse.ok`は、PythonのHTTPステータスが200番台なら`true`になります。

`!pythonResponse.ok`ならPython側で失敗しているため、`throw`で通常処理を止めて`catch`へ移動します。

`await pythonResponse.json()`は、Pythonから届いたJSONをTypeScriptで扱えるJavaScriptオブジェクトへ変換します。

最後に`Response.json({ analysis: analysisResult })`で、分析結果をフロントエンドへ中継します。

```text
フロント → TypeScriptのPOST
             ↓ Clerk認証
           fetch()
             ↓
           PythonのPOST /analyze
             ↓ JSON
           pythonResponse.json()
             ↓
           フロントへ返却
```

### 覚える単語

- `fetch()`：別のAPIへHTTP通信するJavaScriptの機能
- `response.ok`：HTTP通信が成功したかを表す値
- `.json()`：JSONをJavaScriptのデータへ変換する
- 中継：受け取った情報を別の相手へ渡すこと

### TypeScript側でもPythonのJSONを検品する

`type BodyAreaResult`と`type BodyAnalysisResult`は、Pythonから受け取る予定のJSON形式をTypeScriptへ教えます。

ただしTypeScriptの型は実行時に消えるため、外部APIから届いた実物を`isBodyAnalysisResult()`で検査します。

引数を`unknown`にすることで、検査前のデータを安全な型として扱いません。

戻り値の`value is BodyAnalysisResult`は型述語と呼び、関数が`true`を返した後は、TypeScriptがその値を`BodyAnalysisResult`として扱えます。

最初にJSON全体がオブジェクトであり、`null`ではないことを確認します。

`value as Partial<BodyAnalysisResult>`は、各項目が存在しない可能性を残した状態で一時的に分析結果型として扱う指定です。

`.every()`は、配列内のすべての要素が条件を満たした場合だけ`true`を返します。

今回の`areas.every()`では、全部位について部位名・優先度・観察・提案が文字列で、スコアが1〜10の整数か確認します。

`.some()`が「1件でも条件に合うか」なのに対し、`.every()`は「全件が条件に合うか」を確認します。

### 覚える単語

- 型述語：検査後の値の型をTypeScriptへ伝える`value is 型`の書き方
- `Partial<型>`：その型の全項目を一時的に任意項目として扱う
- `.every()`：配列の全要素が条件を満たすか確認する
- 実行時検査：アプリ動作中に実際の値を確認すること

`pythonResponse.json()`の直後に`isBodyAnalysisResult(analysisResult)`を実行し、Pythonの返却JSONを検品します。

先頭の`!`により、検査結果が`false`の場合に`throw`して処理を止めます。

この検査をNeon保存より前に置くことで、不完全な分析結果や想定外の値をDBへ残しません。

### 身体分析保存で使うDB機能

`eq`は、ログイン中のClerk IDとNeonの`users.clerkUserId`が一致する本人を検索するために使います。

`getDb`はNeonへ接続し、`bodyAnalyses`は分析全体、`bodyAnalysisAreas`は部位別結果の保存先として使います。

`users`は、Clerkの認証ユーザーをNeonの内部ユーザーIDへ変換するために使います。

### Python分析結果をNeonへ保存する

Clerk IDからNeonの`users.id`を探す部分は、トレーニング記録APIと同じ共通パターンです。

PythonのJSONを検品した後、`.insert(bodyAnalyses)`で分析全体を本人の親データとして保存します。

`status: "completed"`は分析成功、`analyzedAt: new Date()`は分析完了日時を表します。

`.returning({ id: bodyAnalyses.id })`で作成した分析IDを受け取り、部位別結果の`analysisId`へ使用します。

`analysisResult.areas.map()`は、Python形式の`body_part`などを、Drizzle形式の`bodyPart`などへ変換します。

部位が0件の場合は空配列を一括保存しないよう、`areas.length > 0`のときだけ保存します。

最後にHTTP 201、保存した`bodyAnalysisId`、検品済みの分析結果をフロントへ返します。

```text
Clerk ID → Neon users.id
                 ↓
        body_analysesへ親を保存
                 ↓ 作成したanalysis.id
        body_analysis_areasへ部位を保存
                 ↓
        IDと分析JSONをフロントへ返す
```

## トレーニング記録：実施種目の子テーブル

### どこに書くコードか

担当ファイルは`db/schema.ts`で、`trainingSessions`より下に書きます。

使用言語はTypeScriptで、Drizzleを使ってNeon PostgreSQLの`training_exercises`テーブルを定義しています。

### 何をする場所か

`trainingExercises`は、1回のトレーニングで実施した種目を保存します。

例えば1つの`trainingSessions`に、ベンチプレス、インクラインプレス、ケーブルフライの3件を結び付けられます。

### 親テーブルとの結び付き

```ts
sessionId: uuid("session_id")
  .notNull()
  .references(() => trainingSessions.id, {
    onDelete: "cascade",
  }),
```

`sessionId`には、どのトレーニングで実施した種目なのかを表す`trainingSessions.id`を保存します。

1件の親`trainingSessions`に対して、複数件の子`trainingExercises`を持てます。これを1対多の関係と呼びます。

親のトレーニング記録を削除した場合、`cascade`によって関連する実施種目も削除されます。

### 種目情報の意味

`exerciseId`は、フロントエンドの種目一覧にある種目を識別する固定IDです。

`exerciseName`は、「ベンチプレス」などの画面に表示する種目名です。

IDと名前を両方保存することで、種目一覧の名前が将来変更されても、過去に記録した当時の名前を残せます。

`bodyPart`は「胸」「背中」「肩」などの大きな部位を保存します。

`bodyArea`は「上部」「中部」「下部」などの細かい場所を任意で保存します。

`bodyArea`に`notNull()`がないため、細かい場所を持たない種目は空でも保存できます。

### 表示順の意味

```ts
displayOrder: integer("display_order")
  .notNull()
  .default(0),
```

`displayOrder`は、ユーザーが実施した種目を画面へ並べる順番です。

`default(0)`は、順番が渡されなかった場合に0を初期値として保存します。

### 覚える単語

- 親テーブル：全体を表すデータ
- 子テーブル：親に含まれる詳細データ
- 1対多：1件の親に複数件の子が結び付く関係
- `sessionId`：子から親を特定するためのID
- `default(0)`：未指定の場合に0を保存する

## トレーニング記録：重量・回数のセットテーブル

### どこに書くコードか

担当ファイルは`db/schema.ts`で、`trainingExercises`より下に書きます。

`trainingSets`はTypeScriptとDrizzleで定義し、Neon PostgreSQLでは`training_sets`テーブルになります。

### 何をする場所か

このテーブルは「ベンチプレスの1セット目・60kg・10回」のような、トレーニング記録の最小単位を保存します。

1件の`trainingExercises`に対して複数件の`trainingSets`を結び付けられます。

### 種目との結び付き

```ts
trainingExerciseId: uuid("training_exercise_id")
  .notNull()
  .references(() => trainingExercises.id, {
    onDelete: "cascade",
  }),
```

`trainingExerciseId`は、このセットがどの実施種目に属するかを表します。

例えば3セットすべてへ同じベンチプレスの`trainingExercises.id`を保存することで、3件を同じ種目としてまとめられます。

種目を削除した場合は、`cascade`によって関連するセットも一緒に削除されます。

### 各入力値の意味

`setNumber`は、1セット目、2セット目のような順番を整数で保存します。

`setNumber`には`notNull()`があるため必須です。

`weightKg`は重量をkg単位で保存し、`real()`を使うため12.5kgのような小数も扱えます。

`reps`は回数を整数で保存します。

`weightKg`と`reps`には`notNull()`がないため、自重種目や記録途中の場合は空でも保存できます。

`createdAt`は、このセットがデータベースへ登録された日時です。

### 3段階の関係

```text
trainingSessions（1回のトレーニング）
└─ trainingExercises（実施した種目）
   └─ trainingSets（各セットの重量・回数）
```

このようにデータを分けることで、種目数やセット数がユーザーごとに違っても柔軟に保存できます。

### 覚える単語

- `trainingExerciseId`：セットから実施種目を特定するID
- `setNumber`：セットの順番
- `real()`：小数を含む数値を保存する型
- 最小単位：これ以上分けずに1件として保存するデータ

## Drizzleのテーブル設計をNeonへ反映する

### 何をする作業か

`db/schema.ts`へ書いたTypeScriptはデータベースの設計図であり、書いただけではNeonにテーブルは作られません。

Drizzle Kitを使い、設計図と現在のNeonを比較して実際のテーブルを作ります。

### SQLファイルを生成する

```bash
npm run db:generate
```

このコマンドは`db/schema.ts`の変更を読み取り、`drizzle-postgres`へPostgreSQL用のSQLファイルを生成します。

今回は`0004_acoustic_metal_master.sql`が生成されました。

### 現在の設計を直接反映する

```bash
npx drizzle-kit push
```

`push`は、現在の`db/schema.ts`とNeonの状態を比較し、不足しているテーブルや列を直接反映します。

今回はマイグレーション履歴と実際のDB状態にずれがあったため、`migrate`ではなく`push`を使いました。

`[✓] Pulling schema from database...`は、DrizzleがNeonの現在の設計を読み込めたことを表します。

`[✓] Changes applied`は、必要な変更をNeonへ反映できたことを表します。

`@neondatabase/serverless can only connect... through a websocket`は、リモートDBへWebSocketで接続するという注意であり、今回のエラーではありません。

### コマンドを実行する場所

Drizzleの設定ファイルは`musslepas/drizzle.config.ts`にあるため、`mobile`ではなく`musslepas`直下で実行します。

```bash
cd /Users/yuuta/Desktop/musslepas
```

### 今回Neonに作成されたテーブル

- `training_sessions`：1回分のトレーニング
- `training_exercises`：その日に実施した種目
- `training_sets`：各セットの重量と回数

### 覚える単語

- スキーマ：データベースの構造を表す設計図
- SQL：PostgreSQLへテーブル作成などを指示する言語
- マイグレーション：DBの構造を安全に新しい形へ変更する作業
- `generate`：スキーマからSQLファイルを生成する
- `push`：現在のスキーマをDBへ直接反映する

## トレーニング記録保存API：受信JSONの型

### `schema.ts`と`route.ts`の違い

`db/schema.ts`は、データベースへ何をどの形で保存するかを決める設計図です。

例えば、トレーニング記録へ`id`、`userId`、実施日時、時間、調子、メモなどの列を用意すると定義します。

`app/api/training-records/route.ts`は、フロントエンドから通信を受け取り、認証・入力確認・DB保存・結果の返却を行う処理です。

```text
schema.ts = 記録用紙にどの項目を用意するか設計する
route.ts  = 記録用紙を受け取り、確認して保管する
```

今回の処理の流れは次のとおりです。

```text
フロントエンドからPOSTが届く
        ↓
route.tsがログインを確認する
        ↓
JSONを受け取って入力値を確認する
        ↓
schema.tsで定義したテーブルへ保存する
        ↓
route.tsが成功またはエラーをフロントへ返す
```

`schema.ts`だけでは、フロントエンドから通信を受け取れません。

`route.ts`だけでは、保存先のテーブル構造がないためデータを保存できません。

そのため、データベース機能には「保存場所を決めるschema」と「保存処理を行うroute」の両方が必要です。

### どこに書くコードか

担当ファイルは`app/api/training-records/route.ts`です。

このファイルはTypeScriptで書き、フロントエンドから届くトレーニング記録を受け取ってNeonへ保存するAPIになります。

### 今回何をしたか

まだデータベース保存は行わず、フロントエンドから受け取るJSONの形を3つの`type`で定義しました。

`type`は「このデータには、どの名前の値がどの型で入るか」をTypeScriptへ教える設計図です。

### `TrainingSetInput`

`TrainingSetInput`は1セット分の入力を表します。

`setNumber: number`はセット番号で、`?`がないため必須です。

`weightKg?: number | null`は重量で、数値・未指定・空欄を受け取れます。

`reps?: number | null`は回数で、数値・未指定・空欄を受け取れます。

### `TrainingExerciseInput`

`TrainingExerciseInput`は、ベンチプレスなど1種目分の入力を表します。

`exerciseId`は種目一覧の固定ID、`exerciseName`は画面に表示する種目名です。

`bodyPart`は胸や背中などの部位、`bodyArea`は上部や下部などの細かい場所です。

`sets: TrainingSetInput[]`は、その種目に含まれる複数セットを配列で受け取ります。

### `CreateTrainingRecordInput`

`CreateTrainingRecordInput`は、1回分のトレーニング全体を表します。

`performedAt`は実施日時、`durationMinutes`は時間、`conditionScore`は調子、`memo`はメモです。

`exercises: TrainingExerciseInput[]`は、1回のトレーニングに含まれる複数種目を受け取ります。

### `?`と`null`の違い

`?`は、そのプロパティ自体がJSONになくてもよいことを表します。

`null`は、プロパティはあるが入力値が空であることを表します。

```ts
weightKg?: number | null;
```

この形では、重量として数値、プロパティなし、`null`の3種類を受け取れます。

### 覚える単語

- `type`：データの形を定義するTypeScriptの文法
- `string`：文字列
- `number`：数値
- `?`：省略可能なプロパティ
- `null`：値が空であることを明示する値
- `[]`：複数の値を並べる配列
- JSON：フロントエンドとバックエンド間でデータを渡す形式

### トレーニング記録APIのimport

`import`は、別ファイルやライブラリにある機能を現在の`route.ts`で使えるようにするTypeScriptの文法です。

`import { eq } from "drizzle-orm"`は、データベースの列と値が等しいかを比較する`eq()`を読み込みます。

`desc()`は、日時や数値を大きいものから小さいものへ降順で並べます。トレーニング履歴では、最新の実施日時を先頭に表示するために使います。

例えば`eq(users.clerkUserId, clerkUserId)`は、DBのClerkユーザーIDとログイン中のIDが同じユーザーを検索します。

`getClerkUserId`は、フロントエンドから届いたClerkトークンを確認し、ログイン中のユーザーIDを取得します。

`getDb`は、APIからNeon PostgreSQLを操作するための共通接続を取得します。

`trainingSessions`は1回分全体、`trainingExercises`は実施種目、`trainingSets`は各セットの保存に使います。

`users`は、Clerkでログインしている人に対応するNeonユーザーを検索するために使います。

波括弧を使った`import { A, B }`は、同じファイルから必要な機能だけを複数読み込む書き方です。

### 数値を保存前に確認する共通関数

フロントエンドから届く値は改ざんや入力ミスの可能性があるため、TypeScriptの型だけを信用せず、APIでも実際の値を確認します。

`isOptionalNumberInRange`は、重量など小数を許可する数値に使います。

`value: unknown`の`unknown`は、受け取った時点では型を信用していないことを表します。

`value === undefined`はプロパティが送信されなかった場合、`value === null`は空欄として送信された場合を許可します。

`typeof value === "number"`は、文字列の`"60"`ではなく数値の`60`であることを確認します。

`Number.isFinite(value)`は、通常の数値ではない`NaN`や`Infinity`を除外します。

`value >= minimum && value <= maximum`は、値が最小値以上かつ最大値以下であることを確認します。

`isOptionalIntegerInRange`は、回数・セット番号・時間・調子など整数だけを許可する値に使います。

`Number.isInteger(value)`は、`10`なら`true`、`10.5`なら`false`を返します。

重量には12.5kgのような小数があるため`isOptionalNumberInRange`を使い、回数には10.5回を保存しないため`isOptionalIntegerInRange`を使います。

`return`の中で使う`||`は「どれか1つが正しい」、`&&`は「すべて正しい」という意味です。

### 覚える単語

- バリデーション：保存前に入力値が正しいか確認する処理
- `unknown`：まだ型を信用していない値
- `Number.isFinite()`：通常の有限な数値か確認する
- `Number.isInteger()`：整数か確認する
- `||`：または
- `&&`：かつ

### トレーニング全体の入力チェック

`Array.isArray(input.exercises)`は、`exercises`が本当に配列か確認します。

先頭の`!`は結果を反対にするため、`!Array.isArray(...)`は「配列ではない」という意味です。

`input.exercises.length === 0`は、配列の中に種目が1件もない状態を表します。

`durationMinutes`は1〜300分、`conditionScore`は1〜10だけを許可します。どちらも任意入力なので、`undefined`と`null`も許可されます。

メモは、未送信と空欄を許可し、値がある場合だけ文字列かつ1000文字以内か確認します。

複数のエラー条件を`||`でつないでいるため、どれか1つでも問題があれば処理を止めます。

`Response.json(..., { status: 400 })`は、フロントエンドへ「通信は届いたが、送信内容が正しくない」と返します。

この確認をDB保存より前に置くことで、不正な値をNeonへ保存しません。

コードの字下げは処理結果を変えませんが、どの括弧に含まれるコードか見やすくするために使います。最後にフォーマッターで整えられます。

### `some()`で不正な種目を探す

`input.exercises.some(...)`は、種目配列を先頭から確認し、条件に当てはまる種目が1件でもあれば`true`を返します。

今回は条件の中へ「不正な状態」を並べているため、変数名を`hasInvalidExercise`（不正な種目がある）にしています。

`(exercise) =>`の`exercise`には、確認中の種目が1件ずつ順番に入ります。

`typeof exercise.exerciseName !== "string"`は、種目名が文字列ではない場合を検出します。

`exercise.exerciseName.trim() === ""`は、前後の空白を取り除いた結果が空文字か確認します。空白だけの名前も保存しません。

`Number.isInteger(exercise.displayOrder)`は、表示順が整数か確認します。

`exercise.displayOrder < 0`は、表示順がマイナスになっていないか確認します。

`Array.isArray(exercise.sets)`はセット一覧が配列か、`exercise.sets.length === 0`はセットが0件ではないかを確認します。

`hasInvalidExercise`が`true`なら、HTTP 400を返してDB保存へ進みません。

この処理は`input`を作った`try`の中、全体チェックより下、成功レスポンスより上へ置きます。`catch`はエラー発生後の処理なので、通常の入力チェックは置きません。

### 覚える単語

- `.some()`：配列内に条件を満たす要素が1件でもあるか調べる
- `.trim()`：文字列の前後にある空白を取り除く
- `""`：文字が1つもない空文字
- スコープ：変数を使用できる範囲

### 二重の`some()`で全種目の全セットを確認する

トレーニングのJSONは「種目の配列」の中に「セットの配列」が入る入れ子構造です。

外側の`input.exercises.some()`は、ベンチプレスなどの種目を1件ずつ確認します。

内側の`exercise.sets.some()`は、現在確認している種目のセットを1件ずつ確認します。

`set`には、1セット目・60kg・10回のようなセットデータが1件ずつ入ります。

`!Number.isInteger(set.setNumber) || set.setNumber < 1`は、セット番号が整数ではない場合と、1未満の場合を不正と判断します。

重量は小数を許可して0〜1000kg、回数は整数だけを許可して0〜1000回にしています。

内側の`some()`が不正なセットを1件見つけると`true`になり、外側の`some()`も`true`になります。

その結果を`hasInvalidSet`へ保存し、`true`ならHTTP 400を返します。

```text
全種目を確認
└─ 現在の種目の全セットを確認
   └─ 不正なセットを1件でも発見 → 保存を中止
```

### 覚える単語

- 入れ子：データや処理の中に別のデータや処理が入っている構造
- 外側の配列：今回の場合は種目一覧
- 内側の配列：今回の場合は各種目のセット一覧

### ClerkユーザーをNeonユーザーへ変換する検索

ClerkのユーザーIDは認証サービス側のIDで、トレーニング記録の外部キーにはNeonの`users.id`を使用します。

そのため、保存前に`users.clerkUserId`とログイン中の`clerkUserId`が一致するユーザーを検索します。

`const db = getDb()`は、Neonを操作するDrizzleの接続を取得します。

`.select({ id: users.id })`は、ユーザー情報すべてではなく、今回必要な`id`だけを取得します。

`.from(users)`は、検索対象を`users`テーブルに指定します。

`.where(eq(users.clerkUserId, clerkUserId))`は、DBに保存されたClerk IDとログイン中のClerk IDが等しい行だけに絞ります。

`.limit(1)`は、検索結果を最大1件に制限します。Clerk IDはユーザーごとに一意なので1件だけで十分です。

Drizzleの検索結果は配列で返るため、`matchedUsers[0]`で先頭のユーザーを取り出します。

`matchedUsers[0] ?? null`は、先頭のデータが存在すればそのデータ、存在しなければ`null`に統一します。

`if (!user)`はユーザーが見つからなかった場合で、HTTP 404を返して保存を中止します。

```text
Clerkのuser ID
      ↓ users.clerkUserIdと比較
Neonのusers.idを取得
      ↓
本人のトレーニング記録へ保存
```

### 覚える単語

- `.select()`：取得する列を指定する
- `.from()`：検索するテーブルを指定する
- `.where()`：検索条件を指定する
- `eq()`：2つの値が等しいか比較する
- `.limit(1)`：取得件数を最大1件にする
- `404`：対象のデータが見つからないことを表すHTTPステータス

### 実施日時を`Date`へ変換する

JSONから届く日時は文字列なので、PostgreSQLの`timestamp`へ保存する前にJavaScriptの`Date`へ変換します。

`input.performedAt === undefined ? new Date() : ...`は三項演算子です。

三項演算子は`条件 ? 条件が正しい場合 : 条件が違う場合`の順番で読みます。

日時が送信されなかった場合は、`new Date()`で現在日時を作ります。

日時が文字列なら、`new Date(input.performedAt)`で日時データへ変換します。

文字列でもなく未指定でもない場合は、異常な値として`null`にします。

`performedAt.getTime()`は日時をミリ秒の数値へ変換します。不正な日時の場合は`NaN`になります。

`Number.isNaN()`で`NaN`か確認し、不正な日時ならHTTP 400を返します。

### 覚える単語

- `Date`：JavaScriptで日時を扱うオブジェクト
- `new Date()`：現在日時を作る
- 三項演算子：条件によって2つの値から1つを選ぶ書き方
- `.getTime()`：日時をミリ秒の数値に変換する
- `NaN`：正しい数値へ変換できなかった状態
- `Number.isNaN()`：値が`NaN`か確認する

### `training_sessions`へ親記録を保存する

`db.insert(trainingSessions)`は、保存先を`training_sessions`テーブルに指定します。

`.values({...})`の波括弧内には、各列へ保存する値を書きます。

`userId: user.id`によって、ログイン中の本人とトレーニング記録を結び付けます。

`input.durationMinutes ?? null`は、左側が`undefined`または`null`なら右側の`null`を使用します。

`??`はNull合体演算子と呼び、未入力値を統一するときに使います。数値の`0`はそのまま残ります。

`input.memo?.trim()`の`?.`はオプショナルチェーンです。メモが存在するときだけ`trim()`を実行し、未入力ならエラーにせず`undefined`を返します。

`input.memo?.trim() || null`は、メモが未入力または空文字なら`null`を保存します。

`.returning({ id: trainingSessions.id })`は、保存して作られた親記録のIDだけを返すようPostgreSQLへ指示します。

Drizzleの`returning()`も配列で返るため、`createdSessions[0] ?? null`で先頭を取り出します。

作成結果がなければ`throw new Error()`で処理を中断し、外側の`catch`へ移動します。

取得した`session.id`は、次に実施種目を親トレーニングへ結び付けるために使用します。

### 覚える単語

- `.insert()`：データの保存先テーブルを指定する
- `.values()`：保存する値を指定する
- `.returning()`：保存後にDBから値を返してもらう
- `??`：左側が`undefined`か`null`なら右側を使う
- `?.`：値が存在する場合だけ後ろの処理を行う
- `throw`：エラーを発生させて通常処理を中断する

### `for...of`で複数種目を保存する

`for (const exercise of input.exercises)`は、`input.exercises`の種目を1件ずつ`exercise`へ入れて処理を繰り返します。

例えば3種目ある場合、波括弧内の保存処理が3回実行されます。

`await`をループ内で使うことで、現在の種目保存が完了してから次の種目へ進みます。

`sessionId: session.id`は、保存中の全種目を先ほど作った同じ親トレーニングへ結び付けます。

種目ID・種目名・部位には`trim()`を使い、前後の不要な空白を取り除いて保存します。

`bodyArea`は任意入力なので、空文字の場合は`null`へ統一します。

`.returning({ id: trainingExercises.id })`で作成された実施種目のIDを受け取ります。

この`createdExercise.id`を使い、次にその種目のセットを`training_sets`へ結び付けます。

```text
session.id
  └─ 種目を保存 → createdExercise.id
                      └─ 次にセットを保存
```

### 覚える単語

- `for...of`：配列の要素を1件ずつ取り出して繰り返す
- ループ：同じ処理を繰り返す仕組み
- `const exercise`：現在処理している1種目を入れる変数

### `.map()`でセットをDB保存用の形へ変換する

`exercise.sets.map((set) => ({ ... }))`は、現在の種目に含まれる各セットを、DBへ保存するオブジェクトへ変換します。

`.map()`は元の配列を1件ずつ処理し、同じ件数の新しい配列を作るメソッドです。

`set`には、現在変換している1セット分のデータが入ります。

丸括弧で囲んだ`({ ... })`は、アロー関数からオブジェクトをそのまま返す書き方です。

`trainingExerciseId: createdExercise.id`を全セットへ入れることで、作成した実施種目と各セットを結び付けます。

`setNumber`はセット番号、`weightKg`は重量、`reps`は回数として保存します。

重量と回数は任意入力なので、`?? null`で未入力値を`null`へ統一します。

`.values()`へオブジェクトの配列を渡すと、複数セットを1回のDB通信でまとめて保存できます。

```text
元のセット配列
[1セット目, 2セット目, 3セット目]
          ↓ map()
DB保存用配列
[{...}, {...}, {...}]
          ↓ insert().values()
3セットをまとめて保存
```

### 覚える単語

- `.map()`：配列の各要素を変換して新しい配列を作る
- アロー関数：`(値) => 処理`の形で書く関数
- オブジェクト：名前と値を組み合わせたデータ
- 一括保存：複数件を1回のDB通信で保存すること

### トレーニング記録APIの成功レスポンス

すべての保存が完了すると、`trainingSessionId: session.id`をフロントエンドへ返します。

HTTPステータス`201`は、新しいデータの作成に成功したことを表します。

受信した`input`全体は返さず、フロントエンドが保存完了を確認するために必要な親記録IDだけを返します。

### 認証なしのAPI動作確認

認証トークンを付けずに`POST /api/training-records`を呼ぶと、HTTP 401と`ログインが必要です`が返ることを確認しました。

これはAPIに接続できており、未ログインの人がトレーニング記録を保存できないよう認証処理が機能している状態です。

## トレーニング履歴取得API

### `GET()`の役割

同じ`app/api/training-records/route.ts`に`GET()`を書くと、`GET /api/training-records`で本人の履歴を取得できます。

`POST()`は新しい記録の保存、`GET()`は保存済み記録の取得を担当します。

どちらも最初に`getClerkUserId(request)`を実行し、本人のデータだけを扱います。

### 本人の履歴を検索する

`.innerJoin(users, eq(trainingSessions.userId, users.id))`は、トレーニング記録とユーザーを共通のIDで結び付けます。

その後、`.where(eq(users.clerkUserId, clerkUserId))`でログイン中のClerkユーザーに属する記録だけへ絞ります。

`.orderBy(desc(trainingSessions.performedAt))`は実施日時を新しい順に並べます。

`.limit(50)`は1回の取得を最大50件に制限し、データが増えた場合の通信量を抑えます。

### 各履歴に種目を追加する

`sessions.map(async (session) => {...})`は、各トレーニング履歴を1件ずつ処理し、それぞれに属する種目を検索します。

`async`を付ける理由は、関数内でDB検索の`await`を使うためです。

非同期の`map()`が返すものは、完成データではなくPromiseの配列です。

`Promise.all(...)`は、配列内にあるすべてのPromiseが完了するまで待ち、完成したデータの配列を返します。

`...session`はスプレッド構文で、元の履歴が持つID・日時・時間・調子・メモを新しいオブジェクトへ展開します。

その後に`exercises`を書くことで、元の履歴情報へ種目一覧を追加します。

```text
session
{ id, performedAt, memo }
        ↓ ...session と exercises
record
{ id, performedAt, memo, exercises }
```

最後は`records: sessions`ではなく`records`を返します。`sessions`は種目追加前、`records`は種目追加後だからです。

### 覚える単語

- `GET`：データを取得するHTTP通信
- `innerJoin()`：共通する値で2つのテーブルを結ぶ
- `desc()`：大きい順・新しい順に並べる
- `Promise`：まだ完了していない非同期処理の結果
- `Promise.all()`：複数の非同期処理がすべて終わるまで待つ
- スプレッド構文`...`：オブジェクトや配列の中身を展開する

### HTTPメソッドの基本

`GET`は、Neonに保存されている情報を取得し、バックエンドからフロントエンドへ渡します。

`POST`は、フロントエンドから新しい情報を受け取り、バックエンドがNeonへ保存します。

`PATCH`は、すでに保存されている情報の一部を変更します。

`DELETE`は、保存済みの情報を削除します。

```text
GET    : Neon → バックエンド → フロント
POST   : フロント → バックエンド → Neonへ新規保存
PATCH  : フロント → バックエンド → Neonの既存データを変更
DELETE : フロント → バックエンド → Neonの既存データを削除
```

GETでもフロントからClerkトークンを受け取り、誰のデータを取得するか判断します。

### 各種目へセット一覧を追加する

種目を取得した後、`exercises.map(async (exercise) => {...})`で種目を1件ずつ処理します。

現在の`exercise.id`と`trainingSets.trainingExerciseId`が一致するセットだけを`.where(eq(...))`で取得します。

`.orderBy(trainingSets.setNumber)`は、セットを1セット目、2セット目、3セット目の順に並べます。

`return { ...exercise, sets }`は、種目ID・種目名・部位などの情報へセット一覧を追加します。

完成したセット付き種目の配列を`exercisesWithSets`へ保存します。

最後に`return { ...session, exercises: exercisesWithSets }`で、トレーニング全体へセット付きの種目一覧を追加します。

```text
トレーニング全体
└─ 種目一覧
   ├─ 種目1
   │  └─ セット一覧
   └─ 種目2
      └─ セット一覧
```

外側の`Promise.all()`は全トレーニングの処理完了を待ち、内側の`Promise.all()`は現在のトレーニングに含まれる全種目の処理完了を待ちます。

## Python身体分析からOpenAIを使う準備

### 使用するライブラリ

`openai`は、PythonからOpenAI APIへ画像を送り、分析結果を受け取る公式ライブラリです。

`python-dotenv`は、秘密情報をコードへ直接書かず、`.env.local`から`OPENAI_API_KEY`を読み込むために使います。

Pythonを使う理由は、`Pillow`による画像検査や、将来のOpenCV・独自AIモデルなど、画像処理向けの機能を追加しやすいからです。

### `.env.local`の読み込み

`Path(__file__)`は、現在実行している`main.py`の場所を表します。

`.resolve()`は、その場所を省略のない絶対パスへ変換します。

`.parents[2]`は、`python-analysis/app/main.py`からプロジェクト直下の`musslepas`まで戻ります。

`/ ".env.local"`は、戻った場所へ`.env.local`というファイル名をつなげます。

`load_dotenv(ENV_FILE_PATH)`は、`.env.local`内の環境変数をPythonから利用できる状態にします。

`openai_client = OpenAI()`は、読み込んだ`OPENAI_API_KEY`を使うOpenAI APIの受付窓口を作ります。この行だけではAPI通信を行わないため、まだ分析料金は発生しません。

### 画像をBase64データURLへ変換する

`image_to_data_url(image)`は、検査済み画像をOpenAIへ直接送れる文字列へ変換する関数です。

`await image.read()`は、アップロード画像の中身をバイトデータとして読み込みます。

`await image.seek(0)`は、読み取り位置を先頭へ戻し、後続処理でも同じ画像を読めるようにします。

`base64.b64encode(image_bytes)`は、画像のバイトデータをBase64形式へ変換します。

`.decode("utf-8")`は、変換結果をPythonの文字列として扱えるようにします。

`f"data:{image.content_type};base64,..."`は、画像形式とBase64本体を組み合わせ、OpenAIが画像として認識できるデータURLを作ります。

`front_image_url`、`side_image_url`、`back_image_url`には、正面・横・背面をそれぞれ変換した結果が入ります。この段階では変換のみで、まだOpenAI APIへの送信は行いません。

```text
UploadFile
   ↓ read()
画像のバイトデータ
   ↓ base64.b64encode()
Base64文字列
   ↓ data:画像形式;base64, を追加
OpenAIへ渡せる画像データURL
```

### 覚える単語

- `Path`：ファイルやフォルダの場所を安全に扱うPythonの機能
- 環境変数：APIキーなど、コードから分けて管理する設定値
- APIクライアント：外部APIへリクエストを送るための窓口
- `Base64`：画像などのバイナリデータを文字列で表現する形式
- データURL：ファイル内容とファイル形式を1本の文字列にまとめた形式

## 身体分析を1ユーザー1日1回に制限する

### なぜTypeScriptバックエンドで判定するのか

`app/api/body-analysis/route.ts`はClerk認証後のユーザーIDを取得できるため、誰が分析しようとしているかを判定できます。

PythonやOpenAIへ画像を送る前にNeonを確認すれば、当日2回目のリクエストでOpenAI料金が発生するのを防げます。

現在のルールは、日本時間の0時から翌日の0時までを同じ1日として扱います。

### 日本時間の範囲を作る

`japanTimeOffsetMilliseconds`は、日本時間がUTCより9時間進んでいることをミリ秒で表します。

`getJapanDayRange(now)`は、現在日時を受け取り、日本時間の今日0時を表す`start`と翌日0時を表す`end`を返します。

Neonの`timestamp with time zone`は世界共通の時刻として比較するため、日本時間の境界をUTCの`Date`へ変換してから検索します。

### 今日の完了済み分析を検索する

`and(...)`は、中に書いたすべての条件を満たす分析だけを探します。

`eq(bodyAnalyses.userId, user.id)`は、ログイン中の本人の分析だけへ絞ります。

`eq(bodyAnalyses.status, "completed")`は、正常に完了した分析だけを1回として数えます。

`gte(bodyAnalyses.analyzedAt, start)`は、今日の0時以降という条件です。

`lt(bodyAnalyses.analyzedAt, end)`は、翌日の0時より前という条件です。

`.limit(1)`は、分析済みか判断するには1件見つかれば十分なので、取得量を抑えます。

### 2回目を止める

`todayAnalyses.length > 0`は、今日すでに完了した分析が1件以上あることを表します。

その場合はHTTP 429とエラーメッセージを返し、画像読込・Python・OpenAIの処理へ進みません。

`nextAvailableAt`は、次に分析できる日本時間の翌日0時をUTC形式でフロントへ伝えます。

`Retry-After`ヘッダーは、次に試せるまでの秒数を通信上の情報として返します。

```text
Clerkで本人確認
   ↓
Neonで今日の完了済み分析を検索
   ├─ あり → HTTP 429で終了
   └─ なし → 画像検査 → Python → OpenAI
```

### 覚える単語

- `gte`：greater than or equalの略で、指定値以上
- `lt`：less thanの略で、指定値より小さい
- HTTP 429：利用回数が制限を超えたことを示すステータス
- `Retry-After`：次に再試行できるまでの時間を示すレスポンスヘッダー

## OpenAIによる実際の身体画像分析

### OpenAIへ画像3枚を送る

`openai_client = AsyncOpenAI()`は、OpenAI APIとの通信を行う非同期クライアントです。

同期版ではなく`AsyncOpenAI`を使う理由は、OpenAIの返答を待っている間もFastAPIがほかの処理を扱えるようにするためです。

`await openai_client.responses.parse(...)`が、実際にOpenAIへ画像分析を依頼する中心処理です。この処理が実行された時点でAPI利用が発生します。

`model="gpt-5.6"`は、画像を理解できるOpenAIモデルを指定しています。

`instructions=BODY_ANALYSIS_INSTRUCTIONS`は、身体分析の目的、評価方法、医療診断をしないことなどのルールをAIへ渡します。

`input`の`content`には、正面・横・背面の説明と、それぞれのBase64データURLを順番に入れます。

`type: "input_text"`は、次の画像がどの方向から撮影されたものかを説明する文章です。

`type: "input_image"`は、OpenAIへ画像入力を渡す項目です。

`detail: "low"`は、最初の運用で画像処理コストを抑える設定です。筋肉の細部が不足する場合は、費用とのバランスを確認して`high`へ変更します。

`text_format=BodyAnalysisResponse`は、自由な文章ではなく、`summary`、`goal_difference`、`areas`を持つ決まった形式で結果を返すよう指定します。

`store=False`は、APIレスポンスを後から取得する用途でOpenAI側に保存しない設定です。

### 分析結果を安全に返す

`response.output_parsed`には、`BodyAnalysisResponse`の形として検査された分析結果が入ります。

`output_parsed is None`は、AIから決まった形式の結果を取得できなかった状態です。その場合はHTTP 502として処理を止めます。

正常な場合は`return response.output_parsed`で、PythonからTypeScriptバックエンドへ分析結果JSONを返します。

```text
検査済み画像3枚
   ↓ Base64データURL
OpenAI Responses API
   ↓ BodyAnalysisResponseで形式を指定
Pydantic検査済みJSON
   ↓
TypeScriptバックエンド
```

### 実通信テスト

2026年8月13日に、個人の身体写真ではなくプロジェクト内の生成済み体型画像3枚を使って実通信を1回確認しました。

Pythonの`POST /analyze`はHTTP 200を返し、要約・理想体型との差・部位別評価が`BodyAnalysisResponse`形式で返りました。

テスト画像は本当の正面・横・背面の組み合わせではなかったため、AIは横面・背面を確認できないことを結果内に明記しました。これは、不足している画像情報を勝手に断定しないルールが機能していることを示します。

### スマホからNeon保存までの通し確認

2026年8月13日に、スマホ版の身体分析画面から生成済み画像3枚を選択し、TypeScript、Python、OpenAI、Neon、スマホ表示までを通して確認しました。

以前の仮結果は削除せず、`status`を`mock`へ変更してテスト記録として残しました。1日1回判定は`completed`だけを数えるため、本物の分析を新しく1件実行できました。

新しい分析はNeonの`body_analyses`へ`completed`として保存され、分析IDは`dab3a674-3d1d-41cf-b00c-06b35f84376d`です。

部位別結果も`body_analysis_areas`へ6件保存され、スマホ画面に要約・理想体型との差・各部位のスコア・観察結果・おすすめが表示されました。

身体写真そのものはNeonへ保存しておらず、OpenAIが返した構造化分析結果だけを保存しています。

```text
スマホで画像3枚を選択
   ↓ Clerkトークン付きPOST
TypeScriptバックエンド
   ↓ 1日1回判定・画像検査
Python FastAPI
   ↓ 画像検査・OpenAI分析
構造化された分析JSON
   ↓
TypeScriptで形式確認
   ↓
Neonへ分析全体と部位別結果を保存
   ↓
スマホへ表示
```

## 身体分析用に本人の理想体型と身体情報を取得する

### 使用するテーブル

理想体型は`users.goalBodyType`、身長・体重・体脂肪率は`user_profiles`に保存されています。

身体分析APIでは既存のClerk本人確認後に、同じ本人の2テーブルを結合して必要な項目だけ取得します。新しいログイン処理を作っているのではありません。

### `userProfiles`をimportする理由

`userProfiles`を`@/db/schema`からimportすると、身体分析の`route.ts`からプロフィールテーブルの列を指定できます。

### `.select({...})`の役割

`id: users.id`は、分析結果を本人へ結び付けて保存するNeon内のユーザーIDです。

`goalBodyType: users.goalBodyType`は、細マッチョ・逆三角形・フィジーク・バルクアップなどの目標です。

`heightCm`、`weightKg`、`bodyFatPercentage`は、身体画像だけでは分からない本人の入力情報です。

### `leftJoin()`の役割

`.leftJoin(userProfiles, eq(userProfiles.userId, users.id))`は、`users.id`と`user_profiles.user_id`が同じデータを1件へまとめます。

`leftJoin`を使うと、プロフィールがまだ存在しない場合でもユーザー自体は取得できます。その後の処理で「プロフィールが未登録です」という分かりやすいエラーを返せます。

```text
users
・id
・goalBodyType
       ＋ user_idで結合
user_profiles
・heightCm
・weightKg
・bodyFatPercentage
       ↓
身体分析に必要な本人情報
```

### 覚える単語

- `leftJoin()`：左側のデータを残したまま、共通IDを持つ別テーブルを結合する
- 別名指定：`heightCm: userProfiles.heightCm`のように、取得結果の名前とDB列を対応させる書き方
- 必要な列だけ取得：通信量と扱う個人情報を必要最小限にする考え方

### AI分析前の必須確認

`user.goalBodyType === null`、`user.heightCm === null`、`user.weightKg === null`は、AI分析に必要な本人情報が未設定か確認します。

条件を`||`でつなぐと、3項目のうち1つでも不足している場合にHTTP 400を返し、Python・OpenAIを呼びません。

体脂肪率は任意入力なので必須確認には含めません。

### 画像と本人情報を同じFormDataへ入れる

`pythonFormData`には正面・横・背面画像だけでなく、理想体型・身長・体重・任意の体脂肪率も追加します。

`FormData.append("goal_body_type", user.goalBodyType)`は、Pythonが`goal_body_type`という名前で理想体型を取り出せるようにします。

`FormData`へ画像以外の数値を入れる場合は、`String(user.heightCm)`のように文字列へ変換します。

体脂肪率は`!== null`で登録済みか確認し、登録されている場合だけ追加します。未入力時に空文字を送らないためです。

```text
pythonFormData
├─ front_image
├─ side_image
├─ back_image
├─ goal_body_type
├─ height_cm
├─ weight_kg
└─ body_fat_percentage（任意）
```

### 覚える単語

- `FormData`：画像と文字列を同じHTTPリクエストで送る形式
- `String()`：数値などを文字列へ変換するJavaScriptの関数
- `!== null`：値が未設定の`null`ではないことを確認する比較

## Pythonで理想体型と身体情報を受け取る

### `File`と`Form`の違い

FastAPIの`File(...)`は、正面・横・背面の画像ファイルを受け取ります。

`Form(...)`は、同じ`FormData`に入っている理想体型・身長・体重などの文字列を受け取ります。

TypeScript側では数値を`String()`で送っていますが、Python側で型を`float`にするとFastAPIが数値へ自動変換します。

### 引数の型と制限

`goal_body_type: str`は理想体型を文字列として受け取ります。

`height_cm: float`と`weight_kg: float`は身長・体重を小数として受け取ります。

`body_fat_percentage: float | None`は、体脂肪率が数値または未入力の`None`であることを表します。

`Form(...)`内の`...`は必須項目です。`Form(None)`は未入力を許可します。

`ge`は指定数値以上、`le`は指定数値以下だけを許可します。

FastAPIが型変換や範囲確認に失敗した場合はHTTP 422を返し、画像検査やOpenAI分析へ進みません。

### 覚える単語

- `Form()`：multipart/form-data内の画像以外の項目を受け取るFastAPIの機能
- `float`：小数を扱うPythonの数値型
- `None`：Pythonで値がない状態
- `ge`：greater than or equalの略で、指定値以上
- `le`：less than or equalの略で、指定値以下

## PythonでAIへ渡すユーザー情報を文章にまとめる

対象ファイルは`python-analysis/app/main.py`です。

この部分は、TypeScriptバックエンドから受け取った理想体型・身長・体重・体脂肪率を、OpenAIが理解しやすい1つの文章へまとめます。

### 任意の体脂肪率を表示用の文字列にする

```python
body_fat_text = (
    f"{body_fat_percentage}%"
    if body_fat_percentage is not None
    else "未入力"
)
```

`body_fat_text = (`は、AIへ渡す体脂肪率の文章を`body_fat_text`へ保存します。

`f"{body_fat_percentage}%"`は、数値の後ろへ`%`を付けた文字列を作ります。

`if body_fat_percentage is not None`は、体脂肪率が入力されているか確認します。

`else "未入力"`は、体脂肪率が任意項目で未入力だった場合に`未入力`という文章を使います。

この書き方は、`条件が成立した場合の値 if 条件 else 成立しない場合の値`というPythonの条件式です。

### 身体情報を1つの文章へまとめる

```python
user_body_context = (
    "今回分析するユーザー情報です。\n"
    f"理想体型: {goal_body_type}\n"
    f"身長: {height_cm}cm\n"
    f"体重: {weight_kg}kg\n"
    f"体脂肪率: {body_fat_text}\n"
    "画像とこの情報を比較して、"
    "理想体型との差を説明してください。"
)
```

`user_body_context = (`は、ユーザーごとに内容が変わる身体情報を1つの変数へ保存します。

`f"理想体型: {goal_body_type}\n"`は、`{}`の位置へ実際の理想体型を入れます。

身長・体重・体脂肪率も同じ方法で実際の値を文章へ入れます。

`\n`は改行を表し、各情報を別の行にしてAIが読み取りやすい形にします。

丸括弧の中で文字列を続けて書くと、Pythonがそれらを自動的に1つの文字列としてつなぎます。

最後の2行は、画像だけを見るのではなく、設定済みの理想体型と比較する目的をAIへ伝えます。

### `instructions`と`input`の役割の違い

分析方法や出力時の禁止事項など、全ユーザーで共通する固定ルールは`instructions`へ書きます。

理想体型・身長・体重など、分析するたびに変わる本人情報は`input`の`content`へ入れます。

```text
instructions
└─ 全ユーザー共通の分析ルール

input.content
├─ user_body_context（本人の目標・身体情報）
├─ 正面画像
├─ 横画像
└─ 背面画像
```

OpenAIの画像入力では、1つの`content`配列へ`input_text`と複数の`input_image`を並べられます。

そのため、身体情報の文章と3枚の画像を同じリクエストに入れると、AIが同じ分析対象の情報として比較できます。

### `user_body_context`をOpenAIへ実際に渡す部分

```python
{
    "type": "input_text",
    "text": user_body_context,
},
```

この辞書は、`responses.parse()`の`input`にある`content`配列の先頭へ入れます。

`"type": "input_text"`は、この項目が画像ではなく文章であることをOpenAIへ伝えます。

`"text": user_body_context`は、理想体型・身長・体重・体脂肪率をまとめた文章を実際の入力として指定します。

この後ろへ正面・横・背面の`input_image`が続くため、身体情報と3枚の画像が1回のOpenAI APIリクエストで送信されます。

ここでデータをNeonへ保存しているわけではありません。PythonからOpenAIへ分析材料を送っている部分です。

OpenAIから返った分析結果は、後続のTypeScriptバックエンドが受け取り、本人の分析結果としてNeonへ保存します。

```text
Python
├─ user_body_context
├─ 正面画像
├─ 横画像
└─ 背面画像
        ↓ 1回のAPIリクエスト
OpenAI
        ↓ 構造化された分析結果
Python → TypeScriptバックエンド → Neon → フロントエンド
```

### 覚える単語

- `f"..."`：変数の値を`{}`へ埋め込めるPythonの文字列
- `is not None`：値が未入力の`None`ではないことを確認する
- Pythonの条件式：条件によって保存する値を1行で切り替える書き方
- `\n`：文字列内の改行
- `instructions`：AIが常に守る固定ルール
- `input`：今回のリクエストでAIへ渡す内容
- `input_text`：OpenAIへ文章を渡す入力形式
- `input_image`：OpenAIへ画像を渡す入力形式

## 理想体型を含めた身体分析の動作確認

### 確認した処理の流れ

```text
Neon
├─ 理想体型：細マッチョ
├─ 身長：175cm
└─ 体重：70kg
        ↓ TypeScriptバックエンドが取得
FormData
├─ goal_body_type
├─ height_cm
├─ weight_kg
├─ front_image
├─ side_image
└─ back_image
        ↓
Python FastAPI
        ↓ user_body_contextと画像3枚
OpenAI
        ↓ 決められたJSON形式
Python → TypeScript → Neon保存 → 画面表示
```

生成した架空人物の正面・横・背面画像を使い、通信全体を確認しました。

分析結果には`理想の「細マッチョ」と比べると`という比較が入り、`goal_body_type`がOpenAIまで届いていることを確認できました。

結果画面への表示と`body_analyses`・`body_analysis_areas`への保存も成功しました。

身体写真そのものはNeonへ保存せず、分析結果の文章と部位別評価だけを保存しています。

### Pythonサーバーを再起動する理由

`main.py`を変更しても、以前から動いているPythonプロセスが古いコードを読み込んだままの場合があります。

その状態では新しく追加した`Form()`や`user_body_context`が実行されず、理想体型が未設定として分析される可能性があります。

サーバーを停止して`uvicorn app.main:app --reload`で起動し直すと、最新の`main.py`が読み込まれます。

`--reload`は、開発中にPythonファイルの変更を検知してサーバーを自動再起動する指定です。

`Address already in use`は、同じ8000番ポートですでに別のPythonサーバーが動いていることを表します。

### テスト結果と1日1回制限

最初の古いコードによる生成画像テスト結果は削除せず、`status`を`test`として保存しました。

本番の1日1回判定は`status = "completed"`の結果だけを数えるため、開発用テストを本番分析として数えないようにしています。

最新コードによる成功結果は`completed`として保存され、同じ日本日付での通常分析はここから制限されます。

### 覚える単語

- プロセス：現在コンピューター上で動いているプログラム
- ポート：サーバーへ接続するための番号。このPython APIでは8000番
- `--reload`：ファイル変更時に開発サーバーを自動再起動する指定
- `status = "test"`：開発用の分析結果であることを区別する状態
- E2Eテスト：画面からAPI・AI・DB・画面表示まで全体を通して確認するテスト

## AIへ渡す共通データの型

対象ファイルは`app/lib/ai/getUserAiContext.ts`です。

このファイルはOpenAIを直接呼ぶ場所ではなく、Neonに分かれている本人情報をAIが使いやすい1つのデータへまとめる場所です。

`export type UserAiContext`は、AIメニューAPIとAIチャットAPIが共通で使用するデータの設計図です。

`userId: string`は、Neon内で本人を識別する内部IDです。

`goalBodyType: string | null`は、理想体型が文字列または未設定の`null`であることを表します。

`profile: { ... } | null`は、プロフィールが作成済みなら中の身体情報を持ち、未作成なら`null`になることを表します。

身長と体重はプロフィール内では必須なので`number`です。

体脂肪率・週の回数・可能時間・場所・苦手部位は任意入力なので、それぞれの型へ`| null`を付けます。

`weakBodyParts: string[] | null`の`string[]`は、`["胸", "背中"]`のように複数の文字列を持つ配列です。

### 覚える単語

- `type`：データがどんな項目と型を持つか決めるTypeScriptの設計図
- `export`：別ファイルからもその型や機能を使えるようにする指定
- `string`：文字列の型
- `number`：数値の型
- `string[]`：文字列を複数持つ配列の型
- `| null`：値が未設定の場合も許可する型
- ネスト：オブジェクトの中へ別のオブジェクトを入れて情報をまとめる構造

### 最新の身体分析結果の型

`latestBodyAnalysis`は、AIへ渡す最新の身体分析1件を表します。

一度も分析していない利用者もいるため、分析全体へ`| null`を付けます。

`summary`は身体全体の分析、`goalDifference`は理想体型との差です。

`analyzedAt: Date | null`は、分析日時または日時未登録の`null`を表します。

`areas: { ... }[]`は、肩・胸・背中など同じ形の部位別評価を複数持つ配列です。

各部位には、部位名・1〜10の評価・優先度・観察内容・おすすめを入れます。

これによりAIメニューは、最新分析で評価が低い部位や`priority = "high"`の部位を候補として使えます。

### 覚える単語

- `Date`：JavaScript・TypeScriptで日時を扱う型
- `latest`：最新という意味
- `areas`：複数の部位別評価をまとめる配列
- `}[]`：同じオブジェクトの形を複数持つ配列型

### 最近のトレーニング履歴の型

`recentTrainingSessions`は、AIが参考にする最近のトレーニング記録を複数持つ配列です。

履歴がない場合は異常ではないため、`null`ではなく空配列`[]`として扱います。

1回のトレーニングには、実施日時・所要時間・調子・メモを入れます。

その中の`exercises`には、その日に実施した複数の種目を入れます。

さらに各種目の`sets`へ、セット番号・重量・回数を入れます。

```text
recentTrainingSessions
└─ 1回のトレーニング
   ├─ 実施日時・時間・調子・メモ
   └─ exercises
      └─ 1種目
         ├─ 種目名・部位・細分部位
         └─ sets
            └─ セット番号・重量・回数
```

この入れ子構造により、AIは前回鍛えた部位だけでなく、ベンチプレスを何kgで何回行ったかまで確認できます。

### 覚える単語

- `recent`：最近のという意味
- `session`：1回分のトレーニング記録
- `exercise`：トレーニング種目
- `set`：1種目の中で行った重量・回数のまとまり
- 空配列`[]`：対象データが0件であることを安全に表す配列

## NeonからAI用の本人データを取得する関数

`getUserAiContext(clerkUserId)`は、認証後に取得したClerkユーザーIDを使い、Neonから本人のAI用データを集める非同期関数です。

本人認証そのものは各APIの`route.ts`で行います。

この関数は認証済みのClerk IDを受け取り、そのIDと一致する本人データをNeonから取得します。

```text
route.ts
└─ Clerkトークンを検証してClerk IDを取得
        ↓
getUserAiContext.ts
└─ Clerk IDと一致するNeonの本人データを取得
```

`Promise<UserAiContext | null>`は、非同期処理の完了後に`UserAiContext`または`null`を返すという型です。

`Promise`は非同期処理後の結果、`|`は「または」、`null`は本人が見つからない状態を表します。

`const db = getDb()`は、Drizzleを使ってNeon PostgreSQLを操作する接続を取得します。

`.select({ ... })`は、本人データから必要な列だけを選びます。

`.from(users)`は`users`テーブルを検索の中心にします。

`.leftJoin(userProfiles, ...)`は、プロフィールが未作成でも`users`の本人情報を残しながら身体情報を結合します。

`.where(eq(users.clerkUserId, clerkUserId))`は、認証済みClerk IDと一致する本人だけに絞ります。

`.limit(1)`は取得件数を最大1件にします。

`matchedUsers[0] ?? null`は、検索結果の先頭を取り出し、0件なら`null`へ統一します。

`if (!user) return null`は、本人がNeonに存在しない場合に後続の検索を行わず終了します。

現在の関数末尾にある`return null`は、関数が未完成の間だけTypeScriptエラーを防ぐ仮の返却です。

### 本人認証と本人データ取得の違い

- 本人認証：Clerkトークンが正しいかAPIの`route.ts`で確認する
- 本人データ取得：認証済みIDと一致する情報をNeonから取得する

この分担により、共通データ取得関数へ認証処理を何度も書く必要がありません。

### 覚える単語

- `async`：`await`を使える非同期関数にする指定
- `Promise<T>`：非同期処理後に`T`型の結果を返すことを表す型
- `await`：非同期処理が完了するまで待つ指定
- 返り値：関数が`return`で呼び出し元へ渡す値
- `.select()`：DBから取得する列を指定する処理
- `.where()`：条件に一致するデータへ絞る処理
- `.limit()`：取得する最大件数を決める処理

### 最新の身体分析を取得するNeon検索

本人検索と身体分析検索は同じDrizzleの基本形を使いますが、対象テーブルと取得内容が異なります。

```text
users＋user_profiles
└─ 本人の目標・身体情報

body_analyses
└─ 本人の最新身体分析
```

`.from(bodyAnalyses)`は、身体分析全体を保存している`body_analyses`テーブルを検索対象にします。

`and()`は、複数の条件をすべて満たす分析へ絞ります。

1つ目の`eq()`は、分析の`userId`と本人の`userId`が一致することを確認します。

2つ目の`eq()`は、`status`が`completed`の正常に完了した分析だけに絞ります。

`.orderBy(desc(bodyAnalyses.analyzedAt))`は、分析日時を新しい順に並べます。

`.limit(1)`によって、AIが使用する最新分析1件だけを取得します。

`matchedAnalyses[0] ?? null`は、最新分析があれば先頭を取り出し、一度も分析していなければ`null`にします。

### 覚える単語

- `and()`：複数の条件をすべて満たすデータへ絞る
- `.orderBy()`：取得結果の並び順を決める
- `desc()`：大きい値・新しい日時から順番に並べる
- `completed`：正常に処理が完了した分析の状態

### 最新分析の部位別評価を取得する

`body_analyses`には1回分の分析全体が保存され、`body_analysis_areas`には肩・胸・背中などの部位別評価が保存されています。

`latestAnalysis.id`と`bodyAnalysisAreas.analysisId`を一致させることで、最新分析に属する部位だけを取得します。

```text
body_analyses.id
        ＝
body_analysis_areas.analysis_id
```

`latestAnalysis ? 検索 : []`はTypeScriptの三項演算子です。

最新分析がある場合だけNeonを検索し、分析がない場合は安全な空配列`[]`を使用します。

部位別評価からは、部位名・点数・優先度・観察内容・おすすめを取得します。

これにより、AIは身体全体の文章だけでなく、評価が低い部位や優先度が高い部位を具体的に参照できます。

### 三項演算子の基本形

```ts
条件 ? 条件が成立した場合 : 成立しない場合
```

### 覚える単語

- 三項演算子：条件によって使用する値や処理を切り替える書き方
- `analysisId`：部位別評価がどの分析に属するかを示すID
- 空配列：対象が0件のときに使う、要素を持たない配列

### 最近10回のトレーニング記録を取得する

`.from(trainingSessions)`は、1回分の実施日時・時間・調子・メモを保存する`training_sessions`テーブルを検索します。

`.where(eq(trainingSessions.userId, user.userId))`は、本人のトレーニング記録だけに絞ります。

`.orderBy(desc(trainingSessions.performedAt))`は、実施日時が新しい順に並べます。

`.limit(10)`は、共通AIデータへ入れる履歴を直近10回に制限します。

過去の全履歴はNeonへ残しますが、毎回AIへ全件を渡すと料金・処理時間・不要な情報が増えるためです。

```text
Neonには全履歴を保存
        ↓
getUserAiContextでは最近10回を取得
        ↓
AIは最近のトレーニング傾向を判断
```

この段階の`recentSessions`には1回分の基本情報だけが入り、種目とセットは後続処理で結び付けます。

### 覚える単語

- `recentSessions`：最近のトレーニング記録を入れる配列
- `performedAt`：トレーニングを実施した日時
- `durationMinutes`：トレーニングに使った時間
- `conditionScore`：その日の調子を表す数値
- `.limit(10)`：取得結果を最大10件に制限する

### 各トレーニング記録へ種目を追加する

`recentSessions.map(async (session) => ...)`は、最近の記録を1件ずつ取り出し、それぞれに属する種目を検索します。

`.map()`は配列の各要素を順番に処理し、処理後の新しい配列を作るメソッドです。

今回の`session`には、現在処理している1回分のトレーニング記録が入ります。

`eq(trainingExercises.sessionId, session.id)`は、現在のトレーニングIDと一致する種目だけに絞ります。

`.orderBy(trainingExercises.displayOrder)`は、ユーザーが記録した種目順に並べます。

`return { session, exercises }`は、1回分の基本情報とその日に行った種目を1つにまとめます。

`async`を使った`.map()`の結果は、処理途中の`Promise`を複数持つ配列になります。

`Promise.all()`は、そのすべての非同期検索が完了するまで待ち、通常の結果配列としてまとめます。

```text
recentSessions.map()
├─ 1件目の種目を検索するPromise
├─ 2件目の種目を検索するPromise
└─ 3件目の種目を検索するPromise
        ↓ Promise.all()
すべての種目検索が完了した配列
```

### 覚える単語

- `.map()`：配列の各要素を処理して新しい配列を作る
- `async (session) =>`：1件ずつ非同期処理するアロー関数
- `Promise.all()`：複数の非同期処理がすべて完了するまで待つ
- `displayOrder`：種目を表示・記録した順番

### セット取得を小さな関数へ分ける

`getSetsForExercise(trainingExerciseId)`は、1種目のIDを受け取り、その種目に属するセット番号・重量・回数をNeonから取得します。

長い入れ子処理からセット検索だけを分離することで、関数名を見るだけで目的を判断しやすくなります。

`getDb()`は新しいデータベースを作る処理ではなく、同じ`DATABASE_URL`が示す既存のNeonを操作する接続を取得します。

`.from(trainingSets)`は、Neon内に保存済みの`training_sets`テーブルを検索します。

`eq(trainingSets.trainingExerciseId, trainingExerciseId)`は、関数へ渡された1種目に属するセットだけに絞ります。

`return sets`は、検索したセット配列を呼び出し元へ返します。

```text
getSetsForExercise(種目ID)
        ↓
Neonのtraining_setsを検索
        ↓
その種目のセット配列を返す
```

### 覚える単語

- ヘルパー関数：大きな処理の一部分を担当する小さな関数
- 引数：関数を呼ぶときに渡す値
- `return sets`：取得したセット配列を関数の呼び出し元へ返す

### 集めた本人情報をAI用データとして返す

`getUserAiContext()`の最後では、Neonから取得したプロフィール・身体分析・トレーニング履歴を1つのオブジェクトにまとめて返します。

この`return`はOpenAIやフロントへ直接送信する処理ではなく、`getUserAiContext()`を呼び出したAIメニューAPIやAIチャットAPIへ結果を渡す処理です。

- `userId: user.userId`：データが誰のものか識別するためのユーザーIDを入れる
- `goalBodyType: user.goalBodyType`：細マッチョなど、設定済みの理想体型を入れる
- `profileId !== null`：本人のプロフィールがNeonに存在するか確認する
- `heightCm !== null && weightKg !== null`：必須の身長と体重が取得できたか確認する
- `? { ... } : null`：プロフィールがそろっていれば中身を返し、なければ`null`を返す
- `...latestAnalysis`：最新分析のID・概要・理想との差・分析日時をまとめて展開する
- `areas: latestAnalysisAreas`：最新分析へ肩・胸・背中などの部位別評価を追加する
- `recentTrainingSessions`：最近10回分の種目・重量・回数・セットを入れる

```text
Neonから本人情報を取得
        ↓
getUserAiContext()で1つにまとめる
        ↓ return
AIメニューAPIまたはAIチャットAPI
        ↓
必要な情報をOpenAIへ送る
```

`Promise<UserAiContext | null>`は、「成功時は`UserAiContext`形式のデータを返し、ユーザーが見つからない場合は`null`を返す非同期関数」という意味です。

### AIメニューAPIで本人データを取得する

`app/api/ai-menu/route.ts`は、フロントから今日のメニュー生成依頼を受け取るTypeScriptバックエンドの入口です。

- `POST(request: Request)`：フロントから届いたPOST通信を受け取る
- `getClerkUserId(request)`：通信に含まれるClerk認証情報を検証し、本人のClerkユーザーIDを取得する
- `if (!clerkUserId)`：本人確認ができなければ、NeonやOpenAIを操作せず処理を止める
- `status: 401`：ログインが必要であることをフロントへ伝える
- `getUserAiContext(clerkUserId)`：本人のプロフィール・身体分析・トレーニング履歴をNeonから集める
- `if (!aiContext)`：Neonに本人情報がなければ処理を止める
- `status: 404`：必要なユーザー情報が見つからなかったことを伝える
- `Response.json({ aiContext })`：OpenAI接続前の動作確認として、取得した本人データを一時的にJSONで返す
- `try`：正常に実行したい認証・データ取得処理を囲む
- `catch`：途中で起きた予想外のエラーを受け取る
- `status: 500`：サーバー内部で問題が発生したことを伝える

```text
フロントからPOST
        ↓
Clerkの認証情報を検証
        ↓
Neonから本人のaiContextを取得
        ↓
現在は確認用JSONを返す
        ↓
今後はOpenAIへ渡して生成メニューを返す
```

ここで行う認証は再ログインではなく、ログイン済みの利用者が送った認証情報をAPI側でも検証し、他人のデータへアクセスさせないための本人確認です。

### Clerkの利用者とNeonの利用者を紐づける仕組み

Clerkのユーザー情報とNeonのユーザー情報を、メールアドレス・名前・プロフィールなどですべて比較しているわけではありません。

Clerkで本人確認したあと、ClerkとNeonの両方に保存されている共通の`clerkUserId`を使って、Neonから本人のデータだけを検索します。

```text
フロントから認証情報付きの通信
        ↓
Clerkが認証情報を検証
        ↓
clerkUserId = "user_abc123"を取得
        ↓
Neonのusers.clerkUserIdから同じIDを検索
        ↓
一致したNeonユーザーの本人データを取得
```

```ts
const clerkUserId =
  await getClerkUserId(request);
```

このコードは、Clerkが検証したログイン中の本人のIDを取得します。

```ts
eq(users.clerkUserId, clerkUserId)
```

このコードは、Neonの`users.clerkUserId`と、Clerkから取得した`clerkUserId`が同じユーザーを検索する条件です。

- Clerk：ログイン・新規登録・認証情報の検証を担当する
- Neon：プロフィール・身体分析・トレーニング履歴などのアプリデータを保存する
- `clerkUserId`：Clerkの利用者とNeonの利用者を結ぶ共通の識別番号
- `eq(A, B)`：AとBが等しいデータだけに検索結果を絞るDrizzleの機能

つまり、「Clerkで本人を確認し、そのClerk IDと一致するNeonユーザーの情報を取得する」という仕組みです。

### AIメニューとAIチャットでのデータ取得方法の違い

AIメニューは毎回必要な情報と返す内容がほぼ決まっているため、`getUserAiContext()`で本人情報を先にまとめ、`aiContext`としてOpenAIへ渡します。

```text
AIメニュー
NeonからaiContextをまとめて取得
        ↓
OpenAIへ最初から渡す
        ↓
今日の部位・種目・重量・回数・セットを生成
```

AIチャットは利用者の質問によって必要な情報が異なるため、AIが質問内容を判断し、必要なツールだけを選んで実行する構成にします。

```text
AIチャット
利用者から質問
        ↓
AIが必要な情報を判断
        ↓
必要な検索ツールを実行
        ↓
取得結果を使って回答
```

- AIメニュー：決まった本人情報を`aiContext`としてまとめて渡す
- AIチャット：プロフィール・分析・履歴などを必要なときだけツールで取得する
- `getUserAiContext()`：OpenAIのToolそのものではなく、AI用の本人情報をまとめるTypeScriptバックエンドの共通関数
- Tool：AI自身が必要性を判断し、決められた入力でバックエンド機能を呼び出す仕組み

AIチャット用ツールは、共通情報取得、履歴検索、最新分析取得、記録集計、設定変更の順に1つずつ作成します。

### AIメニューをOpenAIへ送り、返信を受け取る

`aiInput`は、`aiContext`からOpenAIの判断に必要な情報だけを選び、送信前の1つのオブジェクトへまとめたものです。

この時点ではまだ送信しておらず、内部ユーザーIDのようにメニュー作成に不要な情報を除外しています。

- `goalBodyType`：利用者の理想体型
- `profile`：身長・体重・体脂肪率・回数・時間・場所・苦手部位
- `latestBodyAnalysis`：最新の身体分析と部位別評価
- `recentTrainingSessions`：最近10回の種目・重量・回数・セット

`JSON.stringify(aiInput, null, 2)`は、TypeScriptのオブジェクトをOpenAIへ送れるJSON文字列へ変換します。

`null`は値を置き換える特別な処理を使わない指定で、`2`は2文字分の字下げを入れてJSONを読みやすくする指定です。

```ts
const aiResponse =
  await openai.responses.parse({
    model: "gpt-5.6-luna",
    instructions: menuPrompt,
    input: JSON.stringify(aiInput),
    text: {
      format: zodTextFormat(
        aiMenuSchema,
        "training_menu",
      ),
    },
  });
```

- `openai.responses.parse()`：OpenAIへ送信し、決めた形式として回答を受け取る
- `instructions: menuPrompt`：メニューを作る目的・判断基準・安全ルールを送る
- `input`：Neonから取得して整理した本人情報を送る
- `text.format`：Zodで作ったAIメニューの出力形式を指定する
- `await`：OpenAIの生成処理が完了して返信されるまで待つ
- `const aiResponse =`：OpenAIから返った結果全体を変数へ保存する
- `aiResponse.output_parsed`：形式確認を通過したAIメニューデータを取り出す
- `Response.json({ menu: ... })`：生成されたメニューをJSON通信でフロントへ返す

つまり、`await openai.responses.parse()`という1つの式が「OpenAIへ送信する」「返信を待つ」「決めた形式で返信を受け取る」の3つを担当します。

```text
aiInputを準備
        ↓
openai.responses.parse()で送信
        ↓
awaitで返信を待つ
        ↓
aiResponseへ返信を保存
        ↓
output_parsedをフロントへ返す
```

## AIメニューの決まったJSON形式

### なぜ自由な文章ではなくJSON形式にするのか

OpenAIが自由な文章だけを返すと、フロントは文章のどこが部位・種目・重量・回数なのかを安定して判別できません。

`menuSchema.ts`で返却形式を決めると、フロントは`menu.recommendedBodyPart`や`exercise.targetWeightKg`のように、必要な項目を直接指定して表示できます。

```text
自由な文章
「今日は胸がおすすめで、ベンチプレスを…」
        ↓ 分解しにくい
フロントのカード表示が不安定

決まったJSON
recommendedBodyPart: "胸"
exercises: [...]
        ↓ 項目を直接指定できる
フロントのカードへ安定して表示
```

### `menuSchema.ts`の役割

`app/lib/ai/menuSchema.ts`は、フロントから受け取る入力とOpenAIから受け取る出力の設計図を管理するTypeScriptファイルです。

このファイルはOpenAIを呼び出さず、データの形を定義・検証することだけを担当します。

#### フロント入力の設計図

`aiMenuRequestSchema`は、AIメニュー生成時にフロントから任意で受け取る値を検証します。

- `conditionScore`：今日の調子を1〜10の整数で受け取る
- `.int()`：小数を許可しない
- `.min(1)`：1未満を許可しない
- `.max(10)`：10を超える値を許可しない
- `.nullable()`：明示的な`null`を許可する
- `.optional()`：項目自体が送られない場合も許可する
- `note`：今日の痛み・疲労・希望などの任意メモ
- `.trim()`：文字列の前後にある不要な空白を除く
- `.max(500)`：極端に長い入力を防ぐため500文字までにする
- `requestedBodyPart`：部位別トレーニングで今日選んだ胸・背中・肩・腕・脚・腹筋
- `z.enum([ ... ])`：一覧に書いた文字だけを許可し、存在しない部位名を防ぐ

#### OpenAI出力の設計図

`aiMenuExerciseSchema`は、AIが返す1種目分の形を決めます。

- `exerciseName`：ベンチプレスなどの種目名
- `bodyPart`：胸・背中・脚などの大きな部位
- `bodyArea`：上部・中部・下部などの細かい部位。不要な場合は`null`
- `targetWeightKg`：重量目安。安全に判断できない場合は`null`
- `targetReps`：`8〜10回`のような回数範囲を表せる文字列
- `sets`：実施するセット数
- `restSeconds`：セット間の休憩秒数
- `note`：フォームや安全上の注意点

`aiMenuSchema`は、今日のメニュー全体の形を決めます。

- `recommendedBodyPart`：今日優先して鍛える部位
- `reason`：その部位と内容を選んだ理由
- `estimatedMinutes`：メニュー全体の推定時間
- `exercises`：`aiMenuExerciseSchema`形式の種目配列
- `advice`：利用者へ表示する複数の助言

### Zodで覚える基本文法

- `z.object({ ... })`：複数項目を持つオブジェクトの形を作る
- `z.string()`：文字列だけを許可する
- `z.number()`：数値だけを許可する
- `z.array(設計図)`：同じ設計図のデータが複数並ぶ配列を作る
- `z.infer<typeof 設計図>`：Zodの設計図からTypeScript型を自動で作る
- `safeParse(value)`：値を検証し、成功・失敗を例外ではなく結果として返す
- `parsedRequest.success`：入力検証が成功したかを表す真偽値
- `parsedRequest.data`：検証に成功した安全な入力データ

`AiMenu`と`AiMenuRequest`は、同じ項目をTypeScriptでもう一度手書きせず、Zodの設計図から自動作成した型です。

### `menuPrompt.ts`と`menuSchema.ts`の違い

```text
menuPrompt.ts
「何を考え、どんなルールで作るか」をAIへ指示

menuSchema.ts
「どの項目・データ型で返すか」を固定

route.ts
本人確認・データ取得・OpenAI送信・フロント返却
```

`menuPrompt`だけでもJSON形式をお願いできますが、AIの文章生成だけに任せると形式が崩れる可能性があります。

そこで`menuPrompt`で内容の判断基準を伝え、`menuSchema`で機械的なデータ形式も固定します。

### Structured Outputsで決まった形の回答を受け取る

`zodTextFormat(aiMenuSchema, "training_menu")`は、Zodで作った`aiMenuSchema`をOpenAIが理解できる出力形式へ変換します。

`"training_menu"`は、OpenAIへ渡すこの出力形式の識別名です。

```ts
const aiResponse =
  await openai.responses.parse({
    model: "gpt-5.6-luna",
    instructions: menuPrompt,
    input: JSON.stringify(aiInput),
    text: {
      format: zodTextFormat(
        aiMenuSchema,
        "training_menu",
      ),
    },
  });
```

- `responses.create()`：主に文章として回答を生成する
- `responses.parse()`：決めたデータ形式として回答を生成・解析する
- `text.format`：OpenAIに守らせる出力形式を指定する
- `output_parsed`：Zodの形式確認を通過した完成データを取得する
- `if (!generatedMenu)`：有効な形式の結果がなければ、不完全なメニューをフロントへ返さない
- `status: 502`：外部サービスであるOpenAIから有効な結果を得られなかったことを表す

### AIメニューAPIの現在の処理順

```text
フロントからPOST
        ↓
Clerkで本人確認
        ↓
今日の調子とメモをZodで検証
        ↓
getUserAiContext()でNeonから本人情報を取得
        ↓
不要なuserIdを除いてaiInputを準備
        ↓
menuPrompt・aiInput・aiMenuSchemaをOpenAIへ送信
        ↓
決まったJSON形式のメニューを受け取る
        ↓
メニュー本体と全種目をNeonへまとめて保存
        ↓
保存済みIDとメニューをフロントへ返す
```

入力形式が不正な場合はOpenAIを呼ばないため、不正リクエストによる不要なAPI料金も防ぎます。

内部の`userId`や身体画像そのものはOpenAIへ送らず、メニュー判断に必要なプロフィール・分析結果・履歴だけを送ります。

### フロントから送るJSON

どちらの項目も任意です。

```json
{
  "conditionScore": 7,
  "note": "少し肩に疲れがあります",
  "requestedBodyPart": "胸"
}
```

何も入力しない場合は空のJSONでも生成できます。

```json
{}
```

### バックエンドからフロントへ返すJSON

```json
{
  "menu": {
    "id": "保存済みメニューのUUID",
    "recommendedBodyPart": "胸",
    "reason": "最近の履歴と身体分析を考慮したため",
    "estimatedMinutes": 45,
    "exercises": [
      {
        "exerciseName": "ベンチプレス",
        "bodyPart": "胸",
        "bodyArea": "中部",
        "targetWeightKg": 60,
        "targetReps": "8〜10回",
        "sets": 3,
        "restSeconds": 120,
        "note": "肩甲骨を寄せて行う"
      }
    ],
    "advice": [
      "痛みが出た場合は中止してください"
    ],
    "conditionScore": 7,
    "requestNote": null,
    "createdAt": "2026-08-20T06:00:00.000Z"
  }
}
```

フロント担当は、このレスポンス形式をAPI接続の共通仕様として使用できます。

### 現在のAIメニュー機能の完成範囲

- Clerkによる本人確認：完成
- NeonからAI用本人情報を取得：完成
- プロフィール・最新身体分析・最近10回の履歴を統合：完成
- 今日の調子と任意メモの入力検証：完成
- AIメニュー専用プロンプト：完成
- Zodによる決まった出力形式：完成
- OpenAI Responses APIとの接続コード：完成
- 生成結果のNeon保存：完成
- 今日の最新メニュー取得API：完成
- ExpoのAIメニュー画面との接続：完成
- 保存済みメニューの画面復元：完成
- AIメニューから記録画面への種目引き継ぎ：完成
- 実際のOpenAI APIによるZod形式の生成：テストデータで確認済み
- Neonへのメニュー本体・種目の保存と再取得：テストデータで確認済み・確認後削除済み
- ログイン状態で画面から生成する一連の確認：ログイン済み端末での最終確認が必要
- API利用回数制限：今後追加
- 再生成ルール：今後仕様を決めて追加

## AIメニューをNeonへ保存・取得する仕組み

### 使用言語とファイルの担当

この機能は、PythonではなくTypeScriptで実装しています。

- `db/schema.ts`：Neonへ何を保存するか決める
- `app/api/ai-menu/route.ts`：本人確認、OpenAI生成、Neon保存、最新取得を行う
- `app/lib/ai/menuSchema.ts`：フロント入力とOpenAI出力の形式・範囲を検証する
- `mobile/src/lib/aiMenus.ts`：Expo画面とTypeScriptバックエンドを通信でつなぐ
- `mobile/src/app/ai-coach.tsx`：利用者の操作、読み込み、結果、エラーを画面へ表示する

Pythonは身体写真の画像検査・身体分析に使い、AIメニューはすでにNeonへ集めた文字・数値データを扱うためTypeScriptで完結させています。

### なぜテーブルを2つに分けるのか

1つのAIメニューには複数の種目が入ります。

```text
ai_generated_menus
└─ 今日のメニュー本体 1件
   ├─ おすすめ部位
   ├─ 理由
   ├─ 推定時間
   └─ アドバイス

ai_generated_menu_exercises
└─ 本体に所属する種目 複数件
   ├─ 種目名
   ├─ 部位・細かい部位
   ├─ 重量・回数・セット
   ├─ 休憩時間
   └─ 注意点
```

`ai_generated_menus`が親、`ai_generated_menu_exercises`が子です。

子テーブルの`menuId`へ親メニューの`id`を保存することで、「この種目はどのメニューに含まれるか」を判断できます。

```ts
menuId: uuid("menu_id")
  .notNull()
  .references(() => aiGeneratedMenus.id, {
    onDelete: "cascade",
  })
```

- `uuid("menu_id")`：UUIDを保存する列を作る
- `.notNull()`：所属先がない種目を保存させない
- `.references(...)`：親メニューのIDだけを許可する
- `onDelete: "cascade"`：親メニューを削除した場合、所属する種目も一緒に削除する

### POSTは生成して保存する

`POST /api/ai-menu`は、新しいAIメニューを作る処理です。

```ts
const menuId = crypto.randomUUID();
const createdAt = new Date();
```

- `crypto.randomUUID()`：保存するメニュー専用の重複しにくいIDを作る
- `new Date()`：生成・保存した現在日時を作る

```ts
await db.batch([
  db.insert(aiGeneratedMenus).values({ ... }),
  db.insert(aiGeneratedMenuExercises).values([ ... ]),
]);
```

- `db.insert(テーブル)`：指定テーブルへ新しい行を追加する
- `.values(...)`：実際に保存する値を渡す
- `.map(...)`：OpenAIが返した全種目を、子テーブルへ保存する形に1件ずつ変換する
- `displayOrder`：AIが返した種目の並び順を保存する
- `db.batch([ ... ])`：メニュー本体と全種目を1まとまりでNeonへ送る
- `await`：Neonへの保存が終わるまで待つ

この保存が成功してから`Response.json()`を返すため、フロントに成功結果が届いた時点でNeon保存も完了しています。

### GETは最後に保存した本人のメニューを取得する

`GET /api/ai-menu`はOpenAIを呼びません。すでにNeonへ保存されている本人の最新メニューを読み取ります。

```ts
.where(eq(users.clerkUserId, clerkUserId))
.orderBy(desc(aiGeneratedMenus.createdAt))
.limit(1);
```

- `.where(...)`：ログイン中のClerk IDと一致する本人データだけに絞る
- `eq(A, B)`：AとBが同じデータを探す
- `desc(createdAt)`：新しい日時から古い日時の順へ並べる
- `.limit(1)`：最も新しい1件だけを取得する

本体を取得したあと、その`latestMenu.id`と同じ`menuId`を持つ種目を取得します。

```ts
.where(
  eq(
    aiGeneratedMenuExercises.menuId,
    latestMenu.id,
  ),
)
.orderBy(aiGeneratedMenuExercises.displayOrder);
```

まだ一度も生成していない場合は、エラーではなく次を返します。

```json
{
  "menu": null
}
```

`null`ならフロントは「まだ保存済みメニューがない」と判断し、今日の調子を選ぶ画面を表示できます。

### Expo画面で保存済みメニューが残る理由

以前の仮メニューはReactの`useState`にしか入っていなかったため、画面更新やアプリ再起動で消えていました。

現在は次の順番です。

```text
AIメニュー画面を開く
        ↓
ClerkのgetToken()で本人の認証トークンを取得
        ↓
GET /api/ai-menu
        ↓
TypeScriptバックエンドがNeonから本人の最新メニューを取得
        ↓
toGeneratedMenuPreview()で画面用の形へ変換
        ↓
画面へ表示し、React Contextにも入れる
```

`mobile/src/lib/aiMenus.ts`は、バックエンドの保存形式を既存画面の表示形式へ変換します。

```ts
const savedMenu =
  toGeneratedMenuPreview(response.menu);
```

- `response.menu`：GET APIから届いたNeonの最新メニュー
- `toGeneratedMenuPreview(...)`：項目名や数値を既存画面が使える形へ変える関数
- `const savedMenu =`：変換後のメニューを変数へ保存する

### `useEffect()`を使う理由

```ts
useEffect(() => {
  // 最新AIメニューを取得する処理
}, [getToken, isLoaded, isSignedIn]);
```

`useEffect()`は、画面が表示されたことや認証状態が準備できたことに合わせて通信を始めるために使います。

- `isLoaded`：Clerkの認証状態を読み込み終えたか
- `isSignedIn`：利用者がログイン済みか
- `getToken()`：バックエンドが本人確認に使う認証トークンを取得する
- 依存配列`[ ... ]`：この中の値が変わったときに処理を見直す
- `cancelled`：画面を閉じたあとに古い通信結果で画面を更新しないための印

Reactの一時状態とNeonの違いは次のとおりです。

```text
useState / React Context
画面を動かすための一時データ

Neon
アプリを閉じても残す長期データ
```

AIメニューはNeonへ保存するため、画面を切り替えたりアプリを再起動したりしても、ログイン中の本人の最新メニューを再取得できます。

## このアプリでNeonを使う理由

### Neon・PostgreSQL・Drizzleの関係

Neonは、このアプリのデータをインターネット上で長期間保存するデータベースサービスです。

Neonの中では、一般的なリレーショナルデータベースであるPostgreSQLが動いています。

Drizzleは、TypeScriptからPostgreSQLのテーブルを定義・検索・保存するための道具です。

```text
route.ts
   ↓ Drizzleで検索・保存
Neon
└─ PostgreSQL
   ├─ users
   ├─ user_profiles
   ├─ training_sessions
   ├─ body_analyses
   └─ 今後のAIチャット履歴
```

### データを長期間保存できる

ReactやPythonのサーバーを停止・再起動しても、Neonへ保存したユーザー情報やトレーニング記録は消えません。

そのため、身体分析結果、過去の重量、AIチャット履歴などをユーザーごとの長期記憶として利用できます。

### 小規模開発時の費用を抑えやすい

Neonには、一定時間アクセスがない場合にデータベースの計算部分を停止するScale to Zeroがあります。

停止中も保存データは残り、次のアクセス時に自動で再開します。

開発中や利用者が少ない初期段階で、常にサーバーを動かし続ける費用を抑えやすくなります。

ただし、自動停止後の最初のアクセスは、再開のため少し遅くなる場合があります。

### 利用者が増えた場合に対応しやすい

Autoscalingは、データベースの利用量に応じて計算能力を調整する仕組みです。

利用者が増えた場合は、接続プールを使って大量の接続を効率よくまとめることもできます。

### データ同士を安全に結び付けられる

PostgreSQLでは、ユーザーIDを共通のキーとして本人の情報を結び付けられます。

```text
本人のusers.id
├─ プロフィール
├─ 理想体型
├─ トレーニング記録
├─ 身体分析結果
├─ AI生成メニュー
└─ AIチャット履歴
```

外部キーや本人確認を組み合わせることで、別ユーザーのデータが混ざるのを防ぎます。

### データベースのブランチを作れる

Neonのブランチは、本番データベースとは分離された環境でテーブル変更などを試す機能です。

変更を安全に確認してから本番側へ反映できるため、利用者が増えた後の機能追加にも役立ちます。

### PostgreSQLなので将来移行しやすい

Neon独自形式だけに依存するデータベースではなくPostgreSQLなので、必要になった場合は別のPostgreSQL環境へ移行しやすい構成です。

### セキュリティ上の注意

`DATABASE_URL`はデータベースへ直接接続できる秘密情報なので、フロントエンドやGitHubへ公開してはいけません。

フロントエンドは必ずTypeScriptバックエンドのAPIを経由し、本人確認後に必要なデータだけを取得・保存します。

### 覚える単語

- Neon：クラウド上でPostgreSQLを利用するサービス
- PostgreSQL：表同士を関連付けて保存できるデータベース
- Drizzle：TypeScriptからPostgreSQLを操作するORM
- Scale to Zero：未使用時に計算部分を停止して費用を抑える仕組み
- Autoscaling：利用量に合わせて計算能力を調整する仕組み
- 接続プール：多数のDB接続をまとめて効率よく再利用する仕組み
- DBブランチ：本番と分離したデータベース環境で変更を試す仕組み

### 覚える単語

- `AsyncOpenAI`：OpenAI APIを非同期で呼び出すPythonクライアント
- `responses.parse()`：入力をモデルへ送り、指定した構造で結果を受け取る処理
- Structured Outputs：AIの出力を決められたJSON構造へそろえる機能
- `output_parsed`：指定したPydantic型として検査・変換された結果
- HTTP 502：外部サービスから正常な結果を受け取れなかったことを示すステータス

## 初回設定の完了状態を保存するAPI

担当ファイルは`app/api/users/onboarding-complete/route.ts`です。

このAPIは、理想体型・必須の身体情報・初回身体分析がすべて完了したことを確認し、次回起動時に初回設定を繰り返さないようにするTypeScriptバックエンドです。

```text
フロントからPOST通信
↓
Clerkでログイン本人を確認
↓
Neonから理想体型・身長・体重を取得
↓
完了済みの身体分析があるか確認
↓
initialAnalysisCompletedをtrueへ更新
↓
onboardingCompletedをtrueへ更新
↓
完了状態をJSONでフロントへ返す
```

### なぜこのAPIが必要なのか

Reactの`useState`だけに保存した値は、画面の再読み込みやアプリの再起動によって失われます。

Neonの`users.onboardingCompleted`へ`true`を保存すると、サーバーやアプリを再起動しても初回設定を完了した事実が残ります。

次回起動時は`POST /api/users/bootstrap`がこの値を取得し、`true`ならホーム、`false`なら初回設定へ進む判断に使います。

このAPIが保存するのは理想体型や身長そのものではなく、「初回設定全体が完了した」という状態です。

- 理想体型の保存：`PATCH /api/users/goal`
- 身長・体重などの保存：`PATCH /api/users/profile`
- 身体分析結果の保存：`POST /api/body-analysis`
- 初回設定完了状態の保存：`POST /api/users/onboarding-complete`

### 本人データの取得

```typescript
const matchedUsers = await db
  .select({
    userId: users.id,
    goalBodyType: users.goalBodyType,
    heightCm: userProfiles.heightCm,
    weightKg: userProfiles.weightKg,
  })
  .from(users)
  .leftJoin(
    userProfiles,
    eq(userProfiles.userId, users.id),
  )
  .where(eq(users.clerkUserId, clerkUserId))
  .limit(1);
```

`.select({...})`は、確認に必要な項目だけを取得します。

`.from(users)`は、`users`テーブルを検索の中心にします。

`.leftJoin(userProfiles, ...)`は、同じ利用者の身体プロフィールを`users`へ結び付けます。

`.where(eq(users.clerkUserId, clerkUserId))`は、Clerkで確認した本人のデータだけへ絞り込みます。

`.limit(1)`は、取得件数を最大1件にします。

### 必須情報の確認

```typescript
if (
  user.goalBodyType === null ||
  user.heightCm === null ||
  user.weightKg === null
) {
  return Response.json(
    { error: "理想体型と身長・体重を先に設定してください。" },
    { status: 400 },
  );
}
```

`=== null`は、Neonに値がまだ保存されていないかを確認します。

`||`は、どれか一つでも未設定なら条件が成立する「または」です。

この確認により、不完全な状態で初回設定が完了扱いになることを防ぎます。

### 完了済み身体分析の確認

```typescript
.where(
  and(
    eq(bodyAnalyses.userId, user.userId),
    eq(bodyAnalyses.status, "completed"),
  ),
)
```

`and()`は、複数の条件をすべて満たすデータだけを検索します。

1つ目の`eq()`は、分析結果がログイン中の本人のものか確認します。

2つ目の`eq()`は、分析処理が`completed`まで完了しているか確認します。

### 初回設定状態の更新

```typescript
const updatedUsers = await db
  .update(users)
  .set({
    initialAnalysisCompleted: true,
    onboardingCompleted: true,
    updatedAt: new Date(),
  })
  .where(eq(users.id, user.userId))
  .returning({
    userId: users.id,
    onboardingCompleted: users.onboardingCompleted,
    initialAnalysisCompleted: users.initialAnalysisCompleted,
  });
```

`.update(users)`は、`users`テーブルを更新対象にします。

`.set({...})`は、変更する列と新しい値を指定します。

`initialAnalysisCompleted: true`は、初回分析が完了した状態です。

`onboardingCompleted: true`は、初回設定全体が完了した状態です。

`updatedAt: new Date()`は、最後に更新した日時を現在時刻へ変更します。

`.where(eq(users.id, user.userId))`は、本人の1件だけを更新します。

`.returning({...})`は、Neonで更新された後の値を受け取ります。

### 覚える単語

- オンボーディング：利用開始時に行う初回設定
- 完了フラグ：完了したかを`true`または`false`で保存する値
- `and()`：複数の検索条件をすべて満たすようにつなぐ
- `.update()`：既存のデータを変更する
- `.set()`：変更後の値を指定する
- `.returning()`：保存・更新後の値をデータベースから受け取る
- HTTP 400：入力や現在の設定状態に問題がある
- HTTP 401：ログインを確認できない
- HTTP 404：対象のユーザーが見つからない
- HTTP 500：サーバー内で予想外のエラーが起きた

### 現在の確認状況

`npm run build`で`/api/users/onboarding-complete`がAPIルートとして認識され、ビルドに成功することを確認済みです。

実際のClerk認証・Neonデータを使ったフロントからの通し確認は、フロント接続後に行います。

## 保存済みの理想体型を取得するGET API

担当ファイルは`app/api/users/goal/route.ts`です。

同じURLでも、HTTPメソッドによって役割が分かれます。

```text
GET /api/users/goal
→ Neonに保存済みの理想体型を取得する

PATCH /api/users/goal
→ 理想体型を新しく保存または変更する
```

`GET()`は、画面の再表示やアプリ再起動後に以前の選択内容を復元するために使います。

```typescript
const matchedUsers = await db
  .select({
    userId: users.id,
    goalBodyType: users.goalBodyType,
  })
  .from(users)
  .where(eq(users.clerkUserId, clerkUserId))
  .limit(1);
```

`.select({...})`で、本人のアプリ内IDと理想体型だけを取得します。

`.where(eq(...))`で、Clerk認証を通過した本人のデータだけに絞ります。

```typescript
const user = matchedUsers[0] ?? null;
```

Neonの検索結果は配列なので、`[0]`で最初の1件を取り出します。

`?? null`は、検索結果が存在しない場合の値を`null`へ統一します。

```typescript
return Response.json({
  goalBodyType: user.goalBodyType,
});
```

取得できた理想体型をJSONとしてフロントエンドへ返します。

理想体型がまだ未設定の場合は、`goalBodyType`が`null`として返ります。

### 覚える単語

- GET：保存済みデータを取得するためのHTTPメソッド
- PATCH：既存データの一部を変更するためのHTTPメソッド
- 復元：以前保存した値を取得して画面へ戻すこと
- `[0]`：配列の最初の要素を取り出す指定
- `?? null`：左側に値がなければ`null`を使う書き方

`npm run build`で、GET追加後もビルドに成功することを確認済みです。

## bootstrap APIで初回設定の途中経過を返す

担当ファイルは`app/api/users/bootstrap/route.ts`です。

bootstrapは、アプリを使い始めるための状態を最初に準備・確認する処理です。

このアプリでは、Clerkログイン後に本人をNeonへ登録または検索し、次に表示する画面を決める情報を返します。

```text
アプリ起動
↓
Clerkでログイン本人を確認
↓
Neonに未登録ならusersへ新規登録
↓
登録済みなら初回設定の進行状態を取得
↓
進行状態をJSONでフロントへ返す
```

現在は次の形式で返します。

```typescript
return Response.json({
  userId: clerkUserId,
  onboardingCompleted: existingUser.onboardingCompleted,
  goalBodyType: existingUser.goalBodyType,
  profileCompleted: existingUser.profileCompleted,
  initialAnalysisCompleted: existingUser.initialAnalysisCompleted,
});
```

`userId`は、Clerkで確認した利用者を識別するIDです。

`goalBodyType`は、以前選択した理想体型です。未設定なら`null`です。

`profileCompleted`は、必須の身長・体重が保存済みかを示します。

`initialAnalysisCompleted`は、初回身体分析が完了済みかを示します。

`onboardingCompleted`は、初回設定全体が完了済みかを示します。

これらは今回Neonへ保存する処理ではなく、Neonにすでに保存されている状態をフロントへ返す処理です。

フロントは次の順番で画面を判断できます。

```text
onboardingCompletedがtrue
→ ホーム

goalBodyTypeがnull
→ 理想体型設定

profileCompletedがfalse
→ 身体情報入力

initialAnalysisCompletedがfalse
→ 初回身体分析
```

これにより、初回設定の途中でアプリを閉じても、完了済み画面を飛ばして続きから再開できます。

### 覚える単語

- bootstrap：アプリ起動時に利用開始の状態を準備・確認する処理
- 進行状態：利用者が各設定をどこまで完了したかを表す値
- 真偽値：`true`または`false`の2種類を持つ値
- `Response.json()`：フロントへJSON形式のデータを返す処理

返却項目の追加後に`npm run build`が成功することを確認済みです。

## スマホ側でbootstrap APIの返却型を定義する

担当ファイルは`mobile/src/lib/bootstrap.ts`です。

バックエンドが返すJSONをTypeScriptが正しく理解できるように、`BootstrapResponse`へ初回設定の各状態を定義しています。

```typescript
export type BootstrapResponse = {
  userId: string;
  onboardingCompleted: boolean;
  goalBodyType: string | null;
  profileCompleted: boolean;
  initialAnalysisCompleted: boolean;
};
```

`type`は、データがどの項目と型を持つかを表すTypeScriptの設計図です。

`string`は文字列、`boolean`は`true`または`false`を表します。

`string | null`は、文字列が入る場合と、まだ未設定で`null`になる場合の両方を許可します。

ここはNeonへ保存したり画面を移動したりする処理ではありません。

APIから受け取るデータの形をTypeScriptへ教え、項目名の間違いや型の不一致を開発中に見つけるための部分です。

変更後にスマホ版で`npx tsc --noEmit`を実行し、TypeScriptエラーがないことを確認済みです。

## bootstrapの進行状態で続きの画面へ移動する

担当ファイルは`mobile/src/app/bootstrap.tsx`です。

`fetchBootstrap(token)`でバックエンドから進行状態を取得し、最初に見せるべき画面を判断します。

```typescript
if (data.onboardingCompleted) {
  router.replace('/home');
  return;
}

if (data.goalBodyType === null) {
  router.replace('/ideal-body');
  return;
}

if (!data.profileCompleted) {
  router.replace('/profile-setup');
  return;
}

router.replace('/initial-analysis');
```

最初の`if`は、初回設定全体が完了済みならホームへ移動します。

2番目の`if`は、理想体型が未設定なら理想体型選択へ移動します。

3番目の`if`は、身体プロフィールが未完了なら身体情報入力へ移動します。

ここまでに該当しなければ理想体型とプロフィールは保存済みなので、初回分析へ移動します。

`return`は、移動先が決まった後に下の条件を続けて実行しないために使います。

`router.replace()`は現在の画面を履歴上で置き換えるため、戻る操作で起動確認画面へ戻りにくくします。

この分岐により、アプリを途中で閉じても、Neonに保存された進行状態から続きの画面を判断できます。

変更後にスマホ版の`npx tsc --noEmit`が成功することを確認済みです。

## 初回設定の保存・復元を画面まで接続する

### 全体の役割

今回の接続により、初回設定はReactの`useState`だけではなくNeonへ長期保存されます。

```text
理想体型画面
↓ PATCH /api/users/goal
Neonへ理想体型を保存
↓
身体情報画面
↓ PATCH /api/users/profile
Neonへプロフィールを保存
↓
初回分析画面
↓ 身体写真分析画面
↓ POST /api/body-analysis
Python・OpenAIで分析してNeonへ結果を保存
↓ POST /api/users/onboarding-complete
初回設定完了をNeonへ保存
↓
ホーム
```

次回起動時は`bootstrap API`の後に保存済みデータを取得し、React Contextへ戻します。

### プロフィール通信ファイル

担当ファイルは`mobile/src/lib/profiles.ts`です。

`fetchUserProfile(token)`は`GET /api/users/profile`を呼び、Neonに保存済みの身体プロフィールを取得します。

`saveUserProfile(token, profile)`は`PATCH /api/users/profile`を呼び、入力したプロフィールを保存します。

```typescript
export function profileDraftToApiInput(
  profile: ProfileDraft,
) {
  return {
    heightCm: Number(profile.heightCm),
    weightKg: Number(profile.weightKg),
    bodyFatPercentage:
      profile.bodyFatPercentage === ''
        ? null
        : Number(profile.bodyFatPercentage),
  };
}
```

React Nativeの入力欄は値を文字列として持つため、`Number()`でバックエンドが保存できる数値へ変換します。

任意の体脂肪率が空欄なら、存在しない値を表す`null`へ変換します。

```typescript
export function userProfileToDraft(
  profile: UserProfile,
): ProfileDraft
```

この関数は反対に、Neonから取得した数値を入力欄で再表示できる文字列へ戻します。

### 起動時のReact Context復元

担当ファイルは`mobile/src/app/bootstrap.tsx`です。

```typescript
if (data.goalBodyType !== null) {
  const restoredGoal =
    goalBodyTypeToSelection(
      data.goalBodyType,
    );

  if (restoredGoal) {
    setGoalBody(restoredGoal);
  }
}
```

Neonの`細マッチョ`などの日本語名を、理想体型画面が使用する`lean-muscle`などのIDへ変換してContextへ戻します。

```typescript
if (data.profileCompleted) {
  const profileResponse =
    await fetchUserProfile(token);

  if (profileResponse.profile) {
    setProfile(
      userProfileToDraft(
        profileResponse.profile,
      ),
    );
  }
}
```

身体情報が保存済みの場合だけプロフィールGET APIを呼び、取得結果を入力フォーム用の形へ変換してContextへ戻します。

これにより、ホームやマイページなどContextを読む画面でも再起動前の値を利用できます。

### 身体情報画面の保存

担当ファイルは`mobile/src/app/profile-setup.tsx`です。

`continueToAnalysis()`を`async`関数にして、Clerkトークン取得とプロフィールAPIの完了を待つように変更しました。

```typescript
const token = await getToken();
await saveUserProfile(token, form);
setProfile(form);
router.push('/initial-analysis');
```

`await saveUserProfile()`によって、Neon保存が終わるまで画面移動を待ちます。

保存成功後だけContextを更新して初回分析画面へ進みます。

保存失敗時は`catch`でエラーを画面へ表示し、入力内容を残したまま再試行できます。

身長と体重だけを必須とし、体脂肪率・場所・週の回数・1回の時間・苦手部位・トレーニング形式は任意です。

### 初回分析と定期分析の分岐

担当ファイルは`mobile/src/app/initial-analysis.tsx`と`mobile/src/app/body-analysis.tsx`です。

初回分析画面は次のURLパラメータを付けて身体写真分析へ移動します。

```typescript
router.push({
  pathname: '/body-analysis',
  params: {
    initial: 'true',
  },
});
```

`params`は、同じ身体分析画面へ「今回は初回分析である」という追加情報を渡します。

身体分析画面ではExpo Router v57の`useLocalSearchParams()`を使って値を受け取ります。

```typescript
const { initial } =
  useLocalSearchParams<{
    initial?: string;
  }>();

const isInitialAnalysis =
  initial === 'true';
```

初回分析の場合は、分析結果を確認した後に`completeOnboarding(token)`を呼びます。

定期分析の場合は初回設定状態を変更せず、分析履歴画面へ移動します。

### 初回設定完了の通信ファイル

担当ファイルは`mobile/src/lib/onboarding.ts`です。

```typescript
export function completeOnboarding(
  token: string,
) {
  return apiRequest(
    '/api/users/onboarding-complete',
    {
      method: 'POST',
      token,
    },
  );
}
```

この関数は初回設定を直接完了させるのではなく、バックエンドへ完了確認を依頼します。

バックエンドは理想体型・身長・体重・完了済み身体分析を確認してから、Neonの完了状態を`true`へ更新します。

## 身体分析履歴をNeonから取得して表示する

### バックエンドGET API

担当ファイルは`app/api/body-analysis/route.ts`です。

同じURLで役割を分けています。

```text
GET /api/body-analysis
→ 本人の保存済み分析履歴を取得

POST /api/body-analysis
→ 画像3枚を分析し、結果を保存
```

GETではClerkユーザーIDから本人の`users.id`を取得し、`body_analyses`を新しい順で最大50件取得します。

```typescript
.where(
  and(
    eq(bodyAnalyses.userId, user.id),
    eq(bodyAnalyses.status, 'completed'),
  ),
)
.orderBy(desc(bodyAnalyses.analyzedAt))
.limit(50)
```

`and()`によって、本人のデータかつ完了済みの分析だけに限定します。

`desc()`は日時を降順に並べ、最新の分析を先頭にします。

各分析について`body_analysis_areas`を検索し、肩・胸などの部位別評価を結び付けて返します。

### スマホ側の履歴通信

担当ファイルは`mobile/src/lib/bodyAnalyses.ts`です。

`BodyAnalysisHistoryItem`は、バックエンドから受け取る分析全体・日時・理想との差・部位別評価のTypeScript設計図です。

`fetchBodyAnalysisHistory(token)`は認証トークンを付けてGET APIを呼びます。

### 分析履歴画面

担当ファイルは`mobile/src/app/analysis-history.tsx`です。

Expo Routerの`useFocusEffect()`を使い、分析画面から戻って再び履歴画面が表示されたときも最新データを取得します。

履歴画面には次を表示します。

- 保存済み分析の回数
- 最新分析の部位別平均スコア
- 分析日時
- AIの分析要約
- 理想体型との差
- 肩・胸などの部位別スコア
- 部位別の観察内容とおすすめ

分析時点の体重を保存する列は現在ないため、仮の体重推移やBMIは表示しません。

通信中はローディング、履歴0件なら空状態、通信失敗時はエラーと再試行ボタンを表示します。

### セキュリティ確認

認証トークンなしで次のAPIを呼び、どちらもHTTP 401と`ログインが必要です`を返すことを確認しました。

- `GET /api/body-analysis`
- `POST /api/users/onboarding-complete`

これにより、ログインしていない通信から身体分析履歴を取得したり初回設定を変更したりできないことを確認しています。

### 検証結果

- スマホ版`npx tsc --noEmit`：成功
- スマホ版`npm run lint`：成功
- バックエンド`npm run build`：成功
- 認証なしAPI確認：HTTP 401

実際のClerkログインユーザー・Neonデータ・Python分析APIを使った通し確認はまだ必要です。

## 理想体型画面とバックエンドAPIをつなぐ通信ファイル

担当ファイルは`mobile/src/lib/goals.ts`です。

このファイルはNeonを直接操作せず、理想体型の取得・保存をTypeScriptバックエンドへ依頼します。

```text
理想体型画面
↓ goals.ts
↓ GETまたはPATCH
app/api/users/goal/route.ts
↓ 本人確認
Neon
```

`GoalBodyType`は、バックエンドへの保存を許可する4種類の文字列だけを表すTypeScriptの型です。

`fetchGoalBodyType(token)`は`GET /api/users/goal`を呼び、保存済みの理想体型を取得します。

`saveGoalBodyType(token, goalBodyType)`は`PATCH /api/users/goal`を呼び、選択した理想体型の保存を依頼します。

```typescript
body: JSON.stringify({
  goalBodyType,
})
```

`JSON.stringify()`は、JavaScript・TypeScriptのオブジェクトをHTTP通信で送れるJSON文字列へ変換します。

`token`はバックエンド側でClerkのログイン本人を確認するために送ります。

スマホからNeonへ直接接続しない理由は、`DATABASE_URL`などの秘密情報をアプリ利用者へ公開しないためです。

参考画像はこのAPIの対象ではなく、画像ストレージと専用アップロード処理を作成した後に接続します。

変更後にスマホ版の`npx tsc --noEmit`が成功することを確認済みです。
# 身体分析を任意にする仕組み

初回設定で必須なのは、理想体型・身長・体重です。身体写真による分析は任意で、利用者は初回分析画面から「今は分析せずホームへ進む」を選べます。

## フロントエンド：`mobile/src/app/initial-analysis.tsx`

`skipBodyAnalysis()` は、身体写真を送らずに初回設定を完了するための関数です。

- `getToken()`：現在ログインしている本人のClerk認証トークンを取得します。
- `completeOnboarding(token)`：認証トークンを付けて、初回設定完了APIを呼びます。
- `router.replace('/home')`：保存に成功した後、初回分析画面へ戻れない形でホームへ移動します。
- `isSkipping`：保存処理中の二重送信を防ぎ、処理中の表示へ切り替えるStateです。
- `skipError`：保存に失敗した場合のメッセージを画面へ表示するStateです。

## バックエンド：`app/api/users/onboarding-complete/route.ts`

このAPIは、理想体型・身長・体重がNeonに保存済みか確認し、そろっていれば `onboardingCompleted` を `true` にします。

```ts
initialAnalysisCompleted:
  completedAnalyses.length > 0,
```

`completedAnalyses.length > 0` は、完了済みの身体分析が1件以上あるかを調べています。分析済みなら `true`、スキップした場合は `false` です。身体分析をスキップしても `onboardingCompleted` は `true` になるため、次回起動時はホームへ進めます。
# Renderへ公開したPython身体分析API

身体分析用FastAPIをRenderのStarterプランへ公開しています。

```text
https://musclepas-body-analysis.onrender.com
```

ローカル開発では以前、TypeScriptバックエンドから `http://127.0.0.1:8000` のPythonへ接続していました。現在は `.env.local` の次の設定により、Render上のPythonへ接続します。

```env
PYTHON_ANALYSIS_URL=https://musclepas-body-analysis.onrender.com
```

処理の流れは次のとおりです。

```text
スマホ画面
→ TypeScriptバックエンド
→ Render上のPython FastAPI
→ OpenAI画像分析
→ Pythonが分析結果JSONを返す
→ TypeScriptがNeonへ保存
→ スマホ画面へ結果を返す
```

Renderには `OPENAI_API_KEY` を環境変数として保存しています。秘密鍵はGitHubやアプリのフロントエンドへ書いてはいけません。`/health` はOpenAIを呼ばず、Pythonサービスが起動しているかだけを確認するURLです。

# スマホ版AIチャットとバックエンドの接続

今回の担当ファイルは次の3つです。

- `mobile/src/lib/chatApi.ts`：チャットAPIとの通信だけを担当します。
- `mobile/src/app/chat.tsx`：質問の入力とAI回答の表示を担当します。
- `mobile/src/contexts/ChatHistoryContext.tsx`：画面内のチャットとNeon側のチャットIDを紐づけます。

処理の流れは次のとおりです。

```text
スマホのチャット入力欄
→ Clerkの認証トークンを取得
→ chatApi.tsからPOST /api/chatを呼ぶ
→ TypeScriptバックエンドが本人確認
→ OpenAIが回答を生成
→ バックエンドがNeonへ会話を保存
→ replyをスマホへ返す
→ chat.tsxがAIの吹き出しへ表示
```

## `sendChatMessage()`

`sendChatMessage()`は、利用者の質問・Clerkトークン・会話IDをバックエンドへ送る関数です。

```ts
sendChatMessage(
  token,
  content,
  serverConversationId,
)
```

- `token`：ログイン中の本人だと証明する値です。
- `content`：入力欄に書かれた質問です。
- `serverConversationId`：Neonに保存されているチャットルームのIDです。新規チャットでは`null`になります。

バックエンドからは次の形で結果が返ります。

```ts
{
  conversationId: string;
  reply: string;
}
```

`conversationId`はNeon側のチャットID、`reply`はOpenAIが生成した回答です。

## スマホ内IDとNeon側ID

`id`は、スマホ画面上でチャットを見分けるための仮IDです。

`serverConversationId`は、Neonに保存された本物のチャットルームIDです。

最初の送信では`serverConversationId`が`null`なので、バックエンドが新しいチャットルームを作ります。返されたIDを`setServerConversationId()`で画面内のチャットへ保存し、2回目以降の質問を同じ会話へ追加します。

未ログインの場合は`Redirect`で`/sign-in`へ移動し、認証なしでチャットAPIを利用できないようにしています。

実通信テストでは、スマホ画面から送った「接続テストです。短く返答してください。」に対して、AIから「接続できています。」と回答が表示されることを確認済みです。

現在は、画面を開いている間の表示だけでなく、アプリを再読み込みした後にNeonから過去のチャット一覧とメッセージを読み戻すところまで完成しています。

## Neonからチャット履歴を取得する通信関数

担当ファイルは`mobile/src/lib/chatApi.ts`です。

`fetchChatHistory()`は、Clerkトークンを付けて`GET /api/chat`を呼び、ログイン中の本人のチャット履歴を取得します。

```ts
fetchChatHistory(
  token,
  conversationId,
)
```

- `conversationId`なし：本人のチャットルーム一覧を取得します。
- `conversationId`あり：一覧に加えて、指定したチャットのメッセージを取得します。

```ts
const query = conversationId
  ? `?conversationId=${encodeURIComponent(
      conversationId,
    )}`
  : '';
```

三項演算子`条件 ? A : B`を使い、チャットIDがある場合だけURLへ検索条件を追加しています。

`encodeURIComponent()`は、値にURLで特別な意味を持つ文字が含まれても壊れないよう、安全なURL用文字列へ変換します。

```text
スマホのfetchChatHistory()
→ GET /api/chat
→ Clerkで本人確認
→ Neonから本人のチャットだけを検索
→ conversationsとmessagesをJSONで返す
```

通信関数・TypeScriptのデータ型・`ChatHistoryContext`への保存・画面を開いたときの自動取得まで実装済みです。

## 取得したチャット履歴をStateへ保存する

担当ファイルは`mobile/src/contexts/ChatHistoryContext.tsx`です。

`replaceConversations()`は、現在のチャット一覧をNeonから取得した一覧へ丸ごと置き換えます。

`setConversationMessages()`は、`map()`で全チャットを確認し、指定したIDのチャットだけ`messages`を取得結果へ変更します。

```text
fetchChatHistory()が履歴を取得
→ replaceConversations()が一覧をStateへ保存
→ 利用者がチャットを選択
→ setConversationMessages()がその会話のメッセージをStateへ保存
→ chat.tsxがStateを吹き出しとして表示
```

この2つはNeonへ直接接続する関数ではありません。APIから受け取ったデータを、Reactの画面が利用できるStateへ入れる役割です。

## チャット画面を開いたときの履歴復元

担当ファイルは`mobile/src/app/chat.tsx`です。

チャット画面では、次の2段階で履歴を取得します。

```text
1回目：チャットルームの一覧だけを取得
↓
最初のチャット、または利用者が選んだチャットを決める
↓
2回目：選ばれたチャットのメッセージだけを取得
↓
質問とAI回答を吹き出しで表示
```

一覧と全メッセージを一度に取得しない理由は、過去の会話が増えたときに大量の文章を毎回ダウンロードしないためです。最初はタイトルなどの軽い情報だけを取得し、開く会話の本文だけを後から取得します。

### 日付を画面用の数値へ変換する

```ts
function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}
```

`value`にはAPIから届いた日付文字列が入ります。

`Date.parse(value)`は日付文字列を、React側で比較や並び替えに使いやすいミリ秒の数値へ変換します。

`Number.isNaN(timestamp)`は、変換結果が正しい数値ではないかを確認します。

`条件 ? A : B`は三項演算子です。変換に失敗した場合は現在時刻の`Date.now()`、成功した場合は変換済みの`timestamp`を返します。

### チャット一覧を取得する`useEffect`

```ts
useEffect(() => {
  if (!isLoaded || !isSignedIn) return;

  // この中でfetchChatHistory(token)を実行する
}, [isLoaded, isSignedIn, replaceConversations]);
```

`useEffect()`は、画面表示後に通信などの処理を実行するReactの機能です。

`!isLoaded`はClerkのログイン状態をまだ確認中、`!isSignedIn`は未ログインという意味です。本人確認前には履歴APIを呼びません。

`fetchChatHistory(token)`は`conversationId`を渡していないため、本人のチャットルーム一覧だけを取得します。

取得した`response.conversations`へ`.map()`を使い、APIのデータを画面用の`ChatConversation`へ1件ずつ変換します。

```ts
const loadedConversations = response.conversations.map((conversation) => ({
  id: conversation.id,
  serverConversationId: conversation.id,
  title: conversation.title,
  messages: [],
  updatedAt: toTimestamp(conversation.updatedAt),
}));
```

`conversation`は、`.map()`が現在処理しているチャット1件です。そのため、かっこの中では`conversation.id`や`conversation.title`を使用します。

`messages: []`が空なのは、この段階では一覧だけを取得しているためです。本文は選ばれたチャットに対して次の`useEffect`が取得します。

`replaceConversations(loadedConversations)`は、React Context内の一覧をNeonから取得した最新の一覧へ置き換えます。

`setActiveId()`は、今まで選んでいたチャットが一覧に残っていればそのIDを使い、なければ一覧の先頭を選びます。

### 選択したチャットのメッセージを取得する`useEffect`

```ts
const localConversationId = activeConversation?.id ?? null;
const serverConversationId = activeConversation?.serverConversationId ?? null;
```

`activeConversation?.id`の`?.`は、チャットが存在するときだけ`id`を読むという意味です。存在しない場合にエラーを起こさず`undefined`になります。

`?? null`は、左側が`null`または`undefined`なら`null`を使うという意味です。

```ts
const response = await fetchChatHistory(
  token,
  selectedServerConversationId,
);
```

今回は`conversationId`を渡すため、`GET /api/chat?conversationId=...`となり、選択した会話のメッセージも取得します。

`await`はAPIの返事が届くまで、この非同期処理の続きだけを待たせます。アプリ全体を停止する命令ではありません。

```ts
const loadedMessages: ChatMessage[] = response.messages.map((message) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: toTimestamp(message.createdAt),
}));
```

ここでも`.map()`を使い、Neonから届いたメッセージをReact画面で使う`ChatMessage`形式へ1件ずつ変換します。

`role`は発言者です。`user`なら利用者の吹き出し、`assistant`ならAIの吹き出しとして表示します。

`setConversationMessages(selectedLocalConversationId, loadedMessages)`は、選択中のチャットだけへ取得した本文を保存します。

### `useRef`で二重取得を防ぐ

```ts
const loadedMessageConversationIds = useRef(new Set<string>());
```

`useRef()`は、画面が再描画されても値を残しつつ、その値を変更しても再描画を起こさないReactの機能です。

`Set<string>`は、同じ文字列を重複して持たない入れ物です。ここには取得済みのNeonチャットIDを保存します。

すでにIDが`Set`へ入っているチャットは再通信しないため、同じメッセージを何度も取得することを防ぎます。

```ts
const messageRequestId = useRef(0);
```

これはメッセージ取得通信へ順番の番号を付ける値です。利用者がすぐ別チャットへ切り替えた場合でも、古い通信ではなく現在の通信が終わったときだけローディング表示を消します。

### `getTokenRef`が必要な理由

```ts
const getTokenRef = useRef(getToken);

useEffect(() => {
  getTokenRef.current = getToken;
}, [getToken]);
```

`getToken`はClerkから認証トークンを取得する関数です。

この関数そのものを履歴取得用`useEffect`の監視対象にすると、画面の再描画時に関数が変わったと判断され、通信が途中から繰り返される場合があります。

そこで最新の`getToken`を`getTokenRef.current`へ保持します。認証関数は最新のものを使いながら、履歴通信はログイン状態や選択チャットが本当に変わったときだけ動かします。

今回「保存済みのチャットを読み込んでいます…」が消えなかった主な原因は、この通信の再実行と古い通信の終了処理が重なっていたことです。

### `cancelled`の役割

```ts
let cancelled = false;

return () => {
  cancelled = true;
};
```

`useEffect`の対象が変わったり画面を閉じたりすると、`return`内の後片付けが実行されます。

古い通信の返事が後から届いても、`cancelled`が`true`なら古い結果で現在の画面を上書きしません。

### `useCallback`をContextで使う理由

担当ファイルは`mobile/src/contexts/ChatHistoryContext.tsx`です。

```ts
const replaceConversations = useCallback((loadedConversations) => {
  setConversations(loadedConversations);
}, []);
```

`useCallback()`は関数を再利用し、再描画のたびに別の関数として作り直されることを防ぎます。

`replaceConversations`や`setConversationMessages`が毎回別の関数になると、それらを監視する`useEffect`が不要に再実行される可能性があります。チャット一覧・作成・削除・メッセージ追加・サーバーID保存の各関数を`useCallback`で安定させています。

## チャット履歴復元の動作確認結果

ブラウザでチャット画面を再読み込みし、次を確認しました。

- Neonに保存された4件のチャットタイトルが履歴メニューへ表示される。
- 最初の保存済みチャットの利用者メッセージとAI回答が自動表示される。
- 履歴メニューから別のチャットを選ぶと、そのチャットのメッセージだけを取得して表示できる。
- 読み込み完了後に「保存済みのチャットを読み込んでいます…」が消える。
- TypeScriptの型チェック`npx tsc --noEmit`が成功する。

チャットの保存・取得・画面復元・Neonからの削除まで完成です。

## チャットをNeonから削除する機能

この機能の目的は、画面で削除したチャットがアプリ再読み込み後に復活しないようにすることです。

担当ファイルは次の3つです。

- `app/api/chat/route.ts`：本人確認を行い、Neonからチャットを削除します。
- `mobile/src/lib/chatApi.ts`：スマホから削除APIを呼びます。
- `mobile/src/app/chat.tsx`：削除ボタンと通信中・失敗時の表示を管理します。

処理の流れは次のとおりです。

```text
利用者が削除ボタンを押す
↓
スマホがClerkトークンとチャットIDを送る
↓
DELETE /api/chatがログイン中の本人を確認
↓
Neonで「チャットID」と「本人のClerk ID」が両方一致する行を探す
↓
一致した本人のチャットだけを削除
↓
子テーブルのメッセージも自動削除
↓
成功した場合だけReactの画面から削除
```

### バックエンドの`DELETE()`

```ts
export async function DELETE(request: Request) {
```

`export`はNext.jsのRoute Handlerへ、この関数がHTTPのDELETEリクエストを担当すると伝えます。

`async`は、本人確認やNeon通信のような時間のかかる処理で`await`を使える関数にします。

`request`には、スマホから届いた認証情報とJSONが入っています。

```ts
const clerkUserId = await getClerkUserId(request);
```

リクエストのClerkトークンを確認し、ログイン中の本人のClerkユーザーIDを取得します。これは再ログイン処理ではなく、今回の削除要求を送った人が誰かをAPI側で確認する処理です。

```ts
const body = (await request
  .json()
  .catch(() => null)) as DeleteChatRequestBody | null;
```

`request.json()`はスマホから送られたJSONをJavaScript・TypeScriptで使えるデータへ変換します。

`.catch(() => null)`は、不正なJSONだった場合にAPI全体を突然終了させず`null`として扱います。

`as DeleteChatRequestBody | null`は、TypeScriptへ「この値は削除用データ、または`null`です」と型を伝えています。データを変換・保存する命令ではありません。

```ts
const conversationId =
  body?.conversationId?.trim() ?? "";
```

`body?.conversationId`は、`body`が存在するときだけチャットIDを取得します。

`.trim()`は文字列の前後の空白を削除します。

`?? ""`は値が`null`または`undefined`なら空文字を使用します。空文字の場合はHTTP 400を返し、削除処理へ進みません。

### 他人のチャットを削除させない検索条件

```ts
.where(
  and(
    eq(chatConversations.id, conversationId),
    eq(users.clerkUserId, clerkUserId),
  ),
)
```

`eq(A, B)`はAとBが等しいという検索条件です。

`and(条件1, 条件2)`は、両方の条件を満たす行だけを対象にします。

ここでは「送られたチャットID」と「ログイン中の本人のClerk ID」の両方が一致する必要があります。他人のチャットIDだけを知っていても、Clerk IDが一致しないため削除できません。

一致しない場合はHTTP 404を返します。本人のデータではないことを細かく教えず、チャットが見つからないものとして扱います。

### 親チャットと子メッセージの削除

```ts
await db
  .delete(chatConversations)
  .where(
    eq(
      chatConversations.id,
      matchedConversation.id,
    ),
  );
```

`.delete(chatConversations)`は親テーブル`chat_conversations`から削除します。

`.where(...)`があるため、確認済みの1つのチャットだけが対象です。`where`なしで削除すると全チャットが対象になる危険があるため、削除処理では特に重要です。

`chat_messages.conversationId`には次の設定があります。

```ts
.references(() => chatConversations.id, {
  onDelete: "cascade",
})
```

`onDelete: "cascade"`は、親チャットを削除したとき、そのチャットに属する子メッセージもPostgreSQLが自動削除する設定です。そのため、メッセージを1件ずつ削除するコードは不要です。

### スマホからDELETE APIを呼ぶ

担当ファイルは`mobile/src/lib/chatApi.ts`です。

```ts
export async function deleteChatConversation(
  token: string,
  conversationId: string,
) {
```

`token`はログイン中の本人を証明するClerkトークンです。

`conversationId`はNeonから削除するチャットルームのIDです。

```ts
return apiRequest<DeleteChatResponse>(
  '/api/chat',
  {
    method: 'DELETE',
    token,
    body: JSON.stringify({ conversationId }),
  },
);
```

`method: 'DELETE'`で削除リクエストだとバックエンドへ伝えます。

`JSON.stringify()`はTypeScriptのオブジェクトを、HTTP通信で送れるJSON文字列へ変換します。

`apiRequest<DeleteChatResponse>`の`<DeleteChatResponse>`は、成功時に返るデータの型をTypeScriptへ伝えています。

### 削除ボタンを押した後の`removeChat()`

担当ファイルは`mobile/src/app/chat.tsx`です。

```ts
const conversation =
  conversations.find((chat) => chat.id === id) ?? null;
```

`.find()`はチャット一覧を先頭から確認し、押された画面内IDと一致するチャット1件を取得します。見つからなければ`?? null`によって`null`になります。

```ts
if (!conversation.serverConversationId) {
  deleteConversation(id);
  return;
}
```

まだメッセージを送っていない新規チャットにはNeon側IDがありません。Neonに存在しないためAPIを呼ばず、画面上のStateだけから削除します。

保存済みチャットでは、次の順番を守ります。

```text
deleteChatConversation()でNeonから削除
↓
成功
↓
deleteConversation()で画面から削除
```

先に画面から消すと、Neon通信に失敗した場合も削除できたように見え、再読み込み後に復活します。そのため、サーバーでの成功後に画面を更新します。

`deletingConversationId`には削除中のチャットIDを保存します。値が入っている間は他の削除ボタンを無効化し、対象のボタンを「削除中…」へ変更します。

`try`は削除通信を試す場所、`catch`は失敗メッセージを表示する場所、`finally`は成功・失敗のどちらでも削除中状態を解除する場所です。

### チャット削除機能の確認結果

- スマホ版のTypeScript型チェックに成功しました。
- 今回変更したチャット3ファイルのESLintチェックに成功しました。
- 未送信の新規チャットを画面から削除できました。
- 保存済み4件に削除ボタンが表示されることを確認しました。
- 認証なしで`DELETE /api/chat`を呼ぶとHTTP 401と「ログインが必要です。」が返り、削除が拒否されました。
- 既存の保存済みチャットは、安全のため動作確認中には削除していません。

バックエンド全体の`npx tsc --noEmit`は、今回の変更とは別の既存Cloudflare設定`vite.config.ts`と`worker/index.ts`の型エラーで停止します。今回変更したチャットファイルはESLint、スマホ側はTypeScriptで検査済みです。

## AIチャットの1日利用上限

開発中は`.env.local`の`AI_CHAT_DAILY_LIMIT=100`により、1人が1日に送信できるAIチャットの上限を100回にします。

`AI_CHAT_DAILY_LIMIT`はOpenAIが決めた無料回数ではなく、このアプリが使いすぎを防ぐために決める設定値です。OpenAI APIの料金は21回目や101回目から始まるのではなく、1回目から使用したトークン量に応じて残高から消費されます。

`process.env.AI_CHAT_DAILY_LIMIT`は`.env.local`の文字列を読み取り、`Number.parseInt(..., 10)`はその文字列を10進数の整数へ変換します。設定がない場合や不正な値の場合は、開発用の初期値`100`を使用します。

本番公開時はコードを変更せず、公開先の環境変数だけを`30`や`50`などへ変更できます。

AIメニュー生成はAIチャットと分けて、`.env.local`の`AI_MENU_DAILY_LIMIT=3`で1人1日3回に制限します。AIチャットの質問回数を使い切ってもAIメニュー回数は減らず、その逆も同じです。

### AIメニューの1日3回制限

`app/api/ai-menu/route.ts`は、OpenAIへ生成依頼を送る前に`ai_generated_menus`を検索します。

```text
Clerkで本人を確認
↓
フロント入力を検証
↓
日本時間の今日0時と明日0時を計算
↓
本人が今日生成したメニュー数をNeonで数える
↓
3回未満ならOpenAIで生成／3回以上ならHTTP 429で終了
```

`aiGeneratedMenus`には`userId`と`createdAt`が保存されているため、本人と今日の時間範囲を条件にして直接数えられます。AIチャットのようにメッセージからチャットルームを経由して本人を探す必要はありません。

上限到達時は`limit`、`used`、`remaining`、`nextAvailableAt`と`Retry-After`を返します。生成成功時は今回の1回を加算し、`usage`として残り回数とリセット日時をフロントへ返します。

この判定をOpenAI通信より前に置くことで、4回目以降はOpenAI料金が発生しません。`npx eslint app/api/ai-menu/route.ts`でエラーがないことも確認済みです。

### AIリクエストの5秒クールダウン

`.env.local`の`AI_REQUEST_COOLDOWN_SECONDS=5`は、AIチャットの質問またはAIメニュー生成の直後に、同じ利用者が連続してリクエストするのを5秒間止める設定です。

AIチャットは最新の利用者メッセージ、AIメニューは最新の生成メニューについて、Neonに保存された`createdAt`を確認します。

`max(createdAt)`は条件に一致する日時の中から最も新しい日時を1件だけ取得します。`count()`と同じ検索に含めているため、回数と最新日時を別々に検索する必要がありません。

```text
Neonから今日の件数と最新日時を取得
↓
最新日時 + 5秒を計算
↓
現在時刻がそれより前ならHTTP 429
↓
5秒以上経過していれば通常処理へ進む
```

拒否時には`Retry-After`、待ち秒数、次回利用可能日時を返すため、フロントは「あと何秒待つか」を表示できます。

この処理は、すでにNeonへ保存された直近の操作を基準にする連続送信対策です。ほぼ同時に到着した2つのリクエストは、どちらも保存前の状態を読む可能性があるため、完全な二重送信対策は別途リクエストIDを使って追加します。

### 二重送信を防ぐai_request_guardsテーブル

`db/schema.ts`の`aiRequestGuards`は、AI処理を開始したリクエストの受付番号をNeonへ保存するための設計図です。

- `userId`：誰の操作かを表す
- `requestType`：`chat`と`menu`を区別する
- `requestId`：1回のボタン操作ごとにフロントが作るUUID
- `createdAt`：受付記録を作った日時

`uniqueIndex()`は、`userId`・`requestType`・`requestId`の同じ組み合わせを2回登録できなくします。1件目だけが登録に成功してOpenAIへ進み、同じ受付番号の2件目はOpenAIを呼ぶ前に拒否できるようにします。

`index()`は重複禁止ではなく、本人の古い受付記録を日時順で検索・削除しやすくする索引です。`uniqueIndex()`と`index()`は名前が似ていますが、目的が異なります。

`mobile`ではExpo公式の`expo-crypto`を使い、`Crypto.randomUUID()`でボタン操作ごとのUUIDを作ります。`useRef`にも処理中のIDを保存するため、Reactの画面更新を待たずに同じ画面内の2回目の関数実行を止めます。

チャットAPIとAIメニューAPIは、受け取った`requestId`をOpenAI通信より前に`ai_request_guards`へ追加します。

`.onConflictDoNothing()`は、ユニーク索引と同じ組み合わせがすでに存在してもサーバーをクラッシュさせず、追加しない処理です。`.returning()`で新しい受付記録が返れば1件目、何も返らなければ重複した2件目だと判断します。

```text
スマホでUUIDを1つ作る
↓
バックエンドへrequestIdとして送る
↓
ai_request_guardsへ追加を試す
↓
追加成功：OpenAIへ進む
追加なし：HTTP 409で終了
```

途中でOpenAI通信や保存に失敗した場合は、その受付記録を削除します。これにより、エラー後に同じ操作を正しく再試行できます。成功時の受付記録は残すため、通信結果が遅れて同じリクエストが再到着しても二重処理しません。

マイグレーション`0005_add_ai_request_guards.sql`は、既存テーブルを再作成せず、新しいテーブル・外部キー・2つの索引だけを作る内容に確認・修正済みです。`drizzle-kit check`、バックエンドESLint、スマホTypeScript検査は成功しています。

Neonへの反映確認時に、Neonプロジェクトのデータ転送量上限超過による`HTTP 402`が返りました。そのため、コードとマイグレーションは完成していますが、実際のNeonへの適用と二重送信の実通信テストは上限回復後に行います。

### OpenAI通信のタイムアウトと再試行

`app/lib/ai/openAiClient.ts`は、AIチャットとAIメニューが共通で使うOpenAIクライアントを作るTypeScriptファイルです。

`.env.local`では次の値を設定します。

```env
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=1
```

`OPENAI_TIMEOUT_MS=60000`は、OpenAIへの1回の通信を最大60秒待つ設定です。`OPENAI_MAX_RETRIES=1`は、一時的な通信エラーやタイムアウトが起きた場合にSDKへ最大1回だけ自動再試行させる設定です。そのため、再試行が発生した場合の全体時間は60秒より長くなる可能性があります。

`readPositiveInteger()`は、タイムアウトが1以上の整数かを確認します。`readNonNegativeInteger()`は、再試行回数として`0`も許可しながら、負数や不正な文字列を拒否します。環境変数が不正なら、それぞれ`60_000`と`1`を安全な初期値として使用します。

```text
チャットまたはAIメニューAPI
↓
共通のopenaiクライアントを使用
↓
60秒以内に応答：通常処理
一時エラー：最大1回再試行
タイムアウト：受付記録を削除してHTTP 504
```

`APIConnectionTimeoutError`はOpenAI SDKが通信時間超過時に投げる専用エラーです。通常のサーバーエラーと区別し、フロントへ「少し待って再試行してください」と返します。

共通ファイルにまとめた理由は、チャットとメニューでタイムアウト値・再試行回数・APIキー設定がずれるのを防ぐためです。設定変更は環境変数またはこの共通ファイルだけで済みます。

### TypeScriptからPython身体分析APIへのタイムアウト

`app/api/body-analysis/route.ts`は、正面・横・背面画像をRender上のPython APIへ送ります。`.env.local`の`PYTHON_ANALYSIS_TIMEOUT_MS=120000`により、Pythonからレスポンス本文を受け取るまで最大120秒待ちます。

```text
TypeScriptが画像3枚をPythonへ送信
↓
120秒のタイマーを開始
↓
Pythonの応答とJSON取得が完了：タイマー解除
120秒を超過：通信を中止してHTTP 504
```

`AbortController`は実行中の`fetch()`を外側から中止するための機能です。`pythonAbortController.signal`を`fetch()`へ渡し、`setTimeout()`が120秒後に`.abort()`を呼びます。

`let analysisResult: unknown`とする理由は、Pythonから届いたJSONをまだ信用できないためです。取得後に`isBodyAnalysisResult()`で必要な項目・型・スコア範囲を検査してからNeonへ保存します。

`finally`は成功・通常エラー・タイムアウトのどの場合でも必ず実行されます。`clearTimeout()`で不要になったタイマーを解除し、処理終了後にタイマーだけが残ることを防ぎます。

タイムアウト時は専用の`PythonAnalysisTimeoutError`へ変換し、通常の内部エラー`500`ではなく`HTTP 504`を返します。`504`は、このTypeScript APIより先にあるPython APIが時間内に応答しなかったことを表します。

### PythonからOpenAIへのタイムアウトと安全な再試行

`python-analysis/app/main.py`は、Render上で身体画像をOpenAIへ渡すPython APIです。OpenAI Python SDKの既定値は待ち時間が長く、再試行も2回なので、このアプリでは次の値へ明示的に制限します。

```env
PYTHON_OPENAI_TIMEOUT_SECONDS=50
PYTHON_OPENAI_MAX_RETRIES=1
```

`PYTHON_OPENAI_TIMEOUT_SECONDS=50`は、PythonからOpenAIへの1回の通信を最大50秒待つ設定です。

`PYTHON_OPENAI_MAX_RETRIES=1`は、一時的な失敗時だけ追加で1回試す設定です。最初の1回と再試行1回を合わせ、最大2回OpenAIへ接続する可能性があります。

Python側を50秒、外側のTypeScript側を120秒にした理由は、次のように内側の処理が先に終了し、TypeScriptがPythonからエラーJSONを受け取るための余裕を残すためです。

```text
TypeScriptからPython：全体を最大120秒待つ
└─ PythonからOpenAI：1回最大50秒、再試行は最大1回
```

`AsyncOpenAI(timeout=..., max_retries=...)`は、待ち時間と再試行回数を身体分析で使うOpenAIクライアント全体へ適用します。

`read_positive_float_env()`は待ち時間が0より大きい数値かを確認し、`read_non_negative_int_env()`は再試行回数が0以上の整数かを確認します。Renderの環境変数に文字や負数を誤って入れても、Pythonが起動時に落ちず、安全な初期値の50秒・1回へ戻します。

OpenAI SDKが再試行するのは、接続エラー、HTTP 408、409、429、500番台などの一時的に回復する可能性がある失敗です。入力ミスや認証設定の失敗など、同じ内容を送り直しても直らないエラーは再試行しません。すべての`Exception`を自作ループで再送しないのは、無駄な待ち時間とAPI料金を増やさないためです。

### PythonのOpenAIエラーをHTTP番号へ変換する

`try:`の中で`responses.parse()`を実行し、OpenAI通信だけを専用の`except`で分類します。

- `APITimeoutError`：OpenAIが時間内に返らなかったためHTTP 504
- `APIConnectionError`：OpenAIへ接続できなかったためHTTP 503
- `RateLimitError`：利用制限や混雑のためHTTP 429
- `APIStatusError`の500番台：OpenAI側の一時障害としてHTTP 502
- 認証エラー：利用者へ秘密情報を見せずHTTP 500

`raise HTTPException(...) from error`の`from error`は、利用者へ返す安全なエラーと、サーバーログで原因調査に使う元のエラーを結び付けます。

### Render停止中のエラーを分かりやすく返す

`PythonAnalysisUnavailableError`は、TypeScriptからRender上のPython APIへ接続そのものができない場合に使う専用エラーです。

Renderが停止中・起動中・ネットワーク障害の場合、`fetch()`は正常なHTTPレスポンスを受け取れません。そのときはHTTP 503と「身体分析サービスを起動中、または一時的に利用できません」というメッセージをフロントへ返します。

`PythonAnalysisApiError`は、Pythonへは接続できたものの、PythonまたはOpenAIがエラーを返した場合に使います。Pythonの`detail`を読み、413・429・504などの意味を保ってフロントへ返します。

```text
Renderへ接続できない
→ PythonAnalysisUnavailableError
→ HTTP 503

Renderへ接続できたがOpenAIがタイムアウト
→ PythonがHTTP 504を返す
→ PythonAnalysisApiError
→ フロントにもHTTP 504を返す
```

### 画像容量を3段階で統一する

画像容量は、役割の違う3つの上限へ統一しました。

- スマホ・TypeScript・Python：画像1枚につき8MB以下
- TypeScript・Python：画像3枚そのものは合計24MB以下
- Vinextの入口：FormDataの付加情報も含む通信全体を26MB以下

26MBは画像1枚の上限ではありません。8MBの画像3枚で最大24MBになり、ファイル名や区切り情報など`multipart/form-data`の付加情報を通すため、入口だけ2MBの余裕を持たせています。

同じ検査をTypeScriptとPythonの両方で行う理由は、通常のアプリ経由では早くエラーを返し、Python APIが直接呼ばれた場合にも不正な画像を拒否するためです。

### 質問回数を確認する処理の流れ

`POST()`は質問を保存してOpenAIへ送る前に、次の順番で利用回数を確認します。

```text
Clerkでログイン中の本人を確認
↓
getJapanDayRange()で日本時間の今日0時と明日0時を作る
↓
chatMessagesとchatConversationsをinnerJoin()でつなぐ
↓
本人・userロール・今日の範囲だけに絞る
↓
count()で今日の質問数を数える
↓
上限未満ならOpenAIへ進む／上限以上ならHTTP 429で終了
```

`count(chatMessages.id)`は、条件に一致した質問メッセージの件数を数えます。

`innerJoin()`が必要なのは、`chatMessages`にはユーザーIDがなく、所属するチャットルームのIDだけが保存されているためです。`chatConversations`とつなぐことで、その質問がログイン中の本人のものか確認できます。

`eq(chatMessages.role, "user")`は利用者の質問だけを対象にし、AIの回答を利用回数へ含めない条件です。

`gte(chatMessages.createdAt, start)`は作成日時が今日0時以降、`lt(chatMessages.createdAt, end)`は明日0時より前という意味です。この2つを組み合わせて今日の質問だけを数えます。

上限に達した場合は`HTTP 429`、`Retry-After`、次回利用可能日時を返し、OpenAIを呼びません。成功した場合は今回の質問を`+ 1`し、`usage`として上限・使用回数・残り回数・リセット日時をフロントへ返します。

今回の`app/api/chat/route.ts`は`npx eslint app/api/chat/route.ts`で検査し、エラーがないことを確認済みです。

## AIチャットのSystem PromptとTool選択

`app/lib/ai/systemPrompt.js`は、AIの役割・回答方針・安全上のルール・Toolを使う判断基準を書くJavaScriptファイルです。

このファイル自体はNeonからデータを取得しません。AIが質問を読んで必要なToolを選ぶための「説明書」です。

```text
systemPrompt.js
→ AIが必要なToolを判断
→ chatTools.tsに定義されたToolを選択
→ runChatTool.tsがToolを実行
→ Clerk IDで本人を特定
→ Neonから本人のデータを取得
→ AIが取得結果を使って回答
```

プロフィール取得の実通信テストでは「私の目標体型と身体情報を教えて」と質問し、`get_user_profile`を通してNeonに保存された目標体型・身長・体重・頻度・可能時間・場所・苦手部位が回答へ反映されることを確認済みです。

## AIチャットToolの実通信テスト結果

AIチャットで利用する4つのToolは、すべてスマホ画面から実通信で動作確認済みです。

- `get_user_profile`：目標体型、身長、体重、頻度、可能時間、場所、苦手部位を取得できました。
- `get_latest_body_analysis`：最新の分析日、全体評価、部位別スコア、優先部位、提案を取得できました。
- `get_recent_training_records`：最近実施した部位・種目・セットなどを取得し、次に鍛える部位の判断へ使用できました。
- `get_latest_ai_menu`：最後に生成した部位、理由、推定時間、種目、回数、セット、休憩、注意点を取得できました。

ToolにはClerkユーザーIDを直接AIから渡しません。`route.ts`で認証できた本人のClerk IDを`runChatTool()`へ渡し、そのIDに一致するデータだけをNeonから検索します。これにより、AIが別の利用者のIDを指定してデータを取得することを防いでいます。

## TypeScriptバックエンドをCloudflareへ公開する準備

### 公開サービスの役割分担

筋トレPASでは、すべてを1つのサービスへ無理にまとめず、得意な役割で分けます。

```text
Expoスマホアプリ
↓
Cloudflare：TypeScriptバックエンド
├─ Clerk認証
├─ Neonへの保存・取得
├─ AIチャット
├─ AIメニュー
└─ 身体分析の受付
     ↓
Render：Python身体画像分析
     ↓
OpenAI
```

現在のプロジェクトは`Vinext`、Cloudflare Viteプラグイン、`worker/index.ts`を使用しており、Cloudflare Worker向けの構成がすでにあります。そのため、TypeScriptはCloudflareへ公開し、作成済みのPython分析APIはRenderで継続します。

### `vite.config.ts`の古い開発設定を削除

`localBindingConfig`にあった古い`dev.inspector`・`dev.server`設定は、現在のCloudflare型定義と一致せずTypeScriptエラーになっていました。

同じWi-Fi上のスマホから開発サーバーへ接続する設定は、Vite側の`server.host = "0.0.0.0"`ですでに行っています。そのため、重複していた古い`dev`部分だけを削除し、LAN接続機能は残しました。

`vinext({ nextConfig })`は現在のVinextでは`next.config.ts`の自動読込と重複するため、`vinext()`へ変更しました。画像通信の`bodySizeLimit: "26mb"`は引き続き`next.config.ts`から自動で読み込まれます。

### `worker/index.ts`のCloudflare型エラー

`Fetcher`と`D1Database`はCloudflare専用のグローバル型ですが、このプロジェクトのTypeScript設定には定義がありませんでした。

筋トレPASのデータベースはD1ではなくNeonなので、未使用の`DB: D1Database`を削除しました。

`ASSETS`は実際に使用する`.fetch()`だけを次のローカル型で表します。

```typescript
ASSETS: {
  fetch(request: Request): Promise<Response>;
};
```

これは「`ASSETS`にはRequestを受け取り、後でResponseを返す非同期の`fetch()`がある」とTypeScriptへ教える型です。不要なCloudflare型パッケージを追加せず、実際に使用する機能だけを定義しています。

修正後は`npx tsc --noEmit`と`npm run build`の両方が成功しました。

### 公開APIのヘルスチェック

担当ファイルは`app/api/health/route.ts`です。

`GET /api/health`は、公開中のTypeScriptバックエンドが起動しているかを確認するAPIです。Clerk認証、Neon、OpenAIを呼ばないため、ログイン前でも確認でき、AI料金も発生しません。

```json
{
  "status": "ok",
  "service": "musclepas-api",
  "environment": "production",
  "checkedAt": "確認した時刻"
}
```

`Cache-Control: no-store`は、ブラウザや中継サービスに古い成功結果を保存させず、毎回その時点のサーバー状態を確認する指定です。

### 開発環境と本番環境を分ける

Macで動かす開発環境は`.env.local`の`APP_ENV=development`と各種設定を使用します。

Cloudflare上の本番環境は、Sitesへ登録した`APP_ENV=production`と環境変数を使用します。秘密鍵はGit管理ファイルや`.openai/hosting.json`へ書かず、Sitesの秘密設定として保存します。

現在、Neon・Clerk・Render URL・タイムアウト・利用回数上限は本番環境へ登録済みです。`OPENAI_API_KEY`はOpenAI Developers連携から安全に登録した後、公開を行います。
