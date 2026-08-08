# MUSCLE PATH コードガイド

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
| 理想の体 | 4種類の画像表示、体型選択、localStorage保存、参考画像プレビューまで実装済み |
| 身体分析 | 表示用カードのみ |
| トレーニング記録 | 専用画面への遷移、190種目の固定カタログ、詳細部位カード、種目の「もっと見る」まで実装済み |
| AIメニュー | 表示用カードのみ |
| ダッシュボード | 表示用カードのみ |
| AIチャット | 専用画面、入力、会話表示、バックエンド通信、OpenAIへの送信と回答表示まで実装済み |

OpenAIの回答は`aiResponse`へ保存し、`output_text`を`reply`としてフロントエンドへ返します。

# 1. ファイル構成

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

## 12-1. バックエンドで使用している技術

| 技術 | 何をするものか | 現在の状態 |
| --- | --- | --- |
| Next.js Route Handler | `app/api`内へGET・POSTなどのAPIを作る | AIチャットAPIで使用中 |
| Vinext | Next.js形式のアプリをVite・Cloudflare Workers環境で動かす | 使用中 |
| TypeScript | DB設定やテーブル定義を型付きで書く | `db`と設定ファイルで使用中 |
| Neon PostgreSQL | ユーザー情報・記録・会話を永続保存するデータベース | 接続設定とusersテーブル設計まで完了 |
| Drizzle ORM | TypeScriptからPostgreSQLの保存・取得・更新・削除を行う | DB接続とusersテーブル定義まで実装済み |
| Drizzle Kit | テーブル設計からマイグレーションファイルを作り、DBへ適用する | PostgreSQL用設定済み・マイグレーションは未生成 |
| `@neondatabase/serverless` | Cloudflare WorkersなどからNeonへHTTP接続するドライバー | インストール済み |
| `dotenv` | マイグレーションコマンドから`.env.local`を読み込む | インストール済み |
| OpenAI SDK | 質問やユーザーデータをOpenAI APIへ送り、AI回答を受け取る | 基本チャットで使用中 |
| JSON | フロントエンドとバックエンド間でデータを送受信する形式 | チャットAPIで使用中 |
| ChatGPT認証ヘルパー | 認証済み利用者のメールアドレスと表示名を取得する | ファイルは存在するが各APIへ未接続 |
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
| `app/api/.../route.js` | フロントエンドからの通信を受け取り、DBやAIを操作する |
| `app/lib/ai/systemPrompt.js` | AIの役割・回答ルール・禁止事項を定義する |
| `app/chatgpt-auth.ts` | 認証済みユーザーの情報を取得する共通機能 |

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
| 初回起動判定 | 初回設定が完了しているか返す | 保存項目の設計まで完了・APIは未実装 |
| ユーザー管理 | 認証情報とアプリ内ユーザーIDを結び付ける | usersテーブル設計まで完了・APIは未実装 |
| 理想体型 | 選択した目標体型をユーザーごとに保存・取得する | 保存項目の設計まで完了・APIは未実装 |
| プロフィール | 身長・体重・体脂肪率・可能時間などを保存する | 未実装 |
| 身体分析 | 身体データと分析結果を日付付きで保存する | 未実装 |
| トレーニング記録 | 種目・重量・回数・セット・時間・調子・メモを保存する | 未実装 |
| 記録履歴 | 日付やユーザーIDで過去記録を取得する | 未実装 |
| 体重記録 | 日付ごとの体重を保存し、グラフ用データを返す | 未実装 |
| 画像保存 | 参考画像・身体写真をストレージへ保存する | 未実装 |
| AIメニュー | 過去記録とプロフィールからメニューを生成・保存する | 未実装 |
| AIチャット | OpenAIへ質問を送り、回答を返す | 基本通信まで実装済み |
| チャット履歴 | ルーム・メッセージ・タイトルをユーザーごとに保存する | 未実装 |
| AI Tool | AIが目標・記録・プロフィールを必要に応じて取得する | 未実装 |
| 長期記憶 | 過去データを検索してAIへ渡し、回答と履歴を保存する | 未実装 |

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

# 13. 現在まだ実装していないこと

- 保存した目標体型を再読み込み後の選択表示へ反映する処理
- 参考画像の永続保存とサーバーへのアップロード
- 身体写真のAI分析
- トレーニング記録の重量・回数・セット入力、保存、履歴表示
- AIメニュー作成
- AIが他機能の共通データを取得するTool
- PostgreSQLの残りのテーブル、保存API、検索処理を使った長期記憶

次は`db/schema.ts`からPostgreSQL用マイグレーションファイルを生成し、実際に作成されるSQLを確認します。
