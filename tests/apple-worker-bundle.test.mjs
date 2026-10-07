import assert from 'node:assert/strict';
import test from 'node:test';
import { appleLibraryWorker } from '../build/apple-library-worker-plugin.ts';
import appleWorkerFetch from '../build/apple-worker-fetch.ts';

test('Apple SDK factory initializes in the request, not module scope', () => {
  const chunk = {
    type: 'chunk',
    modules: {'/node_modules/@apple/app-store-server-library/dist/index.js': {}},
    code: 'export default require_dist();',
  };
  appleLibraryWorker().generateBundle.call({error: message => { throw Error(message); }}, {}, {sdk: chunk});
  assert.equal(chunk.code, 'export default { __loadAppleServerLibrary: require_dist };');
});

test('SDK bundle format changes fail the build rather than bypass validation', () => {
  const chunk = {type:'chunk', modules:{'/node_modules/@apple/app-store-server-library/dist/index.js':{}}, code:'export default unsupported();'};
  assert.throws(() => appleLibraryWorker().generateBundle.call({error: message => {throw Error(message);}}, {}, {sdk:chunk}), /refusing unsafe/);
});

test('Other application chunks are unchanged', () => {
  const chunk = {type:'chunk', modules:{'/app/api/chat/route.ts':{}}, code:'export default require_dist();'};
  appleLibraryWorker().generateBundle.call({}, {}, {other:chunk});
  assert.equal(chunk.code, 'export default require_dist();');
});

test('Only Apple SDK node-fetch is routed to Worker-native fetch', () => {
  const plugin = appleLibraryWorker();
  assert.match(plugin.resolveId('node-fetch', '/node_modules/@apple/app-store-server-library/dist/jws_verification.js'), /apple-worker-fetch.ts$/);
  assert.equal(plugin.resolveId('node-fetch', '/node_modules/other/index.js'), undefined);
});

test('OCSP request bytes, HTTP error and SDK buffer compatibility are preserved', async () => {
  const original = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, options) => {
    observed = {url, options};
    return new Response(new Uint8Array([1,2,3]), {status:503});
  };
  try {
    const body = Buffer.from([4,5,6]);
    const response = await appleWorkerFetch('http://ocsp.apple.com/example', {method:'POST',body,timeout:30000});
    assert.equal(observed.options.body, body);
    assert.equal(observed.options.method, 'POST');
    assert.ok(observed.options.signal instanceof AbortSignal);
    assert.equal(response.status, 503);
    assert.equal(response.ok, false);
    assert.deepEqual(await response.buffer(), Buffer.from([1,2,3]));
  } finally { globalThis.fetch = original; }
});

test('OCSP network errors propagate and cannot grant Premium', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {throw new Error('network unavailable');};
  try { await assert.rejects(appleWorkerFetch('http://ocsp.apple.com/example'), /network unavailable/); }
  finally {globalThis.fetch = original;}
});
