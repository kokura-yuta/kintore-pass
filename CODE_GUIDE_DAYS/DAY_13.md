# Day 13：身体分析・Python・画像セキュリティ

[← Day 12](DAY_12.md) | [学習一覧](README.md) | [次のDayへ →](DAY_14.md)

## 今日できるようになること

- ExpoからPythonを通りNeonへ保存されるまでを説明する
- JSONとFormDataを使い分ける
- Pythonを利用する理由と、実際の分析担当を説明する

## 読むファイルの順番

1. [mobile/src/lib/bodyAnalyses.ts](../mobile/src/lib/bodyAnalyses.ts)
2. [app/api/body-analysis/route.ts](../app/api/body-analysis/route.ts)
3. [python-analysis/app/main.py](../python-analysis/app/main.py)
4. [app/lib/ai/bodyAnalysisSchema.ts](../app/lib/ai/bodyAnalysisSchema.ts)
5. [python-analysis/tests/test_openai_errors.py](../python-analysis/tests/test_openai_errors.py)

## 全体の受け渡し

```text
Expoの正面・横・背面画像
→ FormData
→ TypeScript body-analysis API
→ Python FastAPI
→ OpenAI画像モデル
→ Pythonが結果JSONを検査
→ TypeScriptがZodで再検査
→ Neonへ保存
→ ExpoへJSONを返す
```

## TypeScript側の役割

- Clerk本人確認
- 初回無料・有料・月4回の判定
- 画像3枚の存在、形式、容量確認
- Pythonへの通信とタイムアウト
- 結果JSONのZod検査
- 分析本体・部位別結果のNeon保存

## Python側の役割

- UploadFileとして画像を受け取る
- 画像の破損、形式、容量を再確認
- OpenAIへ送れる形に変換
- 身体情報と画像をOpenAIへ送る
- OpenAIエラーを安全なHTTPエラーへ変換

Python自体が現在の身体評価を計算しているわけではありません。実際の視覚分析はOpenAI画像モデルです。Pythonは画像処理とAI接続を担当します。

## JSONとFormData

- JSON：文字・数値・配列・オブジェクト向け
- FormData：画像などのファイルと文字情報を一緒に送る

## 画像セキュリティ

- ファイル名や拡張子だけを信用しない
- MIME、実体、破損、1枚・全体容量を確認
- 生画像やbase64をログへ出さない
- AIへ氏名・メール・内部IDを送らない
- 医療診断ではなく筋トレ上の傾向として返す

## 理解チェック

1. TypeScriptとPythonの両方で画像を検査する理由は何か。
2. `request.formData()`の戻り値から`.get()`するものは何か。
3. Pythonを使う理由とOpenAIを使う理由は何が違うか。
4. 画像分析結果はどの形式でTypeScriptへ戻るか。

[Day 14：課金と管理画面へ →](DAY_14.md)
