export async function restoreVerifiedPurchases<T extends { productId: string; purchaseToken?: string | null }>(
  purchases: T[], productId: string,
  verify: (purchase: T) => Promise<{ plan: string }>,
  finish: (purchase: T) => Promise<unknown>,
  refresh: () => Promise<void> | void,
): Promise<'empty' | 'restored'> {
  const matching = purchases.filter(p => p.productId === productId && p.purchaseToken);
  if (!matching.length) return 'empty';
  let restored = false;
  for (const purchase of matching) {
    const result = await verify(purchase);
    if (result.plan === 'premium') {
      await finish(purchase);
      restored = true;
    }
  }
  if (!restored) throw new Error('購入情報は見つかりましたが、有効なPremiumを確認できませんでした。');
  await refresh();
  return 'restored';
}
