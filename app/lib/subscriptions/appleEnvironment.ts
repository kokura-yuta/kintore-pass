export type AppleEnvironmentName = "production" | "sandbox";
export type AppleEnvironmentMode = AppleEnvironmentName | "auto";

export function appleEnvironmentMode(value: string | undefined): AppleEnvironmentMode {
  if (value === "production" || value === "auto") return value;
  if (!value || value === "sandbox") return "sandbox";
  throw new Error("APPLE_IAP_ENVIRONMENT_INVALID");
}

// Only retry Apple's fully verified environment-mismatch error. Signature,
// certificate, revocation, app identifier and network failures remain failures.
export async function verifyInAppleEnvironment<T>(
  mode: AppleEnvironmentMode,
  verify: (environment: AppleEnvironmentName) => Promise<T>,
  invalidEnvironmentStatus: number,
): Promise<T> {
  const first = mode === "auto" ? "production" : mode;
  try {
    return await verify(first);
  } catch (error) {
    if (mode !== "auto" || !error || typeof error !== "object" ||
        !("status" in error) || error.status !== invalidEnvironmentStatus) throw error;
    return verify("sandbox");
  }
}

// Call only on the payload returned by Apple's SignedDataVerifier, never on an
// unverified JWS or an environment supplied by the client.
export function verifiedAppleEnvironment(value: unknown): AppleEnvironmentName {
  if (value === "Production") return "production";
  if (value === "Sandbox") return "sandbox";
  throw new Error("APPLE_VERIFIED_ENVIRONMENT_INVALID");
}
