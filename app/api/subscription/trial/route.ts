import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { logServerError } from "@/app/lib/observability/serverLog";
import {
  getPremiumAccess,
  trialDurationDays,
} from "@/app/lib/subscriptions/entitlements";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const trialChoiceSchema = z.object({
  action: z.enum(["start", "skip"]),
});

// 無料体験は自動開始せず、ログイン中の本人が明示的に選んだ時だけ更新する。
export async function POST(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const parsedBody = trialChoiceSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return Response.json(
        { error: "無料体験の選択内容が不正です。" },
        { status: 400 },
      );
    }

    const db = getDb();
    const matchedUsers = await db
      .select({
        id: users.id,
        trialUsed: users.trialUsed,
      })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);
    const user = matchedUsers[0] ?? null;

    if (!user) {
      return Response.json(
        { error: "ユーザー情報が見つかりません。" },
        { status: 404 },
      );
    }

    if (parsedBody.data.action === "skip") {
      await db
        .update(users)
        .set({
          trialChoiceCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return Response.json({
        accessLevel: "free",
        trialStarted: false,
      });
    }

    const premium = await getPremiumAccess(user.id);

    if (premium.isPremium) {
      return Response.json(
        { error: "Premium契約中は無料体験を開始する必要がありません。" },
        { status: 409 },
      );
    }

    if (user.trialUsed) {
      return Response.json(
        {
          error: "7日間無料体験は1アカウントにつき1回までです。",
          code: "TRIAL_ALREADY_USED",
        },
        { status: 409 },
      );
    }

    const startedAt = new Date();
    const endsAt = new Date(
      startedAt.getTime() +
        trialDurationDays * 24 * 60 * 60 * 1000,
    );

    // trial_used=falseを更新条件に含め、同時に2回押されても1回しか開始できない。
    const updatedUsers = await db
      .update(users)
      .set({
        trialChoiceCompleted: true,
        trialUsed: true,
        trialStartedAt: startedAt,
        trialEndsAt: endsAt,
        updatedAt: startedAt,
      })
      .where(
        and(
          eq(users.id, user.id),
          eq(users.trialUsed, false),
        ),
      )
      .returning({ id: users.id });

    if (updatedUsers.length === 0) {
      return Response.json(
        {
          error: "7日間無料体験はすでに利用されています。",
          code: "TRIAL_ALREADY_USED",
        },
        { status: 409 },
      );
    }

    return Response.json({
      accessLevel: "trial",
      trialStarted: true,
      startedAt,
      endsAt,
    });
  } catch (error) {
    logServerError("trial_choice_failed", error);
    return Response.json(
      { error: "無料体験の設定に失敗しました。" },
      { status: 500 },
    );
  }
}
