import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { logServerError } from "@/app/lib/observability/serverLog";
import {
  appleEnvironmentName,
  expectedAppleProductId,
  sendAppleConsumptionInformation,
  verifyAppleNotification,
  verifyAppleRenewalInfo,
  verifyAppleTransaction,
} from "@/app/lib/subscriptions/appleVerification";
import {
  decideAppleRefundPreference,
  resolveAppleSubscriptionState,
} from "@/app/lib/subscriptions/refundPolicy";
import { getDb } from "@/db";
import {
  openAiUsageRecords,
  userSubscriptions,
} from "@/db/schema";

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
    const environment = appleEnvironmentName(transaction.environment);
    if (environment !== appleEnvironmentName(notification.data?.environment)) {
      throw new Error("APPLE_NOTIFICATION_ENVIRONMENT_MISMATCH");
    }
    const productId = expectedAppleProductId();
    if (
      transaction.productId !== productId ||
      !transaction.originalTransactionId ||
      !transaction.expiresDate
    ) {
      return Response.json({ received: true, ignored: true });
    }

    if (notification.notificationType === "CONSUMPTION_REQUEST") {
      if (!transaction.transactionId) {
        return Response.json({ received: true, ignored: true });
      }

      const db = getDb();
      const owners = await db
        .select({ userId: userSubscriptions.userId })
        .from(userSubscriptions)
        .where(
          and(
            eq(
              userSubscriptions.originalTransactionId,
              transaction.originalTransactionId,
            ),
            eq(userSubscriptions.productId, productId),
            eq(userSubscriptions.environment, environment),
          ),
        )
        .limit(1);
      const owner = owners[0] ?? null;

      if (
        !owner ||
        (transaction.appAccountToken &&
          transaction.appAccountToken !== owner.userId)
      ) {
        return Response.json({ received: true, ignored: true });
      }

      const purchasedAtMilliseconds =
        transaction.purchaseDate ??
        transaction.originalPurchaseDate;

      if (!purchasedAtMilliseconds) {
        return Response.json({ received: true, ignored: true });
      }

      const usageRows = await db
        .select({ calls: count() })
        .from(openAiUsageRecords)
        .where(
          and(
            eq(openAiUsageRecords.userId, owner.userId),
            gte(
              openAiUsageRecords.createdAt,
              new Date(purchasedAtMilliseconds),
            ),
          ),
        );
      const successfulAiCalls = Number(
        usageRows[0]?.calls ?? 0,
      );
      const refundPreference =
        decideAppleRefundPreference({
          delivered: true,
          successfulAiCalls,
        });

      // この通知は利用者がAppleへの利用情報送信へ同意した場合に届く。
      // 自動更新プランでは利用割合を送らず、Apple側で算出してもらう。
      await sendAppleConsumptionInformation(
        transaction.transactionId,
        {
          customerConsented: true,
          deliveryStatus: "DELIVERED",
          sampleContentProvided: true,
          refundPreference,
        },
        environment,
      );

      return Response.json({
        received: true,
        consumptionInformationSent: true,
      });
    }

    const renewal = notification.data?.signedRenewalInfo
      ? await verifyAppleRenewalInfo(notification.data.signedRenewalInfo, environment)
      : null;
    const now = new Date();
    const normalExpiresAt = new Date(transaction.expiresDate);
    const graceExpiresAt = renewal?.gracePeriodExpiresDate
      ? new Date(renewal.gracePeriodExpiresDate)
      : null;
    const { status, expiresAt } =
      resolveAppleSubscriptionState({
        normalExpiresAt,
        graceExpiresAt,
        revoked: Boolean(transaction.revocationDate),
        now,
      });

    await getDb()
      .update(userSubscriptions)
      .set({
        status,
        environment,
        expiresAt,
        lastVerifiedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userSubscriptions.originalTransactionId, transaction.originalTransactionId),
          eq(userSubscriptions.productId, productId),
          eq(userSubscriptions.environment, environment),
        ),
      );

    return Response.json({ received: true });
  } catch (error) {
    logServerError("apple_subscription_notification_failed", error);
    return Response.json(
      { error: "Apple通知を確認できませんでした。" },
      { status: 503 },
    );
  }
}
