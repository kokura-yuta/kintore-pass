import type {
  ResponseInput,
} from "openai/resources/responses/responses";

import {
  chatTools,
} from "@/app/lib/ai/chatTools";

import {
  runChatTool,
} from "@/app/lib/ai/runChatTool";
import OpenAI from "openai";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lt,
} from "drizzle-orm";
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { systemPrompt } from "@/app/lib/ai/systemPrompt";
import { getDb } from "@/db";
import {
  chatConversations,
  chatMessages,
  users,
} from "@/db/schema";

// 環境変数のAPIキーを使ってOpenAIと通信する準備をする場所
const openai = new OpenAI();

// 1日と日本時間の時差をミリ秒で表す
const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const japanTimeOffsetMilliseconds =
  9 * 60 * 60 * 1000;

// 環境変数からAIチャットの1日上限を読み取る
const parsedDailyChatLimit =
  Number.parseInt(
    process.env.AI_CHAT_DAILY_LIMIT ??
      "100",
    10,
  );

// 不正な設定値だった場合は開発用の初期値100を使用する
const dailyChatLimit =
  Number.isInteger(
    parsedDailyChatLimit,
  ) &&
  parsedDailyChatLimit > 0
    ? parsedDailyChatLimit
    : 100;

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

type DeleteChatRequestBody = {
  conversationId?: string;
};

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

    const body =
      (await request
        .json()
        .catch(() => null)) as DeleteChatRequestBody | null;

    const conversationId =
      body?.conversationId?.trim() ?? "";

    if (!conversationId) {
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
    console.error(
      "チャット削除APIエラー:",
      error,
    );

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

type ChatRequestBody = {
  conversationId?: string | null;
  message?: string;
};

// フロントから質問を受け取り、本人確認後にOpenAIへ送る
export async function POST(request: Request) {
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

    const body =
      (await request
        .json()
        .catch(() => null)) as ChatRequestBody | null;

    const message =
      body?.message?.trim() ?? "";

    if (!message) {
      return Response.json(
        {
          error: "質問を入力してください。",
        },
        {
          status: 400,
        },
      );
    }

    if (message.length > 2000) {
      return Response.json(
        {
          error:
            "質問は2000文字以内で入力してください。",
        },
        {
          status: 400,
        },
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

    let conversationId =
      body?.conversationId?.trim() || null;

    // conversationIdが届いた場合は、本人のチャットか確認する
    if (conversationId) {
      const matchedConversations = await db
        .select({
          id: chatConversations.id,
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
    
        // 今の質問を含む直近20件の会話をNeonから取得する
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
      .limit(20);

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

        // 過去の会話をTool結果も追加できるOpenAI入力形式にする
    const aiInput: ResponseInput = [
      ...conversationInput,
    ];

    // AIへ会話履歴と利用可能なToolを渡す
    let aiResponse =
      await openai.responses.create({
        model: "gpt-5.6-luna",
        instructions: systemPrompt,
        input: aiInput,
        tools: [...chatTools],
        tool_choice: "auto",
      });

    // AIがToolを選んだ場合、最大3回まで実行して結果を返す
    for (
      let toolRound = 0;
      toolRound < 3;
      toolRound += 1
    ) {
      const toolCalls =
        aiResponse.output.filter(
          (outputItem) =>
            outputItem.type ===
            "function_call",
        );

      if (toolCalls.length === 0) {
        break;
      }

      // 次のOpenAI通信でも必要なTool要求・推論・回答だけを残す
      for (
        const outputItem of aiResponse.output
      ) {
        if (
          outputItem.type ===
            "function_call" ||
          outputItem.type === "reasoning" ||
          outputItem.type === "message"
        ) {
          aiInput.push(outputItem);
        }
      }

      for (const toolCall of toolCalls) {
        const toolResult =
          await runChatTool(
            toolCall.name,
            clerkUserId,
          );

        // どのTool要求への結果かcall_idで結び付ける
        aiInput.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: toolResult,
        });
      }

      // Tool結果を読ませて、最終回答または次のTool判断を作らせる
      aiResponse =
        await openai.responses.create({
          model: "gpt-5.6-luna",
          instructions: systemPrompt,
          input: aiInput,
          tools: [...chatTools],
          tool_choice: "auto",
        });
    }
    
    const reply =
      aiResponse.output_text.trim();

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
      usage: {
        limit: dailyChatLimit,
        used: updatedUsedChatCount,
        remaining: remainingChatCount,
        resetsAt: end.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "AIチャットAPIエラー:",
      error,
    );

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
