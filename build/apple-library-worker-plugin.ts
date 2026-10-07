import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";

// Workerd evaluates dynamic-import modules outside request context as well.
// Defer the SDK's CommonJS factory (including jsrsasign entropy initialization)
// until loadAppleLibrary() invokes it inside the request handler.
export function appleLibraryWorker(): Plugin {
  return {
    name: "apple-library-request-initialization",
    enforce: "pre",
    apply: "build",
    resolveId(source, importer) {
      if (source === "node-fetch" &&
          importer?.includes("@apple/app-store-server-library/")) {
        return fileURLToPath(new URL("./apple-worker-fetch.ts", import.meta.url));
      }
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" ||
            !Object.keys(output.modules).some(id =>
              id.includes("@apple/app-store-server-library/dist/index.js"))) continue;
        const factoryExport = /export default (require_[\w$]+)\(\);/g;
        const matches = [...output.code.matchAll(factoryExport)];
        if (matches.length !== 1) {
          this.error("Apple SDK bundle shape changed; refusing unsafe eager initialization.");
        }
        output.code = output.code.replace(factoryExport,
          "export default { __loadAppleServerLibrary: $1 };");
      }
    },
  };
}
