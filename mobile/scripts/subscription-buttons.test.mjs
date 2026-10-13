import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('../src/app/subscription.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/SubscriptionPurchasePanel.native.tsx', import.meta.url), 'utf8');

test('purchase panel is independent of trial eligibility and active-plan card', () => {
  const purchaseSection = screen.slice(screen.indexOf('{error ? ('), screen.indexOf('<View style={styles.legalRow}>'));
  assert.match(purchaseSection, /<SubscriptionPurchasePanel/);
  assert.doesNotMatch(purchaseSection, /eligibleToStart|accessLevel === 'trial'/);
  assert.match(purchaseSection, /allowPurchase=\{subscription.plan !== 'premium'\}/);
  assert.match(purchaseSection, /subscription\?\.status === 'operator' \? null/);
});

test('restore stays outside purchase-only section and retains Apple verification', () => {
  assert.match(panel, /<\/Pressable> : null\}\s*<Pressable[^]*?購入を復元する/);
  assert.match(panel, /verifyAppleSubscription\(token, purchase.purchaseToken\)/);
  assert.match(panel, /getAvailablePurchases\(\{ onlyIncludeActiveItemsIOS: true \}\)/);
  assert.match(panel, /無料体験とは別の月額契約/);
});
