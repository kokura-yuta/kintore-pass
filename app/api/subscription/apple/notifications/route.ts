import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { logServerError } from "@/app/lib/observability/serverLog";
import {
  appleEnvironmentName,
  expectedAppleProductId,
  verifyAppleNotification,
  verifyAppleRenewalInfo,
  verifyAppleTransaction,
} from "@/app/lib/subscriptions/appleVerification";
import { getDb } from "@/db";
import { userSubscriptions } from "@/db/schema";

const notificationSchema = z.object({
  signedPayload: z.string().min(100).max(500_000),
});

export async function POST(request: Request) {
  try {
    const input = notificationSchema.safeParse(await request.json());
    if (!input.success) {
      return Response.json({ error: "通知形式が正しくありません。" }, { status: 400 });
    }

    const notification = await verifyAppleNotification(input.data.signedPayload);
    const signedTransactionInfo = notification.data?.signedTransactionInfo;
    if (!signedTransactionInfo) return Response.json({ received: true });

    const transaction = await verifyAppleTransaction(signedTransactionInfo);
    const productId = expectedAppleProductId();
    if (
      transaction.productId !== productId ||
      !transaction.originalTransactionId ||
      !transaction.expiresDate
    ) {
      return Response.json({ received: true, ignored: true });
    }

    const renewal = notification.data?.signedRenewalInfo
      ? await verifyAppleRenewalInfo(notification.data.signedRenewalInfo)
      : null;
    const now = new Date();
    const normalExpiresAt = new Date(transaction.expiresDate);
    const graceExpiresAt = renewal?.gracePeriodExpiresDate
      ? new Date(renewal.gracePeriodExpiresDate)
      : null;
    const expiresAt = graceExpiresAt && graceExpiresAt > normalExpiresAt
      ? graceExpiresAt
      : normalExpiresAt;
    const status = transaction.revocationDate
      ? "revoked"
      : graceExpiresAt && graceExpiresAt > now
        ? "grace_period"
        : expiresAt > now
          ? "active"
          : "expired";

    await getDb()
      .update(userSubscriptions)
      .set({
        status,
        environment: appleEnvironmentName(),
        expiresAt,
        lastVerifiedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userSubscriptions.originalTransactionId, transaction.originalTransactionId),
          eq(userSubscriptions.productId, productId),
        ),
      );

    return Response.json({ received: true });
  } catch (error) {
    logServerError("apple_subscription_notification_failed", error);
    return Response.json({ error: "Apple通知を確認できませんでした。" }, { status: 400 });
  }
}
