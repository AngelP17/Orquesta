/**
 * Orquesta Checkout Widget Types
 */

export type Currency = 'PAB' | 'USD';

export type PaymentStatus = 
  | 'requires_payment_method'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface CheckoutConfig {
  clientKey: string;
  amount: {
    cents: number;
    currency: Currency;
  };
  sellerId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntent {
  id: string;
  status: PaymentStatus;
  amount: {
    cents: number;
    currency: Currency;
  };
  sellerId: string;
  yappyQrUrl?: string;
  yappyDeepLink?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CheckoutCallbacks {
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}
