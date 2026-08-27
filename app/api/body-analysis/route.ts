// Clerk認証後にPython画像分析APIを呼び、分析結果JSONを受け取るTypeScript API
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import {
  and,
  desc,
  eq,
  gte,
  lt,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  bodyAnalyses,
  bodyAnalysisAreas,
  userProfiles,
  users,
} from "@/db/schema";

const pythonAnalysisUrl =
  process.env.PYTHON_ANALYSIS_URL ??
  "http://127.0.0.1:8000";

const parsedPythonAnalysisTimeout =
  Number.parseInt(
    process.env.PYTHON_ANALYSIS_TIMEOUT_MS ??
      "120000",
    10,
  );

const pythonAnalysisTimeoutMilliseconds =
  Number.isInteger(
    parsedPythonAnalysisTimeout,
  ) && parsedPythonAnalysisTimeout > 0
    ? parsedPythonAnalysisTimeout
    : 120_000;

class PythonAnalysisTimeoutError extends Error {
  constructor() {
    super(
      "Python画像分析APIが時間内に応答しませんでした。",
    );
    this.name = "PythonAnalysisTimeoutError";
  }
}

class PythonAnalysisUnavailableError extends Error {
  constructor() {
    super(
      "Python画像分析APIへ接続できませんでした。",
    );
    this.name =
      "PythonAnalysisUnavailableError";
  }
}

class PythonAnalysisApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PythonAnalysisApiError";
    this.status = status;
  }
}

// Pythonへ送信できる画像形式・1枚の容量・3枚合計の容量
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxImageSizeBytes =
  8 * 1024 * 1024;

const maxTotalImageSizeBytes =
  24 * 1024 * 1024;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const japanTimeOffsetMilliseconds =
  9 * 60 * 60 * 1000;

// 日本時間の今日0時と翌日0時をUTCのDateへ変換する
function getJapanDayRange(now: Date) {
  const japanNow = new Date(
    now.getTime() +
      japanTimeOffsetMilliseconds,
  );

  const japanDayStartAsUtc = Date.UTC(
    japanNow.getUTCFullYear(),
    japanNow.getUTCMonth(),
    japanNow.getUTCDate(),
  );

  const start = new Date(
    japanDayStartAsUtc -
      japanTimeOffsetMilliseconds,
  );

  const end = new Date(
    start.getTime() + millisecondsPerDay,
  );

  return { start, end };
}

type BodyAreaResult = {
  body_part: string;
  score: number;
  priority: string;
  observation: string;
  recommendation: string;
};

type BodyAnalysisResult = {
  summary: string;
  goal_difference: string;
  areas: BodyAreaResult[];
};

// Pythonから返った値が身体分析JSONの基本構造を持つか確認する
function isBodyAnalysisResult(
  value: unknown,
): value is BodyAnalysisResult {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const result =
    value as Partial<BodyAnalysisResult>;

  return (
    typeof result.summary === "string" &&
    typeof result.goal_difference ===
      "string" &&
    Array.isArray(result.areas) &&
    result.areas.every(
      (area) =>
        typeof area.body_part === "string" &&
        typeof area.score === "number" &&
        Number.isInteger(area.score) &&
        area.score >= 1 &&
        area.score <= 10 &&
        typeof area.priority === "string" &&
        typeof area.observation === "string" &&
        typeof area.recommendation ===
          "string",
    )
  );
}

// GET通信を受け取り、ログイン中の本人の身体分析履歴を新しい順で返す
export async function GET(request: Request) {
  try {
    const clerkUserId =
      await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const db = getDb();

    // ClerkユーザーIDからNeon内の本人IDを取得する
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

    const user = matchedUsers[0] ?? null;

    if (!user) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 本人の完了済み分析を新しい順で最大50件取得する
    const analyses = await db
      .select({
        id: bodyAnalyses.id,
        summary: bodyAnalyses.summary,
        goalDifference:
          bodyAnalyses.goalDifference,
        analyzedAt: bodyAnalyses.analyzedAt,
      })
      .from(bodyAnalyses)
      .where(
        and(
          eq(bodyAnalyses.userId, user.id),
          eq(
            bodyAnalyses.status,
            "completed",
          ),
        ),
      )
      .orderBy(
        desc(bodyAnalyses.analyzedAt),
      )
      .limit(50);

    // 各分析へ肩・胸などの部位別結果を結び付ける
    const analysesWithAreas =
      await Promise.all(
        analyses.map(async (analysis) => {
          const areas = await db
            .select({
              id: bodyAnalysisAreas.id,
              bodyPart:
                bodyAnalysisAreas.bodyPart,
              score: bodyAnalysisAreas.score,
              priority:
                bodyAnalysisAreas.priority,
              observation:
                bodyAnalysisAreas.observation,
              recommendation:
                bodyAnalysisAreas.recommendation,
            })
            .from(bodyAnalysisAreas)
            .where(
              eq(
                bodyAnalysisAreas.analysisId,
                analysis.id,
              ),
            );

          return {
            ...analysis,
            areas,
          };
        }),
      );

    return Response.json({
      analyses: analysesWithAreas,
    });
  } catch (error) {
    console.error(
      "身体分析履歴の取得に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "身体分析履歴を取得できませんでした。",
      },
      { status: 500 },
    );
  }
}

// POST通信を受け取り、認証後にPythonの仮分析APIを呼ぶ
export async function POST(request: Request) {
  try {
    const clerkUserId =
      await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // ログイン中のClerkユーザーに対応するNeonのusers.idを取得する
    const db = getDb();

        // 本人のID・理想体型・身体情報をNeonからまとめて取得する
    const matchedUsers = await db
      .select({
        id: users.id,
        goalBodyType: users.goalBodyType,
        heightCm: userProfiles.heightCm,
        weightKg: userProfiles.weightKg,
        bodyFatPercentage:
          userProfiles.bodyFatPercentage,
      })
      .from(users)
      .leftJoin(
        userProfiles,
        eq(userProfiles.userId, users.id),
      )
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .limit(1);
    
    const user = matchedUsers[0] ?? null;

    if (!user) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        { status: 404 },
      );
    }

        // 理想体型・身長・体重が未設定なら画像分析を開始しない
    if (
      user.goalBodyType === null ||
      user.heightCm === null ||
      user.weightKg === null
    ) {
      return Response.json(
        {
          error:
            "理想体型と身長・体重を設定してください。",
        },
        { status: 400 },
      );
    }

    // 日本時間の同じ日に完了済みの分析があればOpenAIを呼ばずに終了する
    const now = new Date();
    const { start, end } =
      getJapanDayRange(now);

    const todayAnalyses = await db
      .select({
        id: bodyAnalyses.id,
      })
      .from(bodyAnalyses)
      .where(
        and(
          eq(bodyAnalyses.userId, user.id),
          eq(bodyAnalyses.status, "completed"),
          gte(bodyAnalyses.analyzedAt, start),
          lt(bodyAnalyses.analyzedAt, end),
        ),
      )
      .limit(1);

    if (todayAnalyses.length > 0) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (end.getTime() - now.getTime()) /
            1000,
        ),
      );

      return Response.json(
        {
          error:
            "身体分析は1日1回までです。明日もう一度お試しください。",
          nextAvailableAt: end.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              retryAfterSeconds,
            ),
          },
        },
      );
    }

    // フロントから送られた正面・横・背面画像を取り出す
    const requestFormData = await request.formData();

    const frontImage =
      requestFormData.get("front_image");
    const sideImage =
      requestFormData.get("side_image");
    const backImage =
      requestFormData.get("back_image");

    // 3枚すべてが画像ファイルとして送られたか確認する
    if (
      !(frontImage instanceof File) ||
      !(sideImage instanceof File) ||
      !(backImage instanceof File)
    ) {
      return Response.json(
        {
          error:
            "正面・横・背面の画像が必要です。",
        },
        { status: 400 },
      );
    }

    // 3枚をまとめて同じ安全確認に使用する
    const bodyImages = [
      frontImage,
      sideImage,
      backImage,
    ];

    // 許可していない画像形式をPythonへ送らない
    if (
      bodyImages.some(
        (image) =>
          !allowedImageTypes.has(image.type),
      )
    ) {
      return Response.json(
        {
          error:
            "JPEG・PNG・WebP画像を使用してください。",
        },
        { status: 415 },
      );
    }

    // 空の画像や8MBを超える画像をPythonへ送らない
    if (
      bodyImages.some(
        (image) =>
          image.size === 0 ||
          image.size > maxImageSizeBytes,
      )
    ) {
      return Response.json(
        {
          error:
            "画像は1枚につき8MB以下にしてください。",
        },
        { status: 413 },
      );
    }

    // 3枚合計が24MBを超える場合もPythonへ送らない
    const totalImageSizeBytes =
      bodyImages.reduce(
        (total, image) => total + image.size,
        0,
      );

    if (
      totalImageSizeBytes >
      maxTotalImageSizeBytes
    ) {
      return Response.json(
        {
          error:
            "画像3枚の合計は24MB以下にしてください。",
        },
        { status: 413 },
      );
    }

    // Pythonへ渡す画像データを作る
    const pythonFormData = new FormData();

    pythonFormData.append(
      "front_image",
      frontImage,
    );
    pythonFormData.append(
      "side_image",
      sideImage,
    );
    pythonFormData.append(
      "back_image",
      backImage,
    );

    // 理想体型と身体情報を文字列としてPythonへ渡す
    pythonFormData.append(
      "goal_body_type",
      user.goalBodyType,
    );
    pythonFormData.append(
      "height_cm",
      String(user.heightCm),
    );
    pythonFormData.append(
      "weight_kg",
      String(user.weightKg),
    );

    // 任意入力の体脂肪率は、登録されている場合だけ渡す
    if (user.bodyFatPercentage !== null) {
      pythonFormData.append(
        "body_fat_percentage",
        String(user.bodyFatPercentage),
      );
    }

    const pythonAbortController =
      new AbortController();

    const pythonTimeoutId = setTimeout(
      () => {
        pythonAbortController.abort();
      },
      pythonAnalysisTimeoutMilliseconds,
    );

    let pythonResponse: Response;
    let pythonResponseBody: unknown;

    try {
      pythonResponse = await fetch(
        `${pythonAnalysisUrl}/analyze`,
        {
          method: "POST",
          body: pythonFormData,
          signal:
            pythonAbortController.signal,
        },
      );

      try {
        pythonResponseBody =
          await pythonResponse.json();
      } catch {
        throw new PythonAnalysisApiError(
          502,
          "Python画像分析APIから結果を読み取れませんでした。",
        );
      }
    } catch (error) {
      if (pythonAbortController.signal.aborted) {
        throw new PythonAnalysisTimeoutError();
      }

      if (
        error instanceof PythonAnalysisApiError
      ) {
        throw error;
      }

      throw new PythonAnalysisUnavailableError();
    } finally {
      clearTimeout(pythonTimeoutId);
    }

    if (!pythonResponse.ok) {
      const pythonErrorDetail =
        typeof pythonResponseBody === "object" &&
        pythonResponseBody !== null &&
        "detail" in pythonResponseBody &&
        typeof pythonResponseBody.detail ===
          "string"
          ? pythonResponseBody.detail
          : "身体分析サービスでエラーが発生しました。";

      throw new PythonAnalysisApiError(
        pythonResponse.status,
        pythonErrorDetail,
      );
    }

    const analysisResult = pythonResponseBody;

    // PythonのJSON形式が不正ならNeon保存やフロント返却を行わない
    if (!isBodyAnalysisResult(analysisResult)) {
      throw new Error(
        "Python画像分析APIの返却形式が不正です。",
      );
    }

    // Pythonの分析全体を本人のbody_analysesへ保存する
    const createdAnalyses = await db
      .insert(bodyAnalyses)
      .values({
        userId: user.id,
        status: "completed",
        summary: analysisResult.summary.trim(),
        goalDifference:
          analysisResult.goal_difference.trim(),
        analyzedAt: new Date(),
      })
      .returning({
        id: bodyAnalyses.id,
      });

    const analysis =
      createdAnalyses[0] ?? null;

    if (!analysis) {
      throw new Error(
        "身体分析全体を保存できませんでした。",
      );
    }

    // 肩・胸などの部位別結果を親の身体分析へ結び付けてまとめて保存する
    if (analysisResult.areas.length > 0) {
      await db
        .insert(bodyAnalysisAreas)
        .values(
          analysisResult.areas.map(
            (area) => ({
              analysisId: analysis.id,
              bodyPart: area.body_part.trim(),
              score: area.score,
              priority: area.priority.trim(),
              observation:
                area.observation.trim(),
              recommendation:
                area.recommendation.trim(),
            }),
          ),
        );
    }

    // 保存した分析IDと検品済みの結果をフロントエンドへ返す
    return Response.json(
      {
        bodyAnalysisId: analysis.id,
        analysis: analysisResult,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof
      PythonAnalysisTimeoutError
    ) {
      console.error(
        "Python身体分析APIタイムアウト:",
        error,
      );

      return Response.json(
        {
          error:
            "身体分析に時間がかかっています。少し待ってからもう一度お試しください。",
        },
        {
          status: 504,
        },
      );
    }

    if (
      error instanceof
      PythonAnalysisUnavailableError
    ) {
      console.error(
        "Python身体分析APIへ接続できません:",
        error,
      );

      return Response.json(
        {
          error:
            "身体分析サービスを起動中、または一時的に利用できません。少し待ってからもう一度お試しください。",
        },
        { status: 503 },
      );
    }

    if (
      error instanceof PythonAnalysisApiError
    ) {
      console.error(
        "Python身体分析APIエラー:",
        error,
      );

      const responseStatus =
        error.status === 429
          ? 429
          : error.status === 504
            ? 504
            : error.status === 413
              ? 413
              : error.status === 400 ||
                  error.status === 415
                ? error.status
                : error.status >= 500
                  ? 503
                  : 502;

      return Response.json(
        { error: error.message },
        { status: responseStatus },
      );
    }

    console.error(
      "身体分析に失敗しました。",
      error,
    );

    return Response.json(
      {
        error: "身体分析に失敗しました。",
      },
      { status: 500 },
    );
  }
}
