# 筋トレPAS コードガイド

最終更新：2026年9月20日

このガイドは、現在のコードを理解するための説明書です。

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

# 31. 15日で1周する学習プラン

毎日60〜90分を目安にします。最初の40〜60分で対象章とファイルを読み、残りの20〜30分で「確認」に自分の言葉で答えます。

## 1日目：アプリ全体と言語

- 読む：1〜3章
- 見る：`mobile/src/app`、`app/api`、`db`、`python-analysis`
- 目標：Expo、TypeScript、Neon、Python、OpenAIの担当を言える
- 確認：`.ts`、`.tsx`、`.py`、`.sql`の違いは何か

## 2日目：起動からホームまで

- 読む：4章、6章
- 見る：`mobile/src/app/index.tsx`、`mobile/src/app/bootstrap.tsx`
- 目標：起動、ログイン判定、初回設定判定、画面遷移を説明できる
- 確認：`push`と`replace`を使い分ける理由は何か

## 3日目：React画面の基本

- 読む：5章、26章の`.map()`まで
- 見る：入力フォームがある好きな`.tsx`ファイル1つ
- 目標：`useState`、`onChangeText`、`onPress`、条件表示、`.map()`を読める
- 確認：`const [value, setValue] = useState("")`を一文ずつ説明する

## 4日目：Contextと長期保存

- 読む：7章
- 見る：プロフィールまたは初回設定のContextとAPI通信
- 目標：画面内の一時状態とNeonの永続データを区別できる
- 確認：アプリ再起動後に残すデータはどこへ保存するか

## 5日目：API通信とHTTP

- 読む：8〜10章
- 見る：`mobile/src/lib`の通信ファイルと対応する`app/api/**/route.ts`
- 目標：JSON、GET、POST、PATCH、DELETE、`async / await`を説明できる
- 確認：フロントの入力がAPIに届き、JSONで戻るまでを紙に書く

## 6日目：Clerk認証と本人データ

- 読む：11章、22章の認証・認可
- 見る：共通認証ファイルとユーザー検索処理
- 目標：Clerk IDとNeonの`users.id`の役割の違いを理解する
- 確認：ログイン済みでもAPIごとに本人確認する理由は何か

## 7日目：Zodとエラー処理

- 読む：12章、24章
- 見る：`safeParse`を使っている`route.ts`
- 目標：フロントとバックエンド両方で検査する理由を説明できる
- 確認：400、401、403、404、429、500の違いを言える

## 8日目：Neon・PostgreSQL・Drizzle

- 読む：13章、27章
- 見る：`db/schema.ts`、`drizzle.config.ts`、`drizzle-postgres`
- 目標：テーブル、行、列、主キー、外部キー、indexを理解する
- 確認：`schema.ts`、`route.ts`、マイグレーションの役割を分けて説明する

## 9日目：主要データの流れ

- 読む：14章
- 見る：理想体型、プロフィール、トレーニング、体重、食事のAPI
- 目標：1機能を「入力 → API → 認証 → DB → 応答 → 表示」で追える
- 確認：トレーニング本体・種目・セットが親子に分かれる理由は何か

## 10日目：AIに渡す本人情報

- 読む：15章
- 見る：`app/lib/ai/getUserAiContext.ts`
- 目標：Neonから目標、身体、運動、食事、分析を集める理由を理解する
- 確認：`Promise<UserAiContext | null>`が何を約束する型か説明する

## 11日目：AIチャット

- 読む：16章、23章のAIチャット
- 見る：`app/api/chat/route.ts`、`app/lib/ai/runChatTool.ts`、`app/lib/ai/chatTools.ts`
- 目標：要約＋直近5往復＋今回の質問を送る構成を理解する
- 確認：Toolと普通の会話履歴の違いは何か

## 12日目：AIメニュー

- 読む：17章、23章のAIメニュー
- 見る：`app/api/ai-menu/route.ts`、`app/lib/ai/menuPrompt.ts`、`app/lib/ai/menuSchema.ts`
- 目標：プロンプト、Structured Outputs、Zod検査、保存の順番を説明できる
- 確認：AIの文章をそのままDBに保存しない理由は何か

## 13日目：身体分析とPython

- 読む：18章
- 見る：`app/api/body-analysis/route.ts`、`python-analysis/app/main.py`
- 目標：Expo → TypeScript → Python → OpenAI → TypeScript → Neonの流れを理解する
- 確認：JSONと`FormData`の使い分け、Pythonを挟む理由を説明する

## 14日目：課金・二重送信・一括保存

- 読む：19〜21章
- 見る：課金API、`requestId`を扱うAPI、`db.transaction()`または`db.batch()`
- 目標：Appleの購入情報をサーバーで確かめる理由と、途中保存を防ぐ仕組みを理解する
- 確認：同じ保存ボタンを2回押しても1件にする方法は何か

## 15日目：セキュリティ・管理画面・テスト

- 読む：22〜25章、28〜30章
- 見る：`app/api/admin/dashboard/route.ts`、`app/admin/page.tsx`、`tests`
- 目標：管理者限定、秘密鍵、利用制限、料金記録、公開前テストを説明できる
- 確認：売上、Apple手数料、OpenAI料金、Neon料金、税引前利益の関係を式で書く

## 1周した後の判定

次の流れをコードを見ながら自分の言葉で説明できれば1周完了です。

`Expoの入力 → API通信 → Clerk認証 → Zod検査 → Neon取得・保存 → 応答JSON → Expo表示`

AI機能はさらに「本人情報の収集 → OpenAIへ送信 → 出力検査 → 保存 → 使用量記録」が加わります。
