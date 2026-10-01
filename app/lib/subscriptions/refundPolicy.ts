export type AppleRefundPreference =
  | "DECLINE"
  | "GRANT_FULL"
  | "GRANT_PRORATED";

export type AppleSubscriptionStatus =
  | "active"
  | "grace_period"
  | "expired"
  | "revoked";

function configuredDeclineThreshold() {
  const value = Number(
    process.env.APPLE_REFUND_DECLINE_USAGE_THRESHOLD,
  );

  return Number.isInteger(value) && value >= 1
    ? value
    : 1;
}

// Appleへ送るのは最終決定ではなく、利用実績に基づく運営側の希望だけ。
// Appleが機能を提供できていない場合は、利用回数に関係なく全額返金を希望する。
export function decideAppleRefundPreference(input: {
  delivered: boolean;
  successfulAiCalls: number;
  declineUsageThreshold?: number;
}): AppleRefundPreference {
  if (!input.delivered) return "GRANT_FULL";

  const successfulAiCalls = Math.max(
    0,
    Math.trunc(input.successfulAiCalls),
  );
  const declineUsageThreshold =
    input.declineUsageThreshold ??
    configuredDeclineThreshold();

  if (successfulAiCalls === 0) {
    return "GRANT_FULL";
  }

  if (successfulAiCalls >= declineUsageThreshold) {
    return "DECLINE";
  }

  return "GRANT_PRORATED";
}

// 購入確認APIとApple通知APIで契約状態の判定がずれないようにする。
export function resolveAppleSubscriptionState(input: {
  normalExpiresAt: Date;
  graceExpiresAt?: Date | null;
  revoked: boolean;
  now?: Date;
}): {
  status: AppleSubscriptionStatus;
  expiresAt: Date;
} {
  const now = input.now ?? new Date();
  const graceExpiresAt = input.graceExpiresAt ?? null;
  const expiresAt =
    graceExpiresAt &&
    graceExpiresAt > input.normalExpiresAt
      ? graceExpiresAt
      : input.normalExpiresAt;

  if (input.revoked) {
    return { status: "revoked", expiresAt };
  }

  if (graceExpiresAt && graceExpiresAt > now) {
    return { status: "grace_period", expiresAt };
  }

  return {
    status: expiresAt > now ? "active" : "expired",
    expiresAt,
  };
}
