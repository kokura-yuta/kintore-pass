import assert from 'node:assert/strict';
import test from 'node:test';
import { isConfiguredAdminClerkUserId as allowed } from '../app/lib/admin/ownerPolicy.ts';

test('登録したClerk IDだけ許可し、未設定・別ID・部分一致は拒否', () => {
  assert.equal(allowed('user_owner', 'user_owner'), true);
  assert.equal(allowed('user_owner', ' user_owner, user_second '), true);
  for (const id of [null, undefined, '', 'user_other', 'user_ow', 'USER_OWNER', 'kintore505@gmail.com']) {
    assert.equal(allowed(id, 'user_owner'), false);
  }
  assert.equal(allowed('user_owner', ''), false);
  assert.equal(allowed('user_owner', ' , '), false);
});
