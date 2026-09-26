# 筋トレPAS コードガイド

最終更新：2026年9月21日

このガイドは、現在のコードを理解するための説明書です。

## 15日学習版はこちらから開始

長いガイドを毎回スクロールしなくてよいように、1日ずつ別ファイルへ分けました。

**[Day 1から学習を始める](CODE_GUIDE_DAYS/DAY_01.md)**

**[Day 1〜Day 15の一覧を開く](CODE_GUIDE_DAYS/README.md)**

各Dayの最後に「次のDayへ」があります。この`CODE_GUIDE.md`は、分からない項目を詳しく調べるための全体辞書として使います。

過去の作業順ではなく、アプリ全体の仕組みを上から順番に学べる構成にしています。

コードを読むときは、毎回次の3点を確認します。

1. どのファイルに書かれているか
2. そのコードが何をするか
3. なぜその場所に必要なのか

---

# 1. このアプリの全体像

筋トレPASは、画面・バックエンド・データベース・AI分析を組み合わせたアプリです。

```text
Expo / React Nativeの画面
        ↓ HTTPS通信
TypeScriptバックエンドAPI
        ↓
Neon PostgreSQL ── OpenAI API
        ↓              ↑
  長期保存      Python身体分析API
```

## それぞれの担当

### Expo / React Native

利用者が触るスマートフォン画面を作ります。

主な場所は`mobile/src/`です。

ここでは、ボタン、入力欄、画面遷移、読み込み表示などを担当します。

### TypeScriptバックエンド

画面から届いた通信を受け取り、認証、入力確認、保存、AI呼び出しを行います。

主な場所は`app/api/`と`app/lib/`です。

秘密鍵はバックエンドだけで使用し、スマホ側へ渡しません。

### Neon PostgreSQL

ユーザー情報や記録を長期間保存するデータベースです。

テーブルの設計は`db/schema.ts`にあります。

### Python身体分析API

正面・横・背面画像を検査し、OpenAIへ渡して身体分析結果を返します。

主な場所は`python-analysis/app/main.py`です。

### Clerk

ログインと本人確認を担当します。

ClerkのユーザーIDとNeonのユーザーを結び付けることで、他人のデータを表示しないようにします。

### OpenAI

AIチャット、AIメニュー、身体分析の文章生成を担当します。

APIキーはバックエンドとPython側だけに置きます。

### App Store課金

月額プランの購入と復元はiPhone側で開始します。

購入が本物かどうかは、バックエンドがAppleの署名を検証して判断します。

---

# 2. 使用している言語とファイルの違い

## TypeScript（`.ts`）

JavaScriptへ型を追加した言語です。

API通信、DB操作、入力データの型などに使います。

例：`app/api/chat/route.ts`、`mobile/src/lib/chatApi.ts`

```ts
type ChatResponse = {
  conversationId: string;
  reply: string;
};
```

この型は、チャットAPIからどの名前・種類の値が返るかを決めています。

## TSX（`.tsx`）

TypeScriptの中にReactの画面を書ける形式です。

例：`mobile/src/app/chat.tsx`

```tsx
<Text>{message.content}</Text>
```

`Text`はReact Nativeの画面部品です。

`{}`の中ではTypeScriptの値を表示できます。

## JavaScript（`.js`）

型を書かずに動く言語です。

このプロジェクトでは既存データやプロンプトの一部に残っています。

例：`app/lib/ai/systemPrompt.js`

新しい複雑な処理は、間違いに気付きやすいTypeScriptを基本にします。

## Python（`.py`）

身体画像の検査と画像対応AIへの受け渡しに使います。

例：`python-analysis/app/main.py`

TypeScriptとは別のサーバーとして動き、JSONで結果を返します。

## SQL（`.sql`）

Neonへテーブル変更を反映する命令です。

例：`drizzle-postgres/0012_orange_arclight.sql`

`schema.ts`は現在の完成設計、SQLマイグレーションは設計変更の履歴です。

---

# 3. フォルダ構成

```text
musslepas/
├── mobile/                 スマホアプリ
│   └── src/
│       ├── app/            画面
│       ├── components/     再利用する画面部品
│       ├── contexts/       複数画面で共有する一時状態
│       └── lib/            API通信・変換・種目データ
├── app/
│   ├── api/                バックエンドAPI
│   └── lib/                認証・AI・入力検査などの共通処理
├── db/
│   ├── index.ts            Neon接続
│   └── schema.ts           テーブル設計
├── drizzle-postgres/       DB変更履歴
├── python-analysis/        身体分析API
└── tests/                  バックエンドテスト
```

## `app`という名前が2つある理由

`mobile/src/app/`はスマホの画面です。

ルート直下の`app/api/`はバックエンドAPIです。

同じ`app`という名前でも担当が違います。

---

# 4. アプリ起動からホームまで

## 画面の流れ

```text
index.tsx
  ↓
auth-gate.tsx
  ↓
sign-in.tsx または bootstrap.tsx
  ↓
ideal-body.tsx
  ↓
profile-setup.tsx
  ↓
initial-analysis.tsx
  ↓
home.tsx
```

2回目以降は保存済み状態を確認し、基本的にホームへ進みます。

## `index.tsx`

ファイル：`mobile/src/app/index.tsx`

アプリのタイトルを短時間表示したあと、認証確認画面へ移動します。

```tsx
useEffect(() => {
  const timerId = setTimeout(
    () => router.replace('/auth-gate'),
    2500,
  );

  return () => clearTimeout(timerId);
}, [router]);
```

1行ずつ読むと次の意味です。

- `useEffect`は画面表示後に処理を実行します。
- `setTimeout`は2.5秒後に処理を実行します。
- `router.replace`は現在の画面を履歴に残さず切り替えます。
- `clearTimeout`は画面が消えた場合に予約処理を解除します。
- `[router]`は`router`が変わった場合だけEffectをやり直す指定です。

## `bootstrap.tsx`

ファイル：`mobile/src/app/bootstrap.tsx`

ログイン後のユーザーが、初回設定のどこまで終わっているかを確認します。

バックエンドの`POST /api/users/bootstrap`から状態を取得します。

```text
onboardingCompleted = true
→ ホーム

goalBodyTypeがない
→ 理想体型

profileCompleted = false
→ 身体情報

それ以外
→ 初回分析
```

bootstrapは「アプリ起動時の案内係」です。

データそのものを保存する機能ではありません。

---

# 5. React画面の基本形

## `useState`

画面内で変化する値を保存します。

```tsx
const [draftMessage, setDraftMessage] = useState('');
```

文の構造は次のとおりです。

- `const`で変数を定義します。
- `draftMessage`は現在の入力内容です。
- `setDraftMessage`は入力内容を変更する関数です。
- `useState('')`は最初の値を空文字にします。
- 配列の1番目と2番目を取り出す書き方を分割代入と呼びます。

## `onChangeText`

React Nativeの入力欄が変化したときに実行されます。

```tsx
<TextInput
  value={draftMessage}
  onChangeText={setDraftMessage}
/>
```

文字を入力するたびに、その文字列が`setDraftMessage`へ渡されます。

その結果、`draftMessage`へ最新の入力内容が入ります。

Web Reactの`event.target.value`と違い、React Nativeは文字列を直接受け取ります。

## `onPress`

ボタンを押したときの処理を指定します。

```tsx
<Pressable onPress={() => void sendMessage()}>
  <Text>送信</Text>
</Pressable>
```

- `onPress`は押下イベントです。
- `() =>`は押したときに実行する無名関数です。
- `sendMessage()`だけを書くと、画面表示中に実行される場合があります。
- `void`はPromiseの返り値をボタン側では使わないことを表します。

## 条件表示

```tsx
{error ? <Text>{error}</Text> : null}
```

`error`に文字がある場合だけ`Text`を表示します。

空文字なら`null`になり、何も表示しません。

## `.map()`

配列の各要素を画面部品へ変換します。

```tsx
entries.map((entry) => (
  <Text key={entry.id}>{entry.name}</Text>
))
```

- `entries`は食事記録の配列です。
- `.map()`は配列を先頭から1件ずつ処理します。
- `entry`には処理中の1件が入ります。
- 各記録を`Text`へ変換します。
- `key`はReactが各行を区別するIDです。

## `Object.keys()`

オブジェクトの項目名だけを配列で取り出します。

```ts
Object.keys(exercisesByBodyPart).map((bodyPart) => {
  // bodyPartには「胸」「背中」などが順番に入る
});
```

`map()`の丸括弧の中に`bodyPart`を書く理由は、1件ずつ受け取るためです。

変数名は自由ですが、中身が分かるように`bodyPart`と名付けています。

## `useEffect`

画面を開いたときや、指定した値が変化したときに処理します。

```tsx
useEffect(() => {
  void loadHome();
}, [loadHome]);
```

この例は、画面表示時と`loadHome`が変わったときにホーム情報を取得します。

## `useCallback`

関数を再利用し、不要な作り直しを減らします。

```tsx
const loadHome = useCallback(async () => {
  // API通信
}, []);
```

特に`useEffect`から呼ぶ関数で使います。

## `useRef`

再描画しても保持したい値を保存します。

```tsx
const savingLock = useRef(false);
```

`savingLock.current`を使って、保存ボタンの連打を防ぎます。

Stateと違い、`.current`を変更しても画面は再描画されません。

---

# 6. 画面遷移

このアプリはExpo Routerを使います。

ファイル名がURLと画面名になります。

```text
mobile/src/app/home.tsx
→ /home

mobile/src/app/chat.tsx
→ /chat
```

## `push`と`replace`の違い

```tsx
router.push('/subscription');
```

`push`は今の画面を履歴に残します。

戻る操作で前の画面へ戻れます。

```tsx
router.replace('/home');
```

`replace`は今の画面を置き換えます。

ログイン後や初回設定完了後など、戻ってほしくない場面で使います。

---

# 7. Contextと長期保存の違い

## Context

複数画面で一時的に同じ値を使う仕組みです。

例：`mobile/src/contexts/TrainingDraftContext.tsx`

AIメニュー画面からトレーニング記録画面へ、作成途中のメニューを渡します。

アプリを完全に終了すると消える可能性があります。

## Neon

ユーザーの記録を長期保存します。

ログインし直したり、別端末を使ったりしても取得できます。

## 使い分け

```text
入力途中・画面間の一時データ → State / Context
履歴として残すデータ         → Neon
```

---

# 8. フロントからAPIを呼ぶ流れ

## 共通通信ファイル

ファイル：`mobile/src/lib/api.ts`

すべてのAPI通信で共通して必要な処理をまとめています。

```ts
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<T> {
```

1行ずつ読むと次の意味です。

- `export`は別ファイルから使えるようにします。
- `async`は通信完了を待つ処理があることを表します。
- `<T>`はAPIごとに返り値の型を変更できるジェネリクスです。
- `path`には`/api/home`などが入ります。
- `options`にはHTTPメソッド、トークン、本文などが入ります。
- `Promise<T>`は将来`T`型の結果を返す約束です。

## 認証トークン

```ts
headers: {
  Authorization: `Bearer ${token}`,
}
```

ClerkのトークンをHTTPヘッダーへ入れます。

バックエンドはこの値を検証して本人を確認します。

## JSON送信

```ts
body: JSON.stringify(input)
```

TypeScriptのオブジェクトを通信可能なJSON文字列へ変換します。

## JSON受信

```ts
return (await response.json()) as T;
```

サーバーのJSONをTypeScriptで扱える値へ変換します。

`as T`は実行時検査ではなく、TypeScriptへ型を伝える書き方です。

## タイムアウト

GETは通常30秒、保存・生成・画像送信は通常120秒で打ち切ります。

通信を永遠に待ち続けないためです。

タイムアウト時でもサーバー側では処理が終わっている場合があります。

そのため保存処理は、履歴を確認してから再送します。

## 機能別通信ファイル

| ファイル | 役割 |
| --- | --- |
| `mobile/src/lib/bootstrap.ts` | 初回設定状態 |
| `mobile/src/lib/goals.ts` | 理想体型 |
| `mobile/src/lib/profiles.ts` | 身体情報 |
| `mobile/src/lib/trainingRecords.ts` | トレーニング記録 |
| `mobile/src/lib/weightRecords.ts` | 体重記録 |
| `mobile/src/lib/foodRecords.ts` | 食事記録 |
| `mobile/src/lib/bodyAnalyses.ts` | 身体分析履歴 |
| `mobile/src/lib/aiMenus.ts` | AIメニュー |
| `mobile/src/lib/chatApi.ts` | AIチャット |
| `mobile/src/lib/subscription.ts` | 課金状態・購入検証 |

画面に`fetch()`を何度も直接書かず、通信処理を`lib`へ分けています。

---

# 9. HTTPメソッド

| メソッド | このアプリでの主な意味 |
| --- | --- |
| GET | 保存済みデータを取得する |
| POST | 新しいデータを作る・AI生成する |
| PATCH | 既存データの一部を変更する |
| DELETE | 既存データを削除する |

GETは「フロントへ情報を渡す処理」です。

POSTは保存だけでなく、AI生成開始にも使います。

---

# 10. バックエンドAPIの基本形

例：`app/api/users/profile/route.ts`

APIは次の順番で処理します。

```text
1. Clerkで本人確認
2. JSONを受け取る
3. Zodで入力検査
4. Clerk IDからNeonのusers.idを取得
5. 本人のデータだけを検索・保存
6. JSONをフロントへ返す
7. 失敗時は安全なエラーを返す
```

## `request.json()`

```ts
const body = await request.json();
```

フロントが送ったJSONをTypeScriptの値へ変換します。

## `Response.json()`

```ts
return Response.json(
  { error: 'ログインが必要です。' },
  { status: 401 },
);
```

バックエンドからフロントへJSONとHTTP状態番号を返します。

## `try / catch`

```ts
try {
  // 失敗する可能性がある処理
} catch (error) {
  // 失敗時の処理
}
```

DBや外部APIの失敗でサーバー全体が止まらないようにします。

## `async / await`

```ts
const user = await findUser();
```

- `async`は非同期処理を含む関数へ付けます。
- `await`はPromiseの完了を待ちます。
- 待っている間もサーバー全体を完全停止させるわけではありません。

---

# 11. 認証と本人データ

## 共通認証ファイル

ファイル：`app/lib/auth/clerk-auth.ts`

```ts
const clerkUserId = await getClerkUserId(request);

if (!clerkUserId) {
  return Response.json(
    { error: 'ログインが必要です。' },
    { status: 401 },
  );
}
```

これはログイン済みかを確認しています。

まだNeonのデータを取得しているわけではありません。

## Clerk IDからNeonユーザーを探す

```ts
const matchedUsers = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.clerkUserId, clerkUserId))
  .limit(1);

const user = matchedUsers[0] ?? null;
```

1行ずつ読むと次の意味です。

- `.select()`で欲しい列を決めます。
- `.from(users)`で検索するテーブルを決めます。
- `.where()`でClerk IDが一致する本人だけに絞ります。
- `.limit(1)`で最大1件にします。
- `matchedUsers[0]`で最初の検索結果を取り出します。
- `?? null`で結果がない場合を`null`へ統一します。

### `?.`の意味

```ts
const id = matchedUsers[0]?.id;
```

`?.`は左側が`null`や`undefined`なら、エラーにせず`undefined`を返します。

### `??`の意味

```ts
const user = matchedUsers[0] ?? null;
```

左側が`null`または`undefined`の場合だけ、右側の`null`を使います。

## なぜ全APIで本人確認するのか

ログイン時に1回確認しても、その後届く通信が本人のものとは限りません。

APIは通信ごとにトークンを確認します。

同じ認証コードを全ファイルへコピーするのではなく、共通関数を呼んでいます。

---

# 12. Zodによる入力検査

ファイル：`app/lib/validation/apiSchemas.ts`

フロントの入力チェックだけは信用しません。

通信を直接送れば、画面の制限を通らずAPIへ到達できるためです。

```ts
export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  conversationId: uuidSchema.optional(),
  requestId: uuidSchema,
});
```

- `z.object`はオブジェクトの設計です。
- `z.string`は文字列だけを許可します。
- `.trim()`は前後の空白を除きます。
- `.min(1)`は空文字を拒否します。
- `.max(500)`は500文字までにします。
- `.optional()`は省略可能です。

```ts
const parsedBody = chatRequestSchema.safeParse(body);
```

`safeParse`は成功・失敗を結果として返します。

入力が不正ならOpenAIやNeonを呼ぶ前にHTTP 400を返します。

---

# 13. Neon・PostgreSQL・Drizzle

## 3つの関係

```text
Neon       = PostgreSQLをクラウドで提供するサービス
PostgreSQL = データベース本体の種類
Drizzle    = TypeScriptからPostgreSQLを操作する道具
```

## DB接続

ファイル：`db/index.ts`

`DATABASE_URL`を使ってNeonへ接続します。

接続情報は`.env.local`に置き、GitHubへ公開しません。

## `pgTable`

```ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
});
```

`pgTable`はPostgreSQLテーブルの設計をTypeScriptで書く関数です。

- `'users'`は実際のテーブル名です。
- `uuid`は重複しにくいIDです。
- `primaryKey`は行を区別する主キーです。
- `notNull`は値を必須にします。
- `unique`は重複を禁止します。

## 外部キー

```ts
userId: uuid('user_id')
  .notNull()
  .references(() => users.id, {
    onDelete: 'cascade',
  }),
```

1行ずつ読むと次の意味です。

- `userId`はTypeScriptで使う名前です。
- `'user_id'`はPostgreSQLの列名です。
- `.notNull()`で必須にします。
- `.references(() => users.id)`でusersテーブルと結び付けます。
- `onDelete: 'cascade'`で親ユーザー削除時に関連データも削除します。

## 親テーブルと子テーブル

トレーニング記録は3段階です。

```text
training_sessions          1回のトレーニング
  └ training_exercises     その日に行った種目
      └ training_sets      各種目の重量・回数
```

1つの大きなJSON列へ保存せず、検索・編集しやすい単位へ分けています。

## 現在の主なテーブル

| テーブル | 保存内容 |
| --- | --- |
| `users` | Clerk ID、メール、理想体型、初回設定状態 |
| `user_subscriptions` | App Store契約状態 |
| `user_profiles` | 身長、体重、体脂肪率、運動条件 |
| `weight_records` | 日ごとの体重 |
| `food_records` | 食事、カロリー、たんぱく質 |
| `training_sessions` | 1回のトレーニング |
| `training_exercises` | 実施種目 |
| `training_sets` | 重量と回数 |
| `body_analyses` | 身体分析全体 |
| `body_analysis_areas` | 部位別評価 |
| `ai_generated_menus` | AIメニュー全体 |
| `ai_generated_menu_exercises` | AIメニューの種目 |
| `chat_conversations` | チャットルームと要約 |
| `chat_messages` | 利用者とAIの発言 |
| `openai_usage_records` | モデルとトークン使用量 |
| `ai_request_guards` | 二重送信防止 |

## schemaとrouteの違い

`db/schema.ts`は「何をどんな列で保存するか」を決めます。

`app/api/**/route.ts`は「いつ誰のデータを保存・取得するか」を決めます。

## マイグレーション

`schema.ts`を変えただけではNeonのテーブルは変わりません。

```bash
cd /Users/yuuta/Desktop/musslepas
npm run db:generate
npx drizzle-kit migrate
```

1つ目でSQL変更ファイルを作り、2つ目でNeonへ反映します。

本番DBへ適用する前に、生成されたSQLを確認します。

---

# 14. 機能別のデータの流れ

## 理想体型

```text
ideal-body.tsx
→ mobile/src/lib/goals.ts
→ PATCH /api/users/goal
→ users.goal_body_type
```

AIはこの値を目標として参照します。

## プロフィール

```text
profile-setup.tsx / my-page.tsx
→ mobile/src/lib/profiles.ts
→ PATCH /api/users/profile
→ user_profiles
```

身長・体重は必須です。

体脂肪率、週回数、可能時間、場所、苦手部位などは任意です。

`availableMinutes`は1回のトレーニングに使える時間です。

## トレーニング記録

```text
training.tsx
→ mobile/src/lib/trainingRecords.ts
→ POST /api/training-records
→ training_sessions
→ training_exercises
→ training_sets
```

記録本体・種目・セットはまとめて保存し、途中だけ残りにくくしています。

GETで履歴取得、PATCHで編集、DELETEで削除します。

## 体重記録

```text
weight-history.tsx
→ mobile/src/lib/weightRecords.ts
→ /api/weight-records
→ weight_records
```

同じユーザー・同じ日付は1件だけ保存します。

## 食事記録

```text
food.tsx
→ mobile/src/lib/foodRecords.ts
→ /api/food-records
→ food_records
```

現在保存するのは日付、食事区分、食事名、カロリー、たんぱく質です。

食事管理画面はプレミアム状態を確認してから表示します。

## ホーム

```text
home.tsx
→ mobile/src/lib/homeApi.ts
→ GET /api/home
→ 目標体型と最新AIメニュー
```

メニュー未生成の場合、バックエンドは`menu: null`を返します。

フロントは「AIメニューはまだありません」を表示します。

---

# 15. AIへ渡す本人情報

ファイル：`app/lib/ai/getUserAiContext.ts`

このファイルはOpenAIを呼びません。

NeonからAIに必要な事実を集め、1つのオブジェクトにまとめます。

取得する主な情報は次のとおりです。

- 理想体型
- 身長・体重・体脂肪率
- 週の運動回数・可能時間・場所・苦手部位
- 最新の身体分析
- 最近10回のトレーニング
- 最近7日間の食事
- 最近生成したAIメニュー

```ts
export async function getUserAiContext(
  clerkUserId: string,
): Promise<UserAiContext | null> {
```

- 引数は本人のClerkユーザーIDです。
- 成功時は`UserAiContext`を返します。
- Neonにユーザーがいない場合は`null`を返します。

AIメニューとチャット要約が同じ事実データを使えるようにしています。

---

# 16. AIチャット

## 関係するファイル

| ファイル | 役割 |
| --- | --- |
| `mobile/src/app/chat.tsx` | チャット画面 |
| `mobile/src/lib/chatApi.ts` | チャットAPI通信 |
| `app/api/chat/route.ts` | 認証・制限・保存・OpenAI呼び出し |
| `app/lib/ai/systemPrompt.js` | AIの基本ルール |
| `app/lib/ai/chatSummary.ts` | 古い会話の短い要約 |
| `app/lib/ai/config.ts` | モデル・文字数・トークン上限 |

## 送信処理の順番

```text
1. フロントで500文字以内か確認
2. Clerkトークン付きでPOST
3. バックエンドでも500文字以内か確認
4. Moderationで危険内容を検査
5. 今日30回以内か確認
6. 5秒以内の連続送信を拒否
7. requestIdで二重送信を拒否
8. 質問をNeonへ保存
9. 古い会話を短いsummaryへ整理
10. summary + 直近5往復をOpenAIへ送る
11. 回答をNeonへ保存
12. 回答と残り利用回数をフロントへ返す
```

## 500文字制限

フロントとバックエンドの両方で確認します。

画面の確認は使いやすさのため、APIの確認は不正通信を防ぐためです。

## 会話履歴を全部送らない理由

会話が長くなるほど入力トークンと料金が増えます。

現在は、最大800文字の要約と直近5往復だけを送ります。

## `summary`

`chat_conversations.summary`へ古い会話の重要情報を保存します。

OpenAIを追加で呼ばず、アプリの事実データと古い相談内容から作ります。

そのため要約だけで追加料金は発生しません。

## モデルと回答上限

モデル名は`OPENAI_CHAT_MODEL`環境変数で変更できます。

通常回答は約400文字、OpenAI出力は最大600トークンです。

モデル名をコードへ固定しないため、料金や性能に応じて変更できます。

## Toolとの現在の関係

Tool用ファイルは残っていますが、通常チャットでは追加Tool呼び出しを行いません。

1回の質問で複数回OpenAIを呼ぶ料金を避けるため、先に本人情報を要約へまとめています。

---

# 17. AIメニュー

## 関係するファイル

| ファイル | 役割 |
| --- | --- |
| `mobile/src/app/home.tsx` | 条件入力と結果表示 |
| `mobile/src/lib/aiMenus.ts` | API通信と画面用変換 |
| `app/api/ai-menu/route.ts` | 生成・保存・取得 |
| `app/lib/ai/menuPrompt.ts` | メニュー作成ルール |
| `app/lib/ai/menuSchema.ts` | 入出力形式 |
| `app/lib/ai/getUserAiContext.ts` | 本人データ取得 |

## 生成の流れ

```text
今日の調子・鍛えたい部位
        ＋
理想体型・プロフィール・身体分析・運動履歴・食事・過去メニュー
        ↓
OpenAI Structured Outputs
        ↓
決められたJSON形式
        ↓
メニュー本体と種目をNeonへ保存
        ↓
ホームへ表示
```

## Structured Outputs

自由文章ではなく、決めたJSON形式で回答させる仕組みです。

種目名、重量、回数、セット数などを画面が安全に読み取れます。

## 1日3回

最初の生成1回と再生成2回を合わせて、1日3回までです。

制限はバックエンドで確認するため、画面を改造しても超えられません。

## モデル

`OPENAI_MENU_MODEL`でチャットとは別に変更できます。

---

# 18. 身体分析

## 全体の流れ

```text
body-analysis.tsx
→ FormDataで正面・横・背面を送信
→ POST /api/body-analysis
→ TypeScriptで本人・権限・容量を確認
→ Python /analyze
→ Pythonで画像形式・破損を確認
→ OpenAI画像分析
→ 決められたJSONをTypeScriptへ返す
→ Neonへ分析全体と部位別結果を保存
→ フロントへ返す
```

## なぜPythonを挟むのか

画像の読み込み、破損検査、画像処理ライブラリとの相性が良いためです。

ただしユーザー認証、利用制限、Neon保存はTypeScriptバックエンドが担当します。

## FormData

JSONは通常の文字や数値を送るのに向いています。

画像ファイルは`FormData`を使います。

```ts
formData.append('front_image', frontImage);
formData.append('side_image', sideImage);
formData.append('back_image', backImage);
```

## 画像制限

- JPEG・PNG・WebP
- 1枚8MB以下
- 3枚合計24MB以下
- 空ファイル・破損画像を拒否

TypeScriptとPythonの両方で確認します。

## 利用制限

初回設定時の1回だけ無料です。

その後はプレミアム会員が日本時間の暦月ごとに4回利用できます。

現在の画面には「契約更新ごと」という文言も残っていますが、バックエンドの実際の判定は毎月1日から翌月1日までです。

公開前に、暦月方式と契約更新日方式のどちらを正式仕様にするか統一する必要があります。

同時送信で上限を超えないよう、DBの一意制約も使います。

## 写真の保存

現在は分析結果をNeonへ保存し、身体写真そのものは長期保存しません。

Pythonへ処理用として渡し、分析結果JSONだけを戻す構成です。

---

# 19. App Store月額課金

## フロント

ファイル：`mobile/src/app/subscription.tsx`

月額プランの説明、契約状態、購入・復元ボタンを表示します。

端末別の購入処理は次のファイルへ分かれています。

```text
SubscriptionPurchasePanel.native.tsx
→ iPhoneのApp Store購入

SubscriptionPurchasePanel.web.tsx
→ Webでは購入できない案内
```

Metroが実行環境に合わせて自動選択します。

## バックエンド

```text
GET /api/subscription
→ 現在の契約状態と利用可能機能

POST /api/subscription/apple/verify
→ iPhoneから届いた署名付き購入情報を検証

POST /api/subscription/apple/notifications
→ 更新・解約・返金などのApple通知を受信
```

## なぜフロントの「購入済み」を信用しないのか

スマホ側の値は改造される可能性があります。

Appleが署名した取引情報をバックエンドで確認し、成功した場合だけNeonを更新します。

## 現在のプラン

- 月額1,000円
- 食事管理
- 初回無料後の身体分析
- プレミアム身体分析は現在のバックエンドでは暦月ごとに4回

App Store Connectの商品設定とSandbox実機購入は別途確認が必要です。

---

# 20. 二重送信を防ぐ仕組み

## フロントのロック

```ts
if (savingLock.current) return;
savingLock.current = true;
```

ボタンを素早く2回押しても1回だけ処理します。

## バックエンドの`requestId`

フロントは操作ごとにUUIDを送ります。

バックエンドは`ai_request_guards`へ保存します。

同じユーザー・処理種類・requestIdはDBが重複を拒否します。

フロントだけでなくバックエンドでも止める理由は、通信の再送や複数端末があるためです。

---

# 21. DBへまとめて保存する理由

```ts
await db.batch([
  db.insert(parentTable).values(parent),
  db.insert(childTable).values(children),
]);
```

親データと子データをまとめて処理します。

途中で失敗して親だけ残る状態を避けるためです。

例はトレーニング記録、身体分析、AIメニューです。

---

# 22. セキュリティの基本

## このアプリで守るもの

このアプリには、メールアドレス、身体情報、トレーニング記録、食事、身体分析結果、チャットが入ります。

セキュリティの目的は主に次の4つです。

1. 他人のデータを見せない
2. 不正なデータを保存しない
3. APIキーやDB接続情報を利用者へ渡さない
4. AIや外部サービスの失敗時にも個人情報を漏らさない

## APIを受け取ってから返すまで

保護が必要なAPIは、基本的に次の順番で処理します。

```text
スマホからリクエスト
↓
Clerkトークンを検証
↓
ClerkユーザーIDに対応するNeonユーザーを取得
↓
Zodで入力を検査
↓
本人のuserIdを条件にしてDBを検索・更新
↓
必要な処理だけを実行
↓
秘密情報を含まないJSONを返す
```

この順番にすることで、ログインしていない人や別ユーザーの操作を、DB更新前に止めます。

## 認証と認可の違い

認証は「誰か」を確認する処理です。

このアプリでは、スマホが送ったClerkトークンをバックエンドの`app/lib/auth/clerk-auth.ts`で検証します。

認可は「その人が、そのデータを操作してよいか」を確認する処理です。

ログイン済みでも、URLでもらった記録IDだけで更新してはいけません。

```ts
where(
  and(
    eq(record.id, recordId),
    eq(record.userId, user.id),
  ),
)
```

`record.id`は操作する記録を指定します。

`record.userId`は、その記録がログイン本人のものかを確認します。

両方が一致した記録だけを操作するため、他人のIDを推測されても更新できません。

## ClerkとNeonを二重に確認する理由

Clerkはログイン中の人物を確認します。

Neonはアプリ内のプロフィールや記録が誰のものかを管理します。

APIでは、ClerkのユーザーIDをそのまま記録IDとして使わず、対応するNeonの`users.id`を取得します。

```text
Clerk user_xxx
↓ 対応関係を検索
Neon users.id
↓
本人の記録だけを取得
```

## 管理者専用画面

`app/lib/admin/requireAdmin.ts`は、ログイン中のClerkユーザーIDが`ADMIN_CLERK_USER_IDS`に含まれるか確認します。

- 未ログインはHTTP 401
- ログイン済みでも管理者でなければHTTP 403
- 管理者だけ`GET /api/admin/dashboard`を利用可能

管理者画面をURLだけで隠すのではなく、API側でも権限を確認しています。

ローカル開発で認証・DBが未設定の場合だけ、開発用プレビューデータを表示します。本番環境ではこのプレビュー条件を使用しません。

## 入力値の検査

`app/lib/validation/apiSchemas.ts`などでZodを使っています。

Zodは、受け取ったJSONが決めた形式かを実行時に検査する道具です。

検査例は次のとおりです。

- AIチャットは最大500文字
- 身長・体重は現実的な数値範囲
- 日付は実在する日付
- トレーニング種目数とセット数に上限
- 食事のカロリーやPFCは負数を禁止
- 更新・削除IDはUUID形式
- アカウント削除の確認文字は`DELETE`と完全一致

TypeScriptの型だけでは、インターネットから届くJSONを安全にできません。そのため、APIを実行中にZodでも確認します。

## DB側の安全対策

TypeScriptで検査した後も、Neon PostgreSQL側で次を制限します。

- 外部キーで親データとの関係を保証
- `check`で数値や種類を制限
- `unique`で重複を禁止
- `onDelete: cascade`でアカウント削除時に関連データを削除
- `db.batch()`で親子データをまとめて保存

フロント、API、DBの3段階で検査することで、1か所のミスだけで壊れたデータが残る可能性を下げます。

## 二重送信と利用回数制限

`ai_request_guards`へ`userId`、処理種類、`requestId`を保存します。

同じ組み合わせはDBの一意制約で拒否されるため、ボタン連打や通信再送による二重実行を防ぎます。

また、バックエンド側でも次の上限を判定します。

- AIチャットは1日30回
- AIメニューは1日3回
- 身体分析は初回無料、その後はプレミアムで月4回
- 短時間の連続送信にはクールダウン

フロントのボタンを無効にするだけでは改造した通信を防げないため、必ずサーバー側でも止めます。

## 秘密鍵

次の値はフロントへ書きません。

- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- Appleの秘密鍵・Issuer ID・Key ID
- 管理者のClerkユーザーID一覧

これらはバックエンド公開先の環境変数だけに設定します。

`EXPO_PUBLIC_`から始まる環境変数はアプリの中へ組み込まれるため、利用者から見える前提です。

`EXPO_PUBLIC_`にはAPIの公開URLや公開可能キーだけを設定し、秘密鍵は絶対に置きません。

## ログとエラーメッセージ

利用者には「保存できませんでした」など安全な説明だけを返します。

DB接続文字列、APIキー、画像、チャット本文、認証トークンはログへ直接出しません。

`requestId`をログへ残し、個人情報ではなく処理番号から障害を追跡します。

`app/lib/observability/serverLog.ts`は、ログへ渡してよい値を絞る役割です。

## AIの安全対策

- Moderationで危険内容を検査
- 医療診断をしない
- 強い痛み・しびれ・怪我は運動中止と専門家相談を案内
- Clerk IDそのものではなくハッシュ化した匿名IDをOpenAIへ渡す
- `store: false`でOpenAI側の応答保存を無効化
- モデル出力をZodで再検査
- 出力文字数・トークン数・Tool実行回数を制限

AIの文章は常に正しいとは限らないため、生成できたことと、安全な形式であることを分けて確認します。

## 身体写真の扱い

正面・横・背面画像は、TypeScriptバックエンドからPython分析APIへ渡します。

Neonへ保存するのは分析結果であり、現在の設計では身体写真そのものを長期保存する用途にはしていません。

公開前には次を実環境でも確認します。

- 一時画像が処理後に残らない
- Renderやサーバーログへ画像内容を出さない
- 画像の形式・1枚容量・全体容量を制限する
- プライバシーポリシーへ利用目的と保存期間を書く

## アカウント削除

アカウント削除ではClerkの本人再確認を必須にします。

確認後、ClerkアカウントとNeonの本人データを削除します。

Neonでは`onDelete: cascade`により、プロフィール、記録、分析、チャットなどの関連データも削除します。

他人のアカウントIDを送って削除する形式にはせず、認証トークンから取得した本人を対象にします。

## Apple課金の確認

アプリから届いた「購入できた」という文字だけでは有料ユーザーにしません。

バックエンドのApple検証APIで署名付き取引情報を検証し、商品ID、購入者、期限、状態を確認します。

Server Notifications V2も署名を検証してから更新・解約・返金状態を反映します。

Appleの秘密情報はモバイルアプリへ入れません。

## 自動セキュリティテスト

```bash
npm run test:source-security
```

このテストでは主に次を確認します。

- モバイルコードにサーバー秘密情報が含まれない
- `.env`がGit管理対象にならない
- ログへ画像や認証情報を直接渡さない
- 安全なrequest IDだけを引き継ぐ
- Clerk開発用・本番用キーの状態を値を表示せず判定する
- アカウント削除で本人再確認を要求する

## 公開前に残っている確認

コード上の対策だけで公開安全性が確定するわけではありません。

次は公開前に必ず確認します。

- Clerkを本番用キーへ切り替える
- 開発用Neonと本番用Neonを分離する
- 依存パッケージの脆弱性を対応可能な版へ更新する
- 秘密鍵の定期変更手順を決める
- 2ユーザーでデータが混ざらないことを本番相当環境で確認する
- Neon、OpenAI、Render停止時の安全なエラーを確認する
- Privacy ManifestとApp Storeのデータ収集申告を確認する
- 身体写真を保存しない方針と削除タイミングを正式決定する

---

# 23. OpenAI料金を抑える仕組み

## AIチャット

- 入力は最大500文字
- 回答は約400文字
- 出力は最大600トークン
- 直近5往復だけ送信
- 古い会話は最大800文字の要約
- 通常回答は1回の生成API
- 1ユーザー1日30回

## AIメニュー

- チャットと別モデルを設定可能
- 1ユーザー1日3回
- 過去メニューを少数だけ参照

## 身体分析

- 画像分析用モデルを別に設定
- 初回1回無料、その後はプレミアム月4回

## 使用量記録

`openai_usage_records`へ次を保存します。

- ユーザーID
- 機能名
- モデル名
- input tokens
- output tokens
- total tokens
- 推定料金（100万分の1円単位）
- 日時

質問本文や画像は料金記録へ保存しません。

---

# 24. エラー番号の読み方

| 状態 | 意味 |
| --- | --- |
| 200 | 成功 |
| 400 | 入力形式が不正 |
| 401 | ログイン確認失敗 |
| 403 | 権限がない・有料機能を使えない |
| 404 | 本人データが見つからない |
| 409 | 二重送信・データ競合 |
| 413 | 画像容量が大きい |
| 415 | 画像形式が不正 |
| 429 | 利用回数または連続送信の上限 |
| 500 | サーバー内部エラー |
| 502 / 503 / 504 | OpenAIやPythonなど外部サービスの失敗 |

---

# 25. 運営ダッシュボード

## 何を確認する画面か

運営者が、推定売上・Apple手数料・OpenAI料金・Neon料金・その他費用・推定利益を確認するWeb画面です。

一般ユーザー向けのスマホ画面とは分かれています。

## 関係するファイル

| ファイル | 役割 |
| --- | --- |
| `app/admin/page.tsx` | 指標、推移、AI内訳、警告を表示する管理画面 |
| `app/api/admin/dashboard/route.ts` | Neonから運営データを集計するAPI |
| `app/lib/admin/requireAdmin.ts` | Clerk IDが管理者一覧に含まれるか確認 |
| `app/lib/admin/costConfig.ts` | 単価、手数料、費用、警告値を環境変数から読む |
| `app/lib/admin/previewDashboard.ts` | 本番データなしで画面を確認する開発用データ |
| `ADMIN_DASHBOARD_SETUP.md` | 公開環境の設定手順 |

## 管理者確認

```ts
const adminIds = process.env.ADMIN_CLERK_USER_IDS;
```

公開環境へ管理者本人のClerkユーザーIDを設定します。

ログイン済みでも、一覧に含まれないユーザーへ集計データは返しません。

## OpenAI推定料金

`openai_usage_records.estimated_cost_micros_yen`へ、OpenAIを呼んだ時点の推定料金を保存します。

100万分の1円単位の整数にすることで、小さい料金を丸めず安全に合計できます。

モデル単価は`OPENAI_MODEL_PRICING_JSON`で設定します。

## 推定利益

```text
推定売上
－ Apple手数料
－ OpenAI推定料金
－ Neon月額料金
－ その他インフラ費用
＝ 推定利益
```

App Store Connectの実際の入金額ではなく、有料ユーザー数から計算した推定値です。

## 画面に表示する内容

- 有料ユーザー数
- 推定売上
- OpenAIの今日・今月の推定料金
- Neonの推定料金
- Apple手数料とその他費用
- 合計コスト、利益、利益率
- 1ユーザー平均売上・AI原価・インフラ原価・利益
- 月別の売上、OpenAI、Neon、利益、有料ユーザー推移
- OpenAIの機能別、モデル別、ユーザー別内訳
- DB容量と保存件数
- 設定した基準を超えた場合の警告

OpenAIのトークン数、DB容量、保存件数は実測値です。

OpenAI料金、Neon料金、売上、Apple手数料、利益は設定値を使った推定値です。

画面でも実測と推定を区別して表示します。

## 現在必要な外部設定

- `0013_add_openai_estimated_cost.sql`を公開Neonへ適用
- `ADMIN_CLERK_USER_IDS`を設定
- OpenAIモデル単価を設定
- Neon料金とApple手数料率を設定
- 管理者でログインし、実データを確認

---

# 26. よく使うJavaScript・TypeScript単語帳

## `const`

変数を定義します。

変数そのものへ別の値を再代入しない場合に使います。

## `let`

あとから別の値を代入する変数です。

## `type`

データの形を決めます。

## `string / number / boolean`

文字列、数値、真偽値です。

## `null`

値がないことを意図的に表します。

## `undefined`

値がまだ設定されていない、または項目が存在しない状態です。

## `?`

型の項目を省略可能にします。

```ts
conversationId?: string;
```

## `?.`

左側に値がある場合だけ続きを読みます。

## `??`

左側が`null`か`undefined`の場合に右側を使います。

## `!`

真偽値を反対にします。

```ts
if (!user) {
  // userがない場合
}
```

## `===`

型も含めて同じ値か確認します。

## `&&`

両方の条件が正しい場合です。

## `||`

どちらかの条件が正しい場合です。

## 三項演算子

```ts
const label = isPremium ? '有料' : '無料';
```

条件が正しければ`有料`、違えば`無料`を使います。

## `.map()`

配列の各要素を別の形へ変換します。

## `.filter()`

条件に合う要素だけを残します。

## `.find()`

条件に最初に合う1件を返します。

## `.some()`

条件に合う要素が1件でもあるかを真偽値で返します。

## `.reduce()`

配列を1つの値へまとめます。

```ts
const total = entries.reduce(
  (sum, entry) => sum + entry.calories,
  0,
);
```

食事の全カロリーを合計しています。

## `.trim()`

文字列の前後の空白を除きます。

## `.slice()`

文字列や配列の一部分を取り出します。

## `JSON.stringify()`

オブジェクトをJSON文字列へ変換します。

## `JSON.parse()`

JSON文字列をJavaScriptの値へ戻します。

## `Promise.all()`

互いに依存しない複数の非同期処理を並行して待ちます。

## `try / catch / finally`

- `try`で処理を試します。
- `catch`で失敗を処理します。
- `finally`は成功・失敗のどちらでも実行します。

`finally`では読み込み表示や送信ロックを解除することが多いです。

---

# 27. よく使うDB単語帳

## `select`

データを取得します。

## `insert`

新しい行を追加します。

## `update`

既存の行を変更します。

## `delete`

既存の行を削除します。

## `where`

対象を条件で絞ります。

## `eq`

2つの値が等しい条件です。

## `and`

複数条件をすべて満たす指定です。

## `orderBy`

並び順を決めます。

## `desc`

新しい順・大きい順です。

## `limit`

最大取得件数です。

## `leftJoin`

左側のデータを残したまま、関連データを結合します。

プロフィールが未登録でもユーザーを取得したい場合などに使います。

## index

検索を速くする索引です。

## unique

同じ値の重複を禁止します。

## check

DBへ保存できる値の範囲や候補を制限します。

---

# 28. テスト

## 全体テスト

```bash
cd /Users/yuuta/Desktop/musslepas
npm run test:all
```

型検査、Lint、ビルド、Python、DB、APIなどをまとめて確認します。

## 主な個別テスト

```bash
npm run test:unit
npm run test:source-security
npm run test:python
npm run test:mobile-api
npm run test:mobile-types
npm run test:db
npm run test:public
```

## テストと実機確認の違い

自動テストはデータや処理を速く確認できます。

カメラ権限、キーボード、Safe Area、App Store Sandbox購入はiPhone実機が必要です。

---

# 29. 開発サーバーの起動

## TypeScriptバックエンド

```bash
cd /Users/yuuta/Desktop/musslepas
npm run dev
```

## Expoスマホアプリ

別ターミナルで実行します。

```bash
cd /Users/yuuta/Desktop/musslepas/mobile
npm run web
```

## Python身体分析API

ローカルでPythonを使う場合だけ実行します。

```bash
cd /Users/yuuta/Desktop/musslepas/python-analysis
source .venv/bin/activate
uvicorn app.main:app --reload
```

Renderの公開Python APIを使う場合、ローカルPythonの起動は不要です。

`Address already in use`は同じポートですでにサーバーが動いている意味です。

---

# 30. 現在の実装状況

## 実装済み

- Clerkメール認証
- 初回設定分岐
- 理想体型とプロフィール保存
- 体重の保存・取得・編集・削除
- トレーニングの保存・取得・編集・削除
- 食事の保存・取得・編集・削除
- 身体分析と履歴保存
- AIメニュー生成・保存・履歴
- AIチャット・履歴・要約
- AI利用回数制限と使用量記録
- アカウントと関連データ削除
- プレミアム判定
- App Store購入・復元・署名検証のコード
- 管理者限定の運営ダッシュボード
- プライバシーポリシー・利用規約のアプリ画面と公開Webページ

## 外部設定・実機確認が必要

- App Store Connectの商品設定
- Apple通知URLと証明書設定
- iPhone開発ビルドでSandbox購入・復元
- Appleログインを採用する場合の実装と確認
- Clerk本番インスタンスへの切り替え
- カメラ・写真選択権限
- iPhoneとAndroidの主要画面確認
- プライバシーポリシー・利用規約の正式な運営者名・問い合わせ先・法務確認

## 機能として残る改善

- ホームの今週達成率
- 最近鍛えていない部位
- 最新身体分析からの優先部位
- 食事の脂質・炭水化物・量・時間・メモ
- OpenAI予算アラートと月次利益確認
- 依存パッケージの脆弱性確認

---

# 31. バックエンドを15日で1周する学習コース

この章は「今のコードを読みながら、バックエンドを自分で説明できるようになる」ための教材です。毎日60〜90分を目安にします。

各ファイル名はリンクになっています。ファイル名を押すと、その日の学習対象へ移動できます。

## 最初に覚える全体像

通常の機能は、次の順番で動きます。

`Expo画面 → mobile/src/libの通信関数 → app/apiのroute.ts → Clerk本人確認 → Zod入力検査 → Neon取得・保存 → JSON応答 → Expo画面`

AI機能では、途中に次の処理が増えます。

`本人データ収集 → プロンプト作成 → OpenAI呼び出し → AI出力検査 → Neon保存 → トークン・料金記録`

身体分析では、さらにPython APIが入ります。

`Expo → TypeScript API → Python FastAPI → OpenAI画像分析 → TypeScript API → Neon → Expo`

## バックエンドのファイルを読む基本順序

新しい機能を理解するときは、毎回この順番で読んでください。

1. [db/schema.ts](db/schema.ts)：何を保存できるか確認する
2. [app/lib/validation/apiSchemas.ts](app/lib/validation/apiSchemas.ts)：何を入力として許可するか確認する
3. 対象の`app/api/**/route.ts`：認証・検査・DB処理・応答の順番を見る
4. `app/lib/**`：routeから切り出された共通処理を見る
5. `mobile/src/lib/**`：ExpoがどのURLへ何を送るか見る
6. `mobile/src/app/**`：利用者が入力し、結果を見る画面を確認する
7. `tests/**`：その機能が守るべき条件を確認する

`route.ts`だけを最初に読むと、型・DB・通信先が一度に出てきて難しく見えます。先に「保存の形」と「入力の形」を知ると、routeの意味を追いやすくなります。

## コードを読むときの印

- `import`：別ファイルの機能をこのファイルへ持ってくる
- `export`：このファイルの機能を別ファイルから使えるようにする
- `type`：データの形をTypeScriptへ教える。実行時には存在しない
- `const`：再代入しない名前を作る
- `function`：何度も使う処理へ名前を付ける
- `async`：時間のかかる非同期処理を含む関数
- `await`：その非同期処理が終わるまで、この関数の次の行を待つ
- `return`：呼び出し元へ値を返し、その関数を終了する
- `?.`：左側が`null`や`undefined`なら安全に`undefined`を返す
- `??`：左側が`null`または`undefined`のときだけ右側を使う
- `.map()`：配列の各要素を別の形へ変換し、新しい配列を作る
- `.filter()`：条件に合う要素だけを残した新しい配列を作る
- `.find()`：条件に合う最初の1件を探す
- `Promise<T>`：今すぐではなく、将来`T`型の結果が返る約束
- `Promise<T | null>`：将来`T`か「見つからない」を表す`null`が返る約束

---

## 1日目：バックエンド全体の地図

### 今日の目的

フロント、TypeScriptバックエンド、Neon、Python、OpenAIの境界を理解します。コードを暗記する日ではなく、「どこを直せば何が変わるか」を判断できるようにする日です。

### 読むファイルの順番

1. [package.json](package.json)
2. [mobile/package.json](mobile/package.json)
3. [db/index.ts](db/index.ts)
4. [app/api/health/route.ts](app/api/health/route.ts)
5. [python-analysis/app/main.py](python-analysis/app/main.py)
6. [mobile/src/lib/api.ts](mobile/src/lib/api.ts)

### ファイル同士の関係

- `mobile`は利用者のiPhone・Android・Web画面です。
- `mobile/src/lib/api.ts`は、画面と公開バックエンドをつなぐ共通の通信口です。
- `app/api`はTypeScriptで書かれたバックエンドAPIです。
- `db/index.ts`はNeonへの接続を1か所にまとめます。
- `db/schema.ts`はPostgreSQLに保存する表の設計です。
- `python-analysis`は身体画像の検査とOpenAI画像分析を担当します。

### コードの書き方

`export async function GET()`は「このURLへGET通信が来たときに実行する非同期関数」です。`Response.json(...)`は、JavaScriptの値をJSON応答へ変えます。

### 工夫点

画面、API、DB、画像分析を分離しています。画面デザインを変えてもDB処理を壊しにくく、Python分析だけ別サービスへ公開できます。

### 理解チェック

- アプリを閉じても残すデータは、最終的にどこへ保存するか。
- Pythonを止めても、プロフィール取得まで止まるか。
- `package.json`が二つある理由を説明できるか。

---

## 2日目：Neon接続とDBスキーマ

### 今日の目的

「DBへ接続するコード」と「保存する表の設計」を分けて理解します。

### 読むファイルの順番

1. [db/index.ts](db/index.ts)
2. [db/schema.ts](db/schema.ts)
3. [drizzle.config.ts](drizzle.config.ts)
4. [drizzle-postgres/0000_create_users.sql](drizzle-postgres/0000_create_users.sql)
5. [drizzle-postgres/0013_add_openai_estimated_cost.sql](drizzle-postgres/0013_add_openai_estimated_cost.sql)

### データの流れ

`route.ts → getDb() → Drizzleのselect/insert/update/delete → DATABASE_URL → Neon PostgreSQL`

`db/index.ts`は`.env.local`や公開環境の`DATABASE_URL`を使ってNeonへ接続します。`schema.ts`は接続を行わず、テーブル名・列・型・制約をTypeScriptで宣言します。

### コードの書き方

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
});
```

- `pgTable`はPostgreSQLの表を定義します。
- `"users"`はDB内の実際の表名です。
- `id`はTypeScript側で使う列名です。
- `uuid("id")`はDB側の列名と型です。
- `.primaryKey()`は行を一意に特定する主キーです。

### 外部キーの読み方

```ts
userId: uuid("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" })
```

これは「`user_id`は必須で、`users.id`に実在する利用者だけを保存でき、利用者を削除したら関連行も削除する」という意味です。

### セキュリティ

`DATABASE_URL`を`mobile`へ書いてはいけません。アプリ利用者へ配布され、第三者がDBへ直接接続できてしまうためです。DB接続はサーバーだけが持ちます。

### 理解チェック

- `schema.ts`とマイグレーションSQLの違いは何か。
- `users.id`と`users.clerkUserId`は何を識別するか。
- `onDelete: "cascade"`が必要な理由は何か。

---

## 3日目：マイグレーション・制約・インデックス

### 今日の目的

コードで設計した変更を、既存データを守りながらNeonへ反映する方法を理解します。

### 読むファイルの順番

1. [drizzle.config.ts](drizzle.config.ts)
2. [drizzle-postgres/0008_add_data_consistency_constraints.sql](drizzle-postgres/0008_add_data_consistency_constraints.sql)
3. [drizzle-postgres/0012_orange_arclight.sql](drizzle-postgres/0012_orange_arclight.sql)
4. [drizzle-postgres/0013_add_openai_estimated_cost.sql](drizzle-postgres/0013_add_openai_estimated_cost.sql)
5. [tests/db-integration.test.mjs](tests/db-integration.test.mjs)

### 役割

- マイグレーションはDBを古い形から新しい形へ進める履歴です。
- `UNIQUE`は同じデータの重複をDB側で防ぎます。
- `CHECK`は重量や回数などの範囲外をDB側でも拒否します。
- `INDEX`は検索場所の目印を作り、履歴取得を速くします。

### 工夫点

アプリの検査だけでなくDB制約も置きます。古いアプリや不具合のあるAPIから不正データが来ても、最後の防波堤としてDBが拒否します。

### 安全な変更順序

1. `schema.ts`を変更する
2. SQLを生成・確認する
3. Neonの開発ブランチで適用する
4. DBテストを実行する
5. バックアップ・復元方法を確認する
6. 本番へ適用する

### 理解チェック

- `push`だけに頼らずSQL履歴を残す理由は何か。
- インデックスを増やしすぎる欠点は何か。
- 開発用Neonブランチで先に試す理由は何か。

---

## 4日目：Clerk認証と本人の特定

### 今日の目的

「ログイン」と「そのデータを操作してよいか」を分けて理解します。

### 読むファイルの順番

1. [app/lib/auth/clerk-auth.ts](app/lib/auth/clerk-auth.ts)
2. [app/api/users/bootstrap/route.ts](app/api/users/bootstrap/route.ts)
3. [app/lib/admin/requireAdmin.ts](app/lib/admin/requireAdmin.ts)
4. [app/api/admin/access/route.ts](app/api/admin/access/route.ts)
5. [tests/source-security.test.mjs](tests/source-security.test.mjs)

### データの流れ

`Clerkログイン → Expoがトークン取得 → Authorization: Bearer ... → API → Clerkがトークン検証 → clerkUserId取得 → Neon usersを検索`

Clerkはパスワード・メール認証・セッションを担当します。Neonの`users`は筋トレPAS内のプロフィールや記録を結び付ける親データです。

### 認証と認可

- 認証：誰であるか確かめる
- 認可：その人がその処理をしてよいか確かめる

ログイン済みでも、他人のIDをURLやJSONへ入れられる可能性があります。そのためAPIごとにトークンから本人を特定し、クライアントが送った`userId`を信用しません。

### 管理者の仕組み

`ADMIN_CLERK_USER_IDS`はサーバー環境変数だけに保存します。`GET /api/admin/access`と`GET /api/admin/dashboard`は、同じ`getAdminIdentity()`を通ります。Expo側でボタンを隠すだけではセキュリティにならないため、APIでも必ず403を返します。

### 理解チェック

- 401と403の違いは何か。
- Clerk IDをExpoからJSONで送らせない理由は何か。
- 一般ユーザーが`/admin`を直接開いたら、どこで止まるか。

---

## 5日目：APIルート・HTTP・JSON・Zod

### 今日の目的

バックエンドの基本形を一行ずつ読めるようにします。

### 読むファイルの順番

1. [app/lib/validation/jsonValidation.ts](app/lib/validation/jsonValidation.ts)
2. [app/lib/validation/apiSchemas.ts](app/lib/validation/apiSchemas.ts)
3. [app/api/users/profile/route.ts](app/api/users/profile/route.ts)
4. [mobile/src/lib/profiles.ts](mobile/src/lib/profiles.ts)
5. [mobile/src/lib/api.ts](mobile/src/lib/api.ts)

### route.tsの基本順序

1. Clerkトークンから本人を確認する
2. `request.json()`でJSONを受け取る
3. Zodの`safeParse()`で検査する
4. Neonの本人行を探す
5. DBを取得・保存する
6. `Response.json()`で必要な値だけ返す
7. 例外時は秘密情報を含まないエラーを返す

### HTTPメソッド

- `GET`：情報を取得する。通常DBを変更しない
- `POST`：新しい処理・行を作る
- `PATCH`：既存データの一部を変更する
- `DELETE`：削除する

GETは「情報を渡す」のではなく、サーバーから情報を受け取る通信です。POSTは保存だけでなく、AI生成のような新しい処理開始にも使います。

### Zodの理由

TypeScriptの型は実行前の開発支援であり、外部から来たJSONを実行時には守りません。Zodは実行中に文字数・数値範囲・必須項目を確かめます。

### 理解チェック

- `request.json()`と`Response.json()`は向きがどう違うか。
- フロントで検査済みでもバックエンドで再検査する理由は何か。
- 400、404、409、429、500を使う場面を言えるか。

---

## 6日目：初回設定・プロフィール・理想体型

### 今日の目的

アプリ起動後に、保存済みの情報が戻る仕組みを追います。

### 読むファイルの順番

1. [app/api/users/bootstrap/route.ts](app/api/users/bootstrap/route.ts)
2. [app/api/users/goal/route.ts](app/api/users/goal/route.ts)
3. [app/api/users/profile/route.ts](app/api/users/profile/route.ts)
4. [app/api/users/onboarding-complete/route.ts](app/api/users/onboarding-complete/route.ts)
5. [mobile/src/lib/bootstrap.ts](mobile/src/lib/bootstrap.ts)
6. [mobile/src/app/bootstrap.tsx](mobile/src/app/bootstrap.tsx)

### データの流れ

`起動 → Clerkセッション確認 → GET bootstrap → Neon users/profile取得 → onboardingCompletedで分岐 → Contextへ復元 → 初回設定またはホーム`

### 保存データ

- `users`：Clerk ID、理想体型、初回設定完了状態
- `userProfiles`：身長、体重、体脂肪率、場所、頻度、時間、苦手部位

身長・体重だけを必須にし、それ以外は`null`または空配列を許可します。分からない値を適当な数値で保存させないためです。

### 工夫点

bootstrapは起動に必要な小さい情報をまとめます。画面ごとに何回もAPIを呼ぶより、初回の分岐が安定します。

### 理解チェック

- `onboardingCompleted`が端末Stateだけでは不十分な理由は何か。
- `null`と`0`はどう違うか。
- 2台目の端末でもプロフィールが戻る理由を説明できるか。

---

## 7日目：トレーニング・体重・食事記録

### 今日の目的

利用者の入力が、親子関係を持つDBへ保存される流れを理解します。

### 読むファイルの順番

1. [app/api/training-records/route.ts](app/api/training-records/route.ts)
2. [app/api/weight-records/route.ts](app/api/weight-records/route.ts)
3. [app/api/food-records/route.ts](app/api/food-records/route.ts)
4. [mobile/src/lib/trainingRecords.ts](mobile/src/lib/trainingRecords.ts)
5. [mobile/src/lib/weightRecords.ts](mobile/src/lib/weightRecords.ts)
6. [mobile/src/lib/foodRecords.ts](mobile/src/lib/foodRecords.ts)

### トレーニングの親子構造

- `trainingSessions`：日付、時間、調子、メモ
- `trainingExercises`：その日に行った種目
- `trainingSets`：各種目の重量、回数、セット番号

1回のトレーニングに複数種目、1種目に複数セットがあるため、表を分けます。全部を1行へ詰めると検索・編集が難しくなります。

### データの取得元と行き先

- Expoの入力フォームからJSONを受け取る
- Clerkから本人IDを受け取る
- Zodから検査済みデータを受け取る
- Neonへ本人の記録として保存する
- Neonから取得した親子データを画面向けJSONへ組み直して返す

### セキュリティ

更新・削除では「記録IDが存在するか」だけでなく「その記録の`userId`が本人か」をWHERE条件へ入れます。他人のUUIDを知っていても編集できないようにします。

### 理解チェック

- 履歴の検索条件に日付と部位を入れる理由は何か。
- 食事管理が有料機能の場合、画面を隠すだけでは不足する理由は何か。
- 更新時に親データだけ書き換えると何が起きるか。

---

## 8日目：一括保存・二重送信・アカウント削除

### 今日の目的

途中失敗しても中途半端なデータを残さない設計を理解します。

### 読むファイルの順番

1. [app/lib/idempotency/createRequestFingerprint.ts](app/lib/idempotency/createRequestFingerprint.ts)
2. [app/api/training-records/route.ts](app/api/training-records/route.ts)
3. [app/api/body-analysis/route.ts](app/api/body-analysis/route.ts)
4. [app/api/users/account/route.ts](app/api/users/account/route.ts)
5. [mobile/src/lib/account.ts](mobile/src/lib/account.ts)

### 一括保存

親・種目・セットを別々に保存すると、2回目で失敗したとき親だけが残ります。`db.transaction()`または一括処理を使い、全部成功したときだけ確定します。

### 二重送信対策

スマホ通信が遅いと、利用者が保存を2回押すことがあります。`requestId`や入力の指紋を記録し、同じ操作を再送しても同じ結果を返す設計をidempotencyと呼びます。

### アカウント削除

1. Clerkで本人再確認
2. 確認文字`DELETE`をサーバーでも検査
3. Neonの本人行を削除
4. `cascade`で関連記録を削除
5. Clerkアカウントを削除

取り消せないため、通常の保存より強い本人確認が必要です。

### 理解チェック

- トランザクションと二重送信対策は何が違うか。
- 外部サービス削除とDB削除の両方がある難しさは何か。
- `requestId`を画面だけで管理してはいけない理由は何か。

---

## 9日目：AIへ渡す本人情報の収集

### 今日の目的

AIが「理想体型を知っている」仕組みを理解します。

### 読むファイルの順番

1. [app/lib/ai/getUserAiContext.ts](app/lib/ai/getUserAiContext.ts)
2. [db/schema.ts](db/schema.ts)の`users`、`userProfiles`、記録、分析、食事部分
3. [app/lib/ai/chatSummary.ts](app/lib/ai/chatSummary.ts)
4. [app/api/home/route.ts](app/api/home/route.ts)

### 集める情報

- `users`から理想体型
- `userProfiles`から身長・体重・体脂肪率・頻度・時間・場所・苦手部位
- `bodyAnalyses`から最新分析
- `trainingSessions`以下から最近のトレーニング
- `foodRecords`から最近の食事
- `aiMenus`から最近のメニュー

### コードの読み方

```ts
export async function getUserAiContext(
  clerkUserId: string,
): Promise<UserAiContext | null>
```

これは「Clerk IDを受け取り、非同期でAI用情報か、利用者が見つからない場合の`null`を返す関数」です。本人認証そのものではなく、認証後にNeonから本人データを集める処理です。

### 工夫点

全履歴を毎回送ると料金と待ち時間が増えます。最新・直近・集計値へ絞り、AIに必要な意味を残しながら入力トークンを減らします。

### セキュリティ

Clerk IDは認証済みリクエストから取得します。AIへ不要なメール、内部ID、画像URL、秘密情報を渡しません。

### 理解チェック

- `leftJoin`を使う理由は何か。
- プロフィール未作成でも利用者行を取得したい場合、`innerJoin`では何が起きるか。
- 全トレーニング履歴をAIへ送らない理由は何か。

---

## 10日目：OpenAI共通設定・モデル・出力検査

### 今日の目的

OpenAI呼び出しを安全・安価・変更しやすくする共通部品を理解します。

### 読むファイルの順番

1. [app/lib/ai/openAiClient.ts](app/lib/ai/openAiClient.ts)
2. [app/lib/ai/config.ts](app/lib/ai/config.ts)
3. [app/lib/ai/menuSchema.ts](app/lib/ai/menuSchema.ts)
4. [app/lib/ai/bodyAnalysisSchema.ts](app/lib/ai/bodyAnalysisSchema.ts)
5. [app/lib/ai/recordOpenAiUsage.ts](app/lib/ai/recordOpenAiUsage.ts)

### モデル分離

- `OPENAI_CHAT_MODEL`：通常チャット用の安価なモデル
- `OPENAI_MENU_MODEL`：決まったJSONを返すメニュー用モデル
- Python側の身体分析モデル：画像理解が必要な機能だけで使う

モデル名をコードへ固定しないため、公開後も環境変数で料金と精度を調整できます。

### 出力制限

- チャット入力は最大500文字
- 通常回答は約400文字を目安
- `max_output_tokens`で出力量を制限
- 直近5往復だけを通常履歴として送る
- 古い内容は短いsummaryへまとめる

### AI出力の検査

AIは毎回完全に正しいJSONを返すとは限りません。`menuSchema`や`bodyAnalysisResultSchema`で項目・型・範囲を検査してから保存します。

### 料金記録

OpenAI応答の`usage`からinput/output/total tokensを取り出し、モデル・機能・ユーザー・推定料金と一緒に`openAiUsageRecords`へ保存します。

### 理解チェック

- TypeScript型だけではAI出力検査にならない理由は何か。
- input単価とoutput単価を分ける理由は何か。
- 同じ質問でOpenAIを何回も呼ばない理由は何か。

---

## 11日目：AIチャット・Tool・長期記憶

### 今日の目的

会話、DBの最新情報、Tool、要約がどう組み合わさるか理解します。

### 読むファイルの順番

1. [app/lib/ai/systemPrompt.js](app/lib/ai/systemPrompt.js)
2. [app/lib/ai/chatTools.ts](app/lib/ai/chatTools.ts)
3. [app/lib/ai/runChatTool.ts](app/lib/ai/runChatTool.ts)
4. [app/lib/ai/chatSummary.ts](app/lib/ai/chatSummary.ts)
5. [app/api/chat/route.ts](app/api/chat/route.ts)
6. [mobile/src/lib/chatApi.ts](mobile/src/lib/chatApi.ts)

### プロンプトの内容

system promptはAIの役割と禁止事項を決めます。

- 筋トレ支援に集中する
- 保存済みの目標・身体・運動・食事を使う
- 短く具体的に答える
- 医療診断をしない
- 鋭い痛み・しびれでは運動中止と医療相談を案内する
- 薬の処方や断定をしない

### 1回の送信でOpenAIへ渡すもの

1. system prompt
2. 短い長期summary
3. 直近5往復
4. 今回の質問
5. 必要に応じて呼べるTool定義

### Toolとは

ToolはAIが必要だと判断したとき、サーバーへ「最新身体分析を取得」「最近の記録を取得」「最新メニューを取得」などを依頼する仕組みです。`chatTools.ts`は使えるToolの名前と引数、`runChatTool.ts`は実際にNeonを検索する処理です。

### 長期記憶

会話全文を永久にOpenAIへ送り続けません。DBには履歴を保存し、古い会話から目標・頻度・苦手部位・器具・重要相談だけをsummaryへ圧縮します。

### コストと安全の工夫

- 1日30回をサーバー側で制限
- Tool実行回数にも上限
- 最大入力・最大出力を制限
- Moderationで危険な入力を分類
- AI回答前後に使用量を記録

### 理解チェック

- Toolと`getUserAiContext`はどう違うか。
- チャット履歴をDBへ保存することと、OpenAIへ全部送ることは同じか。
- summaryに残すべき情報と残さない情報を3つずつ挙げられるか。

---

## 12日目：AIメニュー生成

### 今日の目的

自由な会話ではなく、アプリが表示できる決まった形式をAIから受け取る流れを理解します。

### 読むファイルの順番

1. [app/lib/ai/menuPrompt.ts](app/lib/ai/menuPrompt.ts)
2. [app/lib/ai/menuSchema.ts](app/lib/ai/menuSchema.ts)
3. [app/lib/ai/getUserAiContext.ts](app/lib/ai/getUserAiContext.ts)
4. [app/api/ai-menu/route.ts](app/api/ai-menu/route.ts)
5. [app/api/ai-menu/history/route.ts](app/api/ai-menu/history/route.ts)
6. [mobile/src/lib/aiMenus.ts](mobile/src/lib/aiMenus.ts)

### プロンプトの内容

menu promptは次をAIへ求めます。

- 利用者の目標、頻度、時間、場所を守る
- 最近鍛えた部位と身体分析を考慮する
- 種目、セット、回数、重量目安、理由、注意点を返す
- 医療診断をしない
- 痛み・しびれがある場合は無理にメニューを作らない
- 指定されたJSON形式だけで返す

### データの流れ

`POST /api/ai-menu → 本人確認 → 1日3回制限 → aiContext取得 → promptと入力をOpenAIへ送信 → menuSchema検査 → aiMenusと種目を保存 → JSON返却`

1日3回には最初の生成と再生成2回を含みます。画面側だけでなくAPIが制限するため、改造アプリからも超過できません。

### 工夫点

過去メニューを参照して同じ内容が続きすぎないようにします。Structured OutputsとZodを組み合わせ、画面が期待する形を守ります。

### 理解チェック

- `aiInput`はOpenAIの返信を待つコードか、それとも送るデータか。
- `menuPrompt`と`route.ts`の役割はどう違うか。
- 生成成功後にDB保存が失敗した場合、画面はどう扱うべきか。

---

## 13日目：身体分析・Python・画像セキュリティ

### 今日の目的

画像3枚が二つのバックエンドを通り、分析結果だけが保存される流れを理解します。

### 読むファイルの順番

1. [mobile/src/lib/bodyAnalyses.ts](mobile/src/lib/bodyAnalyses.ts)
2. [app/api/body-analysis/route.ts](app/api/body-analysis/route.ts)
3. [python-analysis/app/main.py](python-analysis/app/main.py)
4. [app/lib/ai/bodyAnalysisSchema.ts](app/lib/ai/bodyAnalysisSchema.ts)
5. [python-analysis/tests/test_openai_errors.py](python-analysis/tests/test_openai_errors.py)

### 受け渡しの流れ

1. Expoが正面・横・背面を`FormData`で送る
2. TypeScript APIがClerk本人確認・回数・容量・形式を検査
3. TypeScriptがPythonの公開URLへ画像と身体情報を送る
4. Pythonが破損画像・形式・容量を再検査
5. PythonがOpenAIへ画像、理想体型、身体情報を送る
6. OpenAIが決まったJSON形式の分析結果を返す
7. Pythonが検査済みJSONをTypeScriptへ返す
8. TypeScriptがZodで再検査し、Neonへ保存する
9. TypeScriptがExpoへ分析結果を返す

### Pythonを使う理由

画像処理ライブラリが豊富で、画像の形式・寸法・破損確認・将来の姿勢推定などを追加しやすいためです。ただし、Pythonだから自動的に分析精度が上がるわけではありません。現在の実際の評価はOpenAI画像モデルが行います。

### 課金・回数

- 初回1回は無料
- 2回目以降は有料会員だけ
- 有料会員も月4回まで
- 最終判定はTypeScriptバックエンド

### セキュリティ

- ファイル拡張子だけでなくMIME・実体を確認
- 1枚と全体の容量上限を確認
- 生画像をログへ出さない
- OpenAIへ不要な氏名・メールを送らない
- 医療診断ではなく、筋トレ上の見た目の傾向として返す
- タイムアウトと一時的エラーだけの再試行を設定

### 理解チェック

- JSONではなく`FormData`を使う理由は何か。
- TypeScriptとPythonの両方で画像検査する理由は何か。
- 画像そのものをNeonの通常テーブルへ入れない理由は何か。

---

## 14日目：Apple課金・権利判定・運営ダッシュボード

### 今日の目的

購入画面ではなく、バックエンドが「有料機能を使えるか」と「運営利益」を判断する仕組みを学びます。

### 読むファイルの順番

1. [app/lib/subscriptions/policy.ts](app/lib/subscriptions/policy.ts)
2. [app/lib/subscriptions/entitlements.ts](app/lib/subscriptions/entitlements.ts)
3. [app/lib/subscriptions/appleVerification.ts](app/lib/subscriptions/appleVerification.ts)
4. [app/api/subscription/route.ts](app/api/subscription/route.ts)
5. [app/api/subscription/apple/verify/route.ts](app/api/subscription/apple/verify/route.ts)
6. [app/api/subscription/apple/notifications/route.ts](app/api/subscription/apple/notifications/route.ts)
7. [app/lib/admin/costConfig.ts](app/lib/admin/costConfig.ts)
8. [app/api/admin/dashboard/route.ts](app/api/admin/dashboard/route.ts)
9. [mobile/src/lib/admin.ts](mobile/src/lib/admin.ts)
10. [mobile/src/app/admin.tsx](mobile/src/app/admin.tsx)

### 課金データの流れ

`iPhone StoreKit購入 → 署名付き取引情報 → TypeScript API → Apple公開鍵で検証 → productId・期限・環境確認 → userSubscriptions保存 → 有料機能APIが権利確認`

Appleからの情報を画面だけで信用しません。改造アプリが`premium: true`を送れてしまうため、サーバーが署名を検証します。更新・解約・返金はApple Server Notificationで反映します。

### 管理データの場所

現在のExpoアプリでは、管理者本人のマイページにだけ「運営ダッシュボード」が表示されます。

- [app/api/admin/access/route.ts](app/api/admin/access/route.ts)：管理者かだけを軽く確認
- [app/api/admin/dashboard/route.ts](app/api/admin/dashboard/route.ts)：Neonを集計して管理JSONを返す
- [mobile/src/lib/admin.ts](mobile/src/lib/admin.ts)：Clerkトークン付きで管理APIを呼ぶ
- [mobile/src/app/admin.tsx](mobile/src/app/admin.tsx)：現在のExpoアプリで管理データを表示

旧Web管理画面[app/admin/page.tsx](app/admin/page.tsx)も、PCで確認する予備の運営画面として残しています。どちらも同じ管理APIを使用するため、計算結果は共通です。

### 収益計算

- 売上 = 有料ユーザー数 × 月額料金
- Apple入金見込 = 売上 − Apple手数料
- 合計運営コスト = Apple手数料 + OpenAI + Neon + その他
- 税引前利益 = 売上 − 合計運営コスト
- 利益率 = 税引前利益 ÷ 売上 × 100

税金は事業形態・経費・所得によって変わるため自動計算せず、画面では税引前と明記します。収入は青、支出は赤、利益は緑で表示します。

### 実測値と推定値

- DBの行数・容量：Neonから取得した実測値
- OpenAI tokens：API応答usageから得た実測値
- OpenAI円換算：設定単価を掛けた推定値
- Neon料金：環境変数へ設定する推定値
- 売上：現在の有効な有料ユーザー数からの推定値

### 理解チェック

- App Store Connectの売上と「有料人数×1000円」が一致しない場合がある理由は何か。
- 管理画面のボタンを一般ユーザーから隠すだけでは不足する理由は何か。
- `ADMIN_CLERK_USER_IDS`をmobileへ書いてはいけない理由は何か。

---

## 15日目：セキュリティ・監視・テスト・公開

### 今日の目的

機能が動くだけでなく、他人のデータ・秘密情報・運営費を守れるか確認します。

### 読むファイルの順番

1. [app/lib/observability/serverLog.ts](app/lib/observability/serverLog.ts)
2. [app/lib/ai/checkModeration.ts](app/lib/ai/checkModeration.ts)
3. [app/lib/ai/moderationDecision.ts](app/lib/ai/moderationDecision.ts)
4. [app/lib/ai/createSafetyIdentifier.ts](app/lib/ai/createSafetyIdentifier.ts)
5. [tests/source-security.test.mjs](tests/source-security.test.mjs)
6. [tests/api-safety.test.mjs](tests/api-safety.test.mjs)
7. [tests/db-integration.test.mjs](tests/db-integration.test.mjs)
8. [tests/public-api-smoke.test.mjs](tests/public-api-smoke.test.mjs)
9. [.gitignore](.gitignore)

### セキュリティを層で考える

#### 1. 端末に秘密を置かない

Expoへ置けるのは公開してよい`EXPO_PUBLIC_*`だけです。DB接続文字列、Clerk Secret Key、OpenAI API Key、Apple秘密鍵、管理者ID一覧は公開バックエンドの環境変数へ置きます。

#### 2. 全APIで本人を確認する

トークンからClerk IDを取得し、Neonの利用者へ結び付けます。更新・削除は本人の`userId`をWHERE条件へ入れます。

#### 3. 入力を信用しない

Zodで文字数、数値、日付、配列件数、UUIDを検査します。画像は形式、実体、容量、破損を検査します。

#### 4. 利用量を制限する

- AIチャット：1日30回
- AIメニュー：1日3回
- 身体分析：初回無料、有料は月4回
- チャット入力：500文字
- AI出力・Tool回数・タイムアウトにも上限

これは料金対策であると同時に、大量リクエストによる攻撃対策です。

#### 5. ログへ個人情報を残さない

画像、トークン、APIキー、質問本文、身体情報をそのままログへ出しません。request ID、機能名、エラー分類、token数など調査に必要な最小情報だけを残します。

#### 6. AIを信用しすぎない

Moderation、system prompt、出力文字数制限、Zod出力検査を重ねます。怪我・しびれ・痛みは医療診断をせず、運動中止と専門家相談を案内します。

#### 7. 管理機能を分離する

管理APIは一般ユーザーのAPIとは別URLにし、`ADMIN_CLERK_USER_IDS`で認可します。管理者判定に失敗したら、DB集計より前に401/403を返します。

### テストの意味

- unit：入力検査、料金計算、プロンプトの安全ルール
- source-security：秘密情報、認証、管理者ガードをコード上で点検
- Python：画像・OpenAIエラー処理
- mobile API：Expo側のURL、method、JSONを確認
- DB integration：実際のNeonで制約と保存を確認
- public smoke：公開URLが応答し、認証なしで保護APIへ入れないことを確認

### 公開前の順序

1. 開発Neonでマイグレーション
2. 自動テスト
3. 本番Neonへマイグレーション
4. 公開先へ秘密環境変数を設定
5. バックエンドを公開
6. ExpoのAPI URLを公開先へ変更
7. 2ユーザーでデータ分離確認
8. Sandbox課金確認
9. iPhone実機・TestFlight確認

### 理解チェック

- フロントのボタン非表示と、バックエンド認可の違いは何か。
- エラー調査に必要だがログへ残してはいけないものは何か。
- 公開環境で最低限確認するAPIを挙げられるか。

---

## 15日後に説明できれば合格する内容

次の質問へ、コードを見ながら自分の言葉で答えられれば1周完了です。

1. Expoの入力は、どの通信ファイルとroute.tsを通ってNeonへ入るか。
2. ClerkのユーザーとNeonのユーザーをどう結び付けているか。
3. `schema.ts`、マイグレーション、route.tsは何が違うか。
4. JSON、FormData、TypeScriptの型、Zodは何が違うか。
5. AIはどの本人情報を、どのファイルから集めるか。
6. system prompt、user input、Tool、AI出力Schemaは何が違うか。
7. チャットの長期記憶を、料金を抑えながらどう実現しているか。
8. 身体画像がExpoからPythonを通り、結果がNeonへ保存されるまでを説明できるか。
9. Apple購入情報をバックエンドで検証する理由は何か。
10. 一般ユーザーが他人のデータや管理画面へ入れない仕組みを説明できるか。

最後に、好きな機能を一つ選び、次の形式で紙へ書いてください。

`画面ファイル → mobile通信ファイル → API URL → route.ts → 認証 → Zod → DBテーブル → 応答JSON → 画面表示`

これを書けるようになると、新機能を追加するときも「どこへ何を書くか」を自分で判断しやすくなります。
