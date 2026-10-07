import { Buffer } from "node:buffer";

// Apple SDK expects node-fetch v2's Headers and response.buffer(). Worker-native
// fetch supports OCSP's HTTP requests without node:http compatibility shims.
export const Headers = globalThis.Headers;
export default async function appleWorkerFetch(
  input: string,
  options: RequestInit & { timeout?: number } = {},
) {
  const { timeout, signal, ...init } = options;
  const timeoutSignal = AbortSignal.timeout(timeout ?? 30_000);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;
  const response = await globalThis.fetch(input, {...init, signal: combinedSignal});
  return Object.assign(response, {
    buffer: async () => Buffer.from(await response.arrayBuffer()),
  });
}
