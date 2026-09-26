# Day 7：トレーニング・体重・食事記録

[← Day 6](DAY_06.md) | [学習一覧](README.md) | [次のDayへ →](DAY_08.md)

## 今日できるようになること

- CRUDを説明する
- トレーニングの親子テーブルを説明する
- 本人の記録だけを更新・削除する条件を説明する

## 読むファイルの順番

1. [app/api/training-records/route.ts](../app/api/training-records/route.ts)
2. [app/api/weight-records/route.ts](../app/api/weight-records/route.ts)
3. [app/api/food-records/route.ts](../app/api/food-records/route.ts)
4. [mobile/src/lib/trainingRecords.ts](../mobile/src/lib/trainingRecords.ts)
5. [mobile/src/lib/weightRecords.ts](../mobile/src/lib/weightRecords.ts)
6. [mobile/src/lib/foodRecords.ts](../mobile/src/lib/foodRecords.ts)

## CRUD

- Create：POSTで新規保存
- Read：GETで一覧・詳細取得
- Update：PATCHで変更
- Delete：DELETEで削除

## トレーニングの親子構造

```text
trainingSessions（実施日・時間・調子・メモ）
  └ trainingExercises（ベンチプレスなど）
      └ trainingSets（重量・回数・セット番号）
```

1回のトレーニングには複数種目があり、1種目には複数セットがあります。全部を1行へ詰めず、親子に分けることで検索・編集しやすくします。

## データの流れ

`入力画面 → mobile通信関数 → JSON → route.ts → 認証 → Zod → Neon保存 → 保存結果JSON → 履歴画面`

GETではNeonの親子行を画面で扱いやすい入れ子JSONへ組み直します。

## 本人だけを操作できる条件

更新・削除のWHERE条件には、記録IDだけでなく認証済み本人の`userId`も入れます。他人のUUIDを知っても操作できません。

## 今日覚える文法

- `.map()`：DBの行を画面向けの形に変える
- `.filter()`：日付・部位など条件に合う行だけ残す
- `.sort()`：日付や表示順を並べ替える
- `...object`：元の項目をコピーして一部だけ変更する

## 有料機能の注意

食事画面をぼかすだけでは、改造したアプリからAPIを直接呼べます。そのためバックエンドでも`getPremiumAccess()`を使って権利を確認します。

## 理解チェック

1. トレーニングを3表へ分ける理由は何か。
2. 記録IDだけでDELETEする危険は何か。
3. GET応答をDBの平らな行のまま返さない理由は何か。
4. CRUDとHTTPメソッドの対応を説明できるか。

[Day 8：一括保存と削除へ →](DAY_08.md)
