import assert from "node:assert/strict";
import test from "node:test";
import { isOwnerAccount } from "../app/lib/admin/ownerPolicy.ts";

const account = (emailAddress, status = "verified", primary = "email_1") => ({
  primaryEmailAddressId: primary,
  emailAddresses: [{ id: "email_1", emailAddress, verification: { status } }],
});

test("確認済みの運営主メールだけに権限を付与する", () => {
  assert.equal(isOwnerAccount(account("kintore505@gmail.com")), true);
  assert.equal(isOwnerAccount(account("KINTORE505@gmail.com")), true);
  assert.equal(isOwnerAccount(account("other@gmail.com")), false);
  assert.equal(isOwnerAccount(account("kintore505+other@gmail.com")), false);
  assert.equal(isOwnerAccount(account("kintore505@gmail.com", "unverified")), false);
  assert.equal(isOwnerAccount(account("kintore505@gmail.com", "verified", "email_2")), false);
  assert.equal(isOwnerAccount({ primaryEmailAddressId: null, emailAddresses: [] }), false);
  const user = account("kintore505@gmail.com");
  user.emailAddresses[0].verification = null;
  assert.equal(isOwnerAccount(user), false);
});
