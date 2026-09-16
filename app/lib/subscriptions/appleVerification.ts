import { Buffer } from "node:buffer";

import {
  Environment,
  SignedDataVerifier,
  type JWSRenewalInfoDecodedPayload,
  type ResponseBodyV2DecodedPayload,
  type JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";

const bundleId =
  process.env.APPLE_BUNDLE_ID?.trim() ||
  "com.yoshida.kintorepas";

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

function configuredEnvironment() {
  return process.env.APPLE_IAP_ENVIRONMENT === "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

function createVerifier() {
  const environment = configuredEnvironment();
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

export async function verifyAppleTransaction(
  signedTransactionInfo: string,
): Promise<JWSTransactionDecodedPayload> {
  return createVerifier().verifyAndDecodeTransaction(
    signedTransactionInfo,
  );
}

export async function verifyAppleNotification(
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> {
  return createVerifier().verifyAndDecodeNotification(
    signedPayload,
  );
}

export async function verifyAppleRenewalInfo(
  signedRenewalInfo: string,
): Promise<JWSRenewalInfoDecodedPayload> {
  return createVerifier().verifyAndDecodeRenewalInfo(
    signedRenewalInfo,
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
  return configuredEnvironment() === Environment.PRODUCTION
    ? "production"
    : "sandbox";
}
