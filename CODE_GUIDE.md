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
| ChatGPT認証ヘルパー | 認証済み利用者のメールアドレスと表示名を取得する | ユーザー初期化APIと理想体型保存APIで使用中 |
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
| 初回起動判定 | 初回設定が完了しているか返す | 初期化API実装済み・Neon接続テスト成功 |
| ユーザー管理 | 認証情報とアプリ内ユーザーIDを結び付ける | 検索・新規登録API実装済み・Neon接続テスト成功 |
| 理想体型 | 選択した目標体型をユーザーごとに保存・取得する | 保存API実装済み・Neon接続テスト成功 |
| プロフィール | 身長・体重・体脂肪率・可能時間などを保存する | user_profilesテーブルをNeonへ作成済み・保存APIは未実装 |
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
heightCm: real("height_cm"),
```

`heightCm`には`172.5`のような小数を保存できます。

体重をキログラム単位で保存します。

```ts
weightKg: real("weight_kg"),
```

`weightKg`には`65.8`のような小数を保存できます。

体脂肪率をパーセント単位で保存します。

```ts
bodyFatPercentage: real(
  "body_fat_percentage",
),
```

`bodyFatPercentage`には`15.5`のような小数を保存できます。

3項目には`.notNull()`を付けていないため、すべて任意入力です。

```text
入力あり → 数値を保存
入力なし → nullを保存
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
| `heightCm` | `height_cm` | 任意 | 身長（cm） |
| `weightKg` | `weight_kg` | 任意 | 体重（kg） |
| `bodyFatPercentage` | `body_fat_percentage` | 任意 | 体脂肪率（%） |
| `weeklyTrainingDays` | `weekly_training_days` | 任意 | 週のトレーニング日数 |
| `availableMinutes` | `available_minutes` | 任意 | 1回に使える時間（分） |
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

任意入力の7項目は`null`を許可しています。

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

# 13. 現在まだ実装していないこと

- 保存した目標体型を再読み込み後の選択表示へ反映する処理
- 参考画像の永続保存とサーバーへのアップロード
- 身体写真のAI分析
- トレーニング記録の重量・回数・セット入力、保存、履歴表示
- AIメニュー作成
- AIが他機能の共通データを取得するTool
- PostgreSQLの残りのテーブル、保存API、検索処理を使った長期記憶

次は身体プロフィールAPIへGET関数を作り、最初にログイン情報を確認します。
