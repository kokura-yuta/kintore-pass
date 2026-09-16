import { eq } from "drizzle-orm";
import { z } from "zod";

import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { logServerError } from "@/app/lib/observability/serverLog";
import {
  appleEnvironmentName,
  expectedAppleProductId,
  verifyAppleTransaction,
} from "@/app/lib/subscriptions/appleVerification";
import { getDb } from "@/db";
import { users, userSubscriptions } from "@/db/schema";

const requestSchema = z.object({
  signedTransactionInfo: z.string().min(100).max(100_000),
});

export async function POST(request: Request) {
  const clerkUserId = await getClerkUserId(request);

  if (!clerkUserId) {
    return Response.json(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  try {
    const input = requestSchema.safeParse(await request.json());

    if (!input.success) {
      return Response.json(
        { error: "購入情報が正しくありません。" },
        { status: 400 },
      );
    }

    const db = getDb();
    const matchedUsers = await db
      .select({ id: users.id })
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

    const transaction = await verifyAppleTransaction(
      input.data.signedTransactionInfo,
    );
    const productId = expectedAppleProductId();

    if (
      transaction.productId !== productId ||
      !transaction.originalTransactionId ||
      !transaction.expiresDate
    ) {
      return Response.json(
        { error: "対象プランの購入情報ではありません。" },
        { status: 400 },
      );
    }

    if (transaction.appAccountToken !== user.id) {
      return Response.json(
        { error: "この購入情報は別のアカウントに紐づいています。" },
        { status: 403 },
      );
    }

    const existingOwners = await db
      .select({ userId: userSubscriptions.userId })
      .from(userSubscriptions)
      .where(
        eq(
          userSubscriptions.originalTransactionId,
          transaction.originalTransactionId,
        ),
      )
      .limit(1);

    if (
      existingOwners[0] &&
      existingOwners[0].userId !== user.id
    ) {
      return Response.json(
        { error: "この購入は別のアカウントで使用されています。" },
        { status: 409 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(transaction.expiresDate);
    const status = transaction.revocationDate
      ? "revoked"
      : expiresAt > now
        ? "active"
        : "expired";
    const values = {
      userId: user.id,
      provider: "apple",
      productId,
      originalTransactionId:
        transaction.originalTransactionId,
      status,
      environment: appleEnvironmentName(),
      expiresAt,
      lastVerifiedAt: now,
      updatedAt: now,
    };

    await db
      .insert(userSubscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: values,
      });

    return Response.json({
      plan: status === "active" ? "premium" : "free",
      status,
      productId,
      expiresAt,
    });
  } catch (error) {
    logServerError("apple_purchase_verification_failed", error);
    return Response.json(
      {
        error:
          "Appleの購入情報を確認できませんでした。設定または購入状態を確認してください。",
      },
      { status: 503 },
    );
  }
}
