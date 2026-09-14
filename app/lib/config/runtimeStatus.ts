// 公開環境が開発用・本番用のどちらのClerkキーを使っているか、値を見せずに判定する
export type AuthenticationMode =
  | "production"
  | "development"
  | "missing"
  | "mixed";

export function getAuthenticationMode(
  environment: Record<
    string,
    string | undefined
  > = process.env,
): AuthenticationMode {
  const publishableKey =
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    "";
  const secretKey =
    environment.CLERK_SECRET_KEY ?? "";

  if (!publishableKey || !secretKey) {
    return "missing";
  }

  const hasProductionPublishableKey =
    publishableKey.startsWith("pk_live_");
  const hasProductionSecretKey =
    secretKey.startsWith("sk_live_");
  const hasDevelopmentPublishableKey =
    publishableKey.startsWith("pk_test_");
  const hasDevelopmentSecretKey =
    secretKey.startsWith("sk_test_");

  if (
    hasProductionPublishableKey &&
    hasProductionSecretKey
  ) {
    return "production";
  }

  if (
    hasDevelopmentPublishableKey &&
    hasDevelopmentSecretKey
  ) {
    return "development";
  }

  return "mixed";
}

