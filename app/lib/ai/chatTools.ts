// AIチャットが利用できるToolの名前・目的・入力形式を書くファイル
// AIチャットが利用できるToolの名前・目的・入力形式を定義する
export const chatTools = [
  {
    type: "function",

    name: "get_user_profile",

    description:
      "ログイン中の利用者の目標体型、身長、体重、体脂肪率、週のトレーニング回数、可能時間、場所、苦手部位を取得する。利用者に合った回答を作る必要があるときに使用する。",

    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },

    strict: true,
  },
    {
    type: "function",

    name: "get_latest_body_analysis",

    description:
      "ログイン中の利用者の最新の身体分析結果を取得する。全体評価、理想体型との差、肩・胸・背中・腕・腹部・脚などのスコア、優先度、観察結果、トレーニング提案が必要なときに使用する。",

    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },

    strict: true,
  },
    {
    type: "function",

    name: "get_recent_training_records",

    description:
      "ログイン中の利用者の最近のトレーニング記録を取得する。実施日、調子、時間、メモ、部位、種目、重量、回数、セット数を確認し、重量が伸びない理由、最近鍛えていない部位、疲労、次のトレーニング内容を判断するときに使用する。",

    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },

    strict: true,
  },
    {
    // AIが呼び出すToolの名前
    type: "function",

    name: "get_latest_ai_menu",

    // AIがこのToolを使うタイミング
    description:
      "ログイン中の利用者に最後に生成したAIトレーニングメニューを取得する。おすすめ部位、選んだ理由、種目、重量、回数、セット数、休憩時間、注意点を回答するときに使用する。",

    // 本人はClerk認証から判断するため、AIから受け取る値はない
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },

    // 上で決めた形式以外の入力を許可しない
    strict: true,
  },
    {
    // AIが呼び出す体重履歴Toolの種類
    type: "function",

    // AIがToolを指定するときに使う名前
    name: "get_weight_history",

    // AIがこのToolを使用する判断基準
    description:
      "ログイン中の利用者の最近の体重履歴を取得する。体重の増減、減量・増量ペース、停滞、最新体重、過去からの変化を確認して回答するときに使用する。",

    // 本人はClerk認証で判断するため、AIから入力値は受け取らない
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },

    // 定義していない入力をAIから受け取らない
    strict: true,
  },
] as const;