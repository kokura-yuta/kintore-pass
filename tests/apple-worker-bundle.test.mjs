import assert from 'node:assert/strict';
import test from 'node:test';
import { appleLibraryWorker } from '../build/apple-library-worker-plugin.ts';

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

