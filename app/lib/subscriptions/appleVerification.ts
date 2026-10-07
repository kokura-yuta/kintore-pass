import { Buffer } from "node:buffer";

import type {
  ConsumptionRequest,
  JWSRenewalInfoDecodedPayload,
  ResponseBodyV2DecodedPayload,
  JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";

const bundleId =
  process.env.APPLE_BUNDLE_ID?.trim() ||
  "com.kintorepas.app";

function readRootCertificates() {
  const encodedCertificates = [
    process.env.APPLE_ROOT_CA_G2_BASE64,
    process.env.APPLE_ROOT_CA_G3_BASE64,
  ].filter(
    (value): value is string =>
      Boolean(value?.trim()),
  );

  if (encodedCertificates.length === 0) {
    throw Object.assign(new Error("APPLE_ROOT_CERTIFICATES_MISSING"), {
      code: "APPLE_ROOT_CERTIFICATES_MISSING",
    });
  }

  return encodedCertificates.map((value) =>
    Buffer.from(value.replace(/\s/g, ""), "base64"),
  );
}

function configuredEnvironmentName() {
  return process.env.APPLE_IAP_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

async function createVerifier() {
  // Apple公式ライブラリは読込時に乱数を作るため、
  // Cloudflare Workerのグローバル領域ではなく、リクエスト中に遅延読込する。
  let library: typeof import("@apple/app-store-server-library");
  try {
    library = await import("@apple/app-store-server-library");
  } catch (cause) {
    throw Object.assign(new Error("Apple verifier import failed", { cause }), {
      code: "APPLE_VERIFIER_IMPORT_FAILED",
    });
  }
  const { Environment, SignedDataVerifier } = library;
  const environment =
    configuredEnvironmentName() === "production"
      ? Environment.PRODUCTION
      : Environment.SANDBOX;
  const appAppleId =
    environment === Environment.PRODUCTION
      ? Number(process.env.APPLE_APP_ID)
      : undefined;

  if (
    environment === Environment.PRODUCTION &&
    (!Number.isInteger(appAppleId) || !appAppleId)
  ) {
    throw new Error("APPLE_APP_ID_MISSING");
  }

  const certificates = readRootCertificates();
  try {
    return new SignedDataVerifier(certificates, true, environment, bundleId, appAppleId);
  } catch (cause) {
    throw Object.assign(new Error("Apple verifier construction failed", { cause }), {
      code: "APPLE_VERIFIER_CONSTRUCTION_FAILED",
    });
  }
}

function requiredServerApiSetting(
  name:
    | "APPLE_IAP_ISSUER_ID"
    | "APPLE_IAP_KEY_ID"
    | "APPLE_IAP_PRIVATE_KEY_BASE64",
) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name}_MISSING`);
  }

  return value;
}

async function createServerApiClient() {
  const {
    AppStoreServerAPIClient,
    Environment,
  } = await import("@apple/app-store-server-library");
  const environment =
    configuredEnvironmentName() === "production"
      ? Environment.PRODUCTION
      : Environment.SANDBOX;
  const privateKey = Buffer.from(
    requiredServerApiSetting(
      "APPLE_IAP_PRIVATE_KEY_BASE64",
    ).replace(/\s/g, ""),
    "base64",
  ).toString("utf8");

  if (!privateKey.includes("PRIVATE KEY")) {
    throw new Error("APPLE_IAP_PRIVATE_KEY_INVALID");
  }

  return new AppStoreServerAPIClient(
    privateKey,
    requiredServerApiSetting("APPLE_IAP_KEY_ID"),
    requiredServerApiSetting("APPLE_IAP_ISSUER_ID"),
    bundleId,
    environment,
  );
}

export async function verifyAppleTransaction(
  signedTransactionInfo: string,
): Promise<JWSTransactionDecodedPayload> {
  const verifier = await createVerifier();
  return verifier.verifyAndDecodeTransaction(
    signedTransactionInfo,
  );
}

export async function verifyAppleNotification(
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> {
  let verifier: Awaited<ReturnType<typeof createVerifier>>;
  try {
    verifier = await createVerifier();
  } catch (cause) {
    const setupCode = cause && typeof cause === "object" && "code" in cause
      ? cause.code : undefined;
    const code = ["APPLE_ROOT_CERTIFICATES_MISSING", "APPLE_VERIFIER_IMPORT_FAILED", "APPLE_VERIFIER_CONSTRUCTION_FAILED"].includes(String(setupCode))
      ? String(setupCode) : "APPLE_VERIFIER_SETUP_FAILED";
    throw Object.assign(new Error("Apple verifier setup failed", { cause }), {
      code,
    });
  }
  try {
    return await verifier.verifyAndDecodeNotification(signedPayload);
  } catch (cause) {
    // 本文・署名・秘密鍵はログへ渡さず、公式検証ステータスだけを残す。
    const status = cause && typeof cause === "object" && "status" in cause
      ? cause.status
      : undefined;
    const code = typeof status === "number" && Number.isInteger(status) && status >= 0 && status <= 7
      ? `APPLE_VERIFICATION_STATUS_${status}`
      : "APPLE_NOTIFICATION_VERIFICATION_FAILED";
    throw Object.assign(new Error("Apple notification verification failed", { cause }), { code });
  }
}

export async function verifyAppleRenewalInfo(
  signedRenewalInfo: string,
): Promise<JWSRenewalInfoDecodedPayload> {
  const verifier = await createVerifier();
  return verifier.verifyAndDecodeRenewalInfo(
    signedRenewalInfo,
  );
}

export async function sendAppleConsumptionInformation(
  transactionId: string,
  consumptionRequest: ConsumptionRequest,
) {
  const client = await createServerApiClient();
  await client.sendConsumptionInformation(
    transactionId,
    consumptionRequest,
  );
}

export function expectedAppleProductId() {
  const productId =
    process.env.APPLE_PREMIUM_PRODUCT_ID?.trim();

  if (!productId) {
    throw new Error("APPLE_PRODUCT_ID_MISSING");
  }

  return productId;
}

export function appleEnvironmentName() {
  return configuredEnvironmentName();
}
