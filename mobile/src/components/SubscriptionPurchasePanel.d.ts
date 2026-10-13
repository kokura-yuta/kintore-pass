export type SubscriptionPurchasePanelProps = {
  allowPurchase?: boolean;
  appAccountToken: string;
  productId: string;
  token: string;
  onVerified: () => Promise<void> | void;
};

export declare function SubscriptionPurchasePanel(
  props: SubscriptionPurchasePanelProps,
): import('react').ReactElement;
