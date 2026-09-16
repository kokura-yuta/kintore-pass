import type {
  ResponseInput,
} from "openai/resources/responses/responses";
import { createSafetyIdentifier } from "@/app/lib/ai/createSafetyIdentifier";
import {
  APIConnectionTimeoutError,
} from "openai";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lt,
  max,
} from "drizzle-orm";
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { systemPrompt } from "@/app/lib/ai/systemPrompt";
import { openai } from "@/app/lib/ai/openAiClient";
import { checkModeration } from "@/app/lib/ai/checkModeration";
import {
  limitChatAnswer,
  maxChatOutputTokens,
  openAiChatModel,
  recentChatMessageLimit,
} from "@/app/lib/ai/config";
import {
  buildChatSummary,
} from "@/app/lib/ai/chatSummary";
import {
  recordOpenAiUsage,
} from "@/app/lib/ai/recordOpenAiUsage";
import {
  chatRequestSchema,
  deleteChatSchema,
} from "@/app/lib/validation/apiSchemas";
import { getDb } from "@/db";
import {
  aiRequestGuards,
  chatConversations,
  chatMessages,
  users,
} from "@/db/schema";
import { logServerError } from "@/app/lib/observability/serverLog";

// 1日と日本時間の時差をミリ秒で表す
const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const japanTimeOffsetMilliseconds =
  9 * 60 * 60 * 1000;

// 環境変数からAIチャットの1日上限を読み取る
const parsedDailyChatLimit =
  Number.parseInt(
    process.env.AI_CHAT_DAILY_LIMIT ??
      "30",
    10,
  );

// 不正な設定値だった場合も1日30回を使用する
const dailyChatLimit =
  Number.isInteger(
    parsedDailyChatLimit,
  ) &&
  parsedDailyChatLimit > 0
    ? parsedDailyChatLimit
    : 30;

// AIへの連続送信を止める秒数を環境変数から読み取る
const parsedRequestCooldownSeconds =
  Number.parseInt(
    process.env.AI_REQUEST_COOLDOWN_SECONDS ??
      "5",
    10,
  );

const requestCooldownMilliseconds =
  (Number.isInteger(
    parsedRequestCooldownSeconds,
  ) && parsedRequestCooldownSeconds > 0
    ? parsedRequestCooldownSeconds
    : 5) * 1000;

// 日本時間の今日0時と明日0時をUTCのDateへ変換する
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
    start.getTime() +
      millisecondsPerDay,
  );

  return {
    start,
    end,
  };
}

// ログイン中の本人のチャットルームを新しい順で取得する
export async function GET(request: Request) {
  const clerkUserId =
    await getClerkUserId(request);

  if (!clerkUserId) {
    return Response.json(
      {
        error: "ログインが必要です。",
      },
      {
        status: 401,
      },
    );
  }

    // URLの?conversationId=から開きたいチャットIDを取得する
  const requestUrl = new URL(request.url);

  const requestedConversationId =
    requestUrl.searchParams
      .get("conversationId")
      ?.trim() || null;

  const db = getDb();

  const conversations = await db
    .select({
      id: chatConversations.id,
      title: chatConversations.title,
      createdAt: chatConversations.createdAt,
      updatedAt: chatConversations.updatedAt,
    })
    .from(chatConversations)
    .innerJoin(
      users,
      eq(chatConversations.userId, users.id),
    )
    .where(
      eq(users.clerkUserId, clerkUserId),
    )
    .orderBy(
      desc(chatConversations.updatedAt),
    )
    .limit(50);

      // チャットIDが指定されていなければ一覧だけ返す
  if (!requestedConversationId) {
    return Response.json({
      conversations,
      messages: [],
    });
  }

  // 指定されたチャットがログイン中の本人のものか確認する
  const matchedConversations = await db
    .select({
      id: chatConversations.id,
    })
    .from(chatConversations)
    .innerJoin(
      users,
      eq(chatConversations.userId, users.id),
    )
    .where(
      and(
        eq(
          chatConversations.id,
          requestedConversationId,
        ),
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      ),
    )
    .limit(1);

  if (!matchedConversations[0]) {
    return Response.json(
      {
        error:
          "チャットが見つかりません。",
      },
      {
        status: 404,
      },
    );
  }

  // 本人確認できたチャットのメッセージを古い順で取得する
  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      eq(
        chatMessages.conversationId,
        requestedConversationId,
      ),
    )
    .orderBy(
      asc(chatMessages.createdAt),
    )
    .limit(200);

  return Response.json({
    conversations,
    messages,
  });
}

// 本人のチャットルームと、その中の全メッセージをNeonから削除する
export async function DELETE(request: Request) {
  try {
    const clerkUserId =
      await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        },
      );
    }

    const parsedBody =
      deleteChatSchema.safeParse(
        await request.json().catch(() => null),
      );

    if (!parsedBody.success) {
      return Response.json(
        {
          error:
            "削除するチャットIDが必要です。",
        },
        {
          status: 400,
        },
      );
    }

    const { conversationId } =
      parsedBody.data;

    const db = getDb();

    // Clerk IDが一致する本人のチャットだけを検索する
    const matchedConversations = await db
      .select({
        id: chatConversations.id,
      })
      .from(chatConversations)
      .innerJoin(
        users,
        eq(chatConversations.userId, users.id),
      )
      .where(
        and(
          eq(
            chatConversations.id,
            conversationId,
          ),
          eq(
            users.clerkUserId,
            clerkUserId,
          ),
        ),
      )
      .limit(1);

    const matchedConversation =
      matchedConversations[0] ?? null;

    if (!matchedConversation) {
      return Response.json(
        {
          error:
            "チャットが見つかりません。",
        },
        {
          status: 404,
        },
      );
    }

    // 親チャットを削除すると、onDelete: cascadeで子メッセージも削除される
    await db
      .delete(chatConversations)
      .where(
        eq(
          chatConversations.id,
          matchedConversation.id,
        ),
      );

    return Response.json({
      deletedConversationId:
        matchedConversation.id,
    });
  } catch (error) {
    logServerError("chat_delete_failed", error);

    return Response.json(
      {
        error:
          "チャットを削除できませんでした。",
      },
      {
        status: 500,
      },
    );
  }
}

// フロントから質問を受け取り、本人確認後にOpenAIへ送る
export async function POST(request: Request) {
  let requestGuardId: string | null = null;

  try {
    const clerkUserId =
      await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        },
      );
    }

    // Clerk IDからOpenAIへ渡す匿名IDを作る
    const safetyIdentifier =
      await createSafetyIdentifier(
        clerkUserId,
      );

    const parsedBody =
      chatRequestSchema.safeParse(
        await request.json().catch(() => null),
      );

    if (!parsedBody.success) {
      return Response.json(
        {
          error:
            "質問・チャットID・リクエストIDを確認してください。",
        },
        {
          status: 400,
        },
      );
    }

    const body = parsedBody.data;
    const { message, requestId } = body;

    // 質問を保存・回答生成する前に重大な危険内容がないか確認する
    const moderationDecision =
      await checkModeration(message);

    if (
      moderationDecision.status ===
      "self_harm_support"
    ) {
      return Response.json(
        {
          error:
            "今すぐ自分を傷つける可能性がある場合は、一人にならず、身近な人や地域の緊急窓口へ連絡してください。差し迫った危険がある場合は119へ連絡してください。",
          moderationStatus:
            moderationDecision.status,
        },
        { status: 400 },
      );
    }

    if (
      moderationDecision.status ===
      "blocked"
    ) {
      return Response.json(
        {
          error:
            "安全上の理由により、この内容には回答できません。筋力トレーニングに関する別の表現で質問してください。",
          moderationStatus:
            moderationDecision.status,
        },
        { status: 400 },
      );
    }

        // ClerkユーザーIDからNeon内の本人を取得する
    const db = getDb();

    const matchedUsers = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        eq(users.clerkUserId, clerkUserId),
      )
      .limit(1);

    const user = matchedUsers[0] ?? null;

    if (!user) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        {
          status: 404,
        },
      );
    }

    // 日本時間で今日の開始時刻と終了時刻を作る
    const { start, end } =
      getJapanDayRange(new Date());

    // 本人が今日送った質問数をNeonから数える
    const dailyUsageResults = await db
      .select({
        usageCount: count(chatMessages.id),
        latestCreatedAt: max(
          chatMessages.createdAt,
        ),
      })
      .from(chatMessages)
      .innerJoin(
        chatConversations,
        eq(
          chatMessages.conversationId,
          chatConversations.id,
        ),
      )
      .where(
        and(
          eq(
            chatConversations.userId,
            user.id,
          ),
          eq(chatMessages.role, "user"),
          gte(chatMessages.createdAt, start),
          lt(chatMessages.createdAt, end),
        ),
      );

    // 検索結果から今日の質問数を取り出す
    const usedChatCount =
      Number(
        dailyUsageResults[0]?.usageCount ?? 0,
      );

    const latestQuestionCreatedAt =
      dailyUsageResults[0]?.latestCreatedAt ??
      null;

    // 最新の質問から5秒以内ならOpenAIを呼ばずに終了する
    if (latestQuestionCreatedAt) {
      const nextRequestAt = new Date(
        latestQuestionCreatedAt.getTime() +
          requestCooldownMilliseconds,
      );

      if (nextRequestAt.getTime() > Date.now()) {
        const cooldownRetryAfterSeconds =
          Math.max(
            1,
            Math.ceil(
              (nextRequestAt.getTime() -
                Date.now()) /
                1000,
            ),
          );

        return Response.json(
          {
            error:
              "連続送信を防ぐため、少し待ってから再送してください。",
            retryAfterSeconds:
              cooldownRetryAfterSeconds,
            nextAvailableAt:
              nextRequestAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                cooldownRetryAfterSeconds,
              ),
            },
          },
        );
      }
    }

    // 明日の日本時間0時まで何秒あるか計算する
    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          (end.getTime() - Date.now()) /
            1000,
        ),
      );

    // 1日の上限に達していたらAIを呼ばずに終了する
    if (usedChatCount >= dailyChatLimit) {
      return Response.json(
        {
          error:
            "本日のAIチャット利用上限に達しました。",
          limit: dailyChatLimit,
          used: usedChatCount,
          remaining: 0,
          nextAvailableAt:
            end.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(retryAfterSeconds),
          },
        },
      );
    }

    // 同じリクエストIDは1件目だけ登録し、二重送信を止める
    const insertedGuards = await db
      .insert(aiRequestGuards)
      .values({
        userId: user.id,
        requestType: "chat",
        requestId,
      })
      .onConflictDoNothing({
        target: [
          aiRequestGuards.userId,
          aiRequestGuards.requestType,
          aiRequestGuards.requestId,
        ],
      })
      .returning({
        id: aiRequestGuards.id,
      });

    requestGuardId =
      insertedGuards[0]?.id ?? null;

    if (!requestGuardId) {
      return Response.json(
        {
          error:
            "同じ質問を処理中または処理済みです。",
          requestId,
        },
        {
          status: 409,
        },
      );
    }

    let conversationId =
      body?.conversationId?.trim() || null;
    let conversationSummary = "";
    let summarizedMessageCount = 0;

    // conversationIdが届いた場合は、本人のチャットか確認する
    if (conversationId) {
      const matchedConversations = await db
        .select({
          id: chatConversations.id,
          summary: chatConversations.summary,
          summarizedMessageCount:
            chatConversations.summarizedMessageCount,
        })
        .from(chatConversations)
        .where(
          and(
            eq(
              chatConversations.id,
              conversationId,
            ),
            eq(
              chatConversations.userId,
              user.id,
            ),
          ),
        )
        .limit(1);

      if (!matchedConversations[0]) {
        await db
          .delete(aiRequestGuards)
          .where(
            eq(
              aiRequestGuards.id,
              requestGuardId,
            ),
          );
        requestGuardId = null;

        return Response.json(
          {
            error:
              "チャットが見つかりません。",
          },
          {
            status: 404,
          },
        );
      }

      conversationSummary =
        matchedConversations[0].summary;
      summarizedMessageCount =
        matchedConversations[0]
          .summarizedMessageCount;
    } else {
      // 新規チャットなら最初の質問からタイトルを作る
      const createdConversations = await db
        .insert(chatConversations)
        .values({
          userId: user.id,
          title:
            message.slice(0, 40) ||
            "新しい相談",
        })
        .returning({
          id: chatConversations.id,
        });

      conversationId =
        createdConversations[0]?.id ?? null;

      if (!conversationId) {
        throw new Error(
          "チャットルームを作成できませんでした。",
        );
      }
    }

        // 利用者の質問をAIへ送る前にNeonへ保存する
    await db
      .insert(chatMessages)
      .values({
        conversationId,
        role: "user",
        content: message,
      });
    
    // 今の質問と、その直前5往復だけをNeonから取得する
    const recentMessages = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        eq(
          chatMessages.conversationId,
          conversationId,
        ),
      )
      .orderBy(
        desc(chatMessages.createdAt),
      )
      .limit(recentChatMessageLimit + 1);

    // このチャットの総メッセージ数を調べ、5往復から外れた分だけ要約対象にする
    const messageCountResults = await db
      .select({
        messageCount: count(chatMessages.id),
      })
      .from(chatMessages)
      .where(
        eq(
          chatMessages.conversationId,
          conversationId,
        ),
      );

    const totalMessageCount = Number(
      messageCountResults[0]?.messageCount ?? 0,
    );
    const targetSummarizedMessageCount =
      Math.max(
        0,
        totalMessageCount -
          (recentChatMessageLimit + 1),
      );
    const newlyOldMessageCount = Math.max(
      0,
      targetSummarizedMessageCount -
        summarizedMessageCount,
    );

    // 前回の要約後に新しく古くなったメッセージだけを取得する
    const newlyOldMessages =
      newlyOldMessageCount > 0
        ? await db
            .select({
              role: chatMessages.role,
              content: chatMessages.content,
            })
            .from(chatMessages)
            .where(
              eq(
                chatMessages.conversationId,
                conversationId,
              ),
            )
            .orderBy(
              asc(chatMessages.createdAt),
            )
            .offset(summarizedMessageCount)
            .limit(newlyOldMessageCount)
        : [];

    // OpenAIを追加で呼ばず、本人情報と古い相談を短いDB要約へ更新する
    conversationSummary =
      await buildChatSummary({
        clerkUserId,
        existingSummary:
          conversationSummary,
        newlyOldUserMessages:
          newlyOldMessages
            .filter(
              (storedMessage) =>
                storedMessage.role === "user",
            )
            .map(
              (storedMessage) =>
                storedMessage.content,
            ),
      });

    // 新しい順の検索結果を、AIが読める古い順へ並べ直す
    const conversationInput = [
      ...recentMessages,
    ]
      .reverse()
      .map((storedMessage) => ({
        role:
          storedMessage.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: storedMessage.content,
      }));

    // 短い要約・直近5往復・今回の質問だけをOpenAI入力にする
    const aiInput: ResponseInput = [
      {
        role: "developer",
        content: `# 利用者の要約\n${conversationSummary || "保存済み情報なし"}`,
      },
      ...conversationInput,
    ];

    // 1回の有料生成で回答を作る。本人情報は要約済みなので追加Tool通信は行わない
    const aiResponse =
      await openai.responses.create({
        model: openAiChatModel,
        instructions: systemPrompt,
        input: aiInput,
        max_output_tokens:
          maxChatOutputTokens,
        reasoning: {
          effort: "none",
        },
        store: false,
        safety_identifier:
        safetyIdentifier,
      });

    // 本文を残さず、モデルとトークン数をユーザー別にNeonへ保存する
    await recordOpenAiUsage({
      userId: user.id,
      feature: "chat",
      model: openAiChatModel,
      requestId,
      usage: aiResponse.usage,
    });
    
    const reply = limitChatAnswer(
      aiResponse.output_text.trim(),
    );

    if (!reply) {
      throw new Error(
        "OpenAIから回答文を取得できませんでした。",
      );
    }

    // AIの回答を同じチャットルームへ保存する
    await db
      .insert(chatMessages)
      .values({
        conversationId,
        role: "assistant",
        content: reply,
      });

    // 最後に会話した日時を更新して履歴一覧の一番上へ移動する
    await db
      .update(chatConversations)
      .set({
        summary: conversationSummary,
        summarizedMessageCount:
          targetSummarizedMessageCount,
        updatedAt: new Date(),
      })
      .where(
        eq(
          chatConversations.id,
          conversationId,
        ),
      );
      // 今回保存した質問を含めた使用回数を計算する
    const updatedUsedChatCount =
      usedChatCount + 1;

    // 今日あと何回質問できるか計算する
    const remainingChatCount =
      Math.max(
        0,
        dailyChatLimit -
          updatedUsedChatCount,
      );

    // AIの回答と今日の利用状況をフロントへ返す
    return Response.json({
      conversationId,
      reply,
      requestId,
      usage: {
        limit: dailyChatLimit,
        used: updatedUsedChatCount,
        remaining: remainingChatCount,
        resetsAt: end.toISOString(),
      },
    });
  } catch (error) {
    // 処理失敗時は受付記録を削除し、同じ操作を再試行できるようにする
    if (requestGuardId) {
      try {
        await getDb()
          .delete(aiRequestGuards)
          .where(
            eq(
              aiRequestGuards.id,
              requestGuardId,
            ),
          );
      } catch (cleanupError) {
        logServerError(
          "chat_guard_cleanup_failed",
          cleanupError,
        );
      }
    }

    if (
      error instanceof
      APIConnectionTimeoutError
    ) {
      logServerError(
        "chat_openai_timeout",
        error,
      );

      return Response.json(
        {
          error:
            "AIの応答に時間がかかっています。少し待ってからもう一度お試しください。",
        },
        {
          status: 504,
        },
      );
    }

    logServerError("chat_post_failed", error);

    return Response.json(
      {
        error:
          "AIチャットの処理に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
