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
    throw new Error("APPLE_ROOT_CERTIFICATES_MISSING");
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
  const { Environment, SignedDataVerifier } =
    await import("@apple/app-store-server-library");
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

  return new SignedDataVerifier(
    readRootCertificates(),
    true,
    environment,
    bundleId,
    appAppleId,
  );
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
  const verifier = await createVerifier();
  return verifier.verifyAndDecodeNotification(
    signedPayload,
  );
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
