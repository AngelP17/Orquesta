/**
 * Orquesta Checkout Widget Component
 * 
 * Embeddable checkout widget for Yappy payments.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Currency, PaymentStatus, PaymentIntent, CheckoutCallbacks } from './types';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { PaymentStatus as StatusDisplay } from './components/PaymentStatus';
import { AmountDisplay } from './components/AmountDisplay';
import { YappyButton } from './components/YappyButton';

interface OrquestaCheckoutWidgetProps extends CheckoutCallbacks {
  clientKey: string;
  amount: { cents: number; currency: Currency };
  sellerId: string;
  description?: string;
}

// API base URL (configurable via env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const OrquestaCheckoutWidget: React.FC<OrquestaCheckoutWidgetProps> = ({
  clientKey,
  amount,
  sellerId,
  description,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('requires_payment_method');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Format amount for display
  const formatAmount = useCallback((cents: number, currency: Currency): string => {
    const amount = cents / 100;
    if (currency === 'PAB') {
      return `B/. ${amount.toFixed(2)}`;
    }
    return `US$ ${amount.toFixed(2)}`;
  }, []);

  // Create payment intent
  const createPaymentIntent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientKey}`,
          'Idempotency-Key': `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
        body: JSON.stringify({
          amount_cents: amount.cents,
          currency: amount.currency,
          seller_id: sellerId,
          description,
          metadata: {
            source: 'checkout_widget',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to create payment');
      }

      const data = await response.json();
      setPaymentIntent(data);
      setStatus(data.status);
      setCountdown(300); // Reset countdown
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, [clientKey, amount, sellerId, description, onError]);

  // Poll for payment status
  const pollStatus = useCallback(async () => {
    if (!paymentIntent) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/payment-intents/${paymentIntent.id}`,
        {
          headers: {
            'Authorization': `Bearer ${clientKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch payment status');
        return;
      }

      const data = await response.json();
      setStatus(data.status);

      if (data.status === 'succeeded') {
        onSuccess?.(data);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      } else if (data.status === 'failed' || data.status === 'canceled') {
        onError?.(new Error(`Payment ${data.status}`));
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  }, [paymentIntent, clientKey, onSuccess, onError]);

  // Start polling when payment intent is created
  useEffect(() => {
    if (paymentIntent && status === 'processing') {
      pollingRef.current = setInterval(pollStatus, 3000); // Poll every 3 seconds
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [paymentIntent, status, pollStatus]);

  // Countdown timer
  useEffect(() => {
    if (status === 'processing' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, countdown]);

  // Handle Yappy deep link
  const handleYappyClick = useCallback(() => {
    if (paymentIntent?.yappyDeepLink) {
      window.location.href = paymentIntent.yappyDeepLink;
    }
  }, [paymentIntent]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    onCancel?.();
  }, [onCancel]);

  // Format countdown
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4">
        <h2 className="text-white text-lg font-semibold">
          {description || 'Complete your payment'}
        </h2>
        <p className="text-cyan-50 text-sm mt-1">
          Secure payment via Yappy
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Amount Display */}
        <AmountDisplay 
          amount={formatAmount(amount.cents, amount.currency)}
          currency={amount.currency}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Initial State */}
        {!paymentIntent && (
          <div className="text-center">
            <button
              onClick={createPaymentIntent}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-700 disabled:bg-slate-300"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Processing...
                </>
              ) : (
                'Pay with Yappy'
              )}
            </button>
            <p className="text-gray-500 text-xs mt-3">
              You will be redirected to complete payment
            </p>
          </div>
        )}

        {/* QR Code Display */}
        {paymentIntent && status === 'processing' && (
          <div className="text-center">
            <QRCodeDisplay 
              value={paymentIntent.yappyQrUrl || `yappy://pay/${paymentIntent.id}`}
              size={200}
            />
            
            <p className="text-gray-600 text-sm mt-4">
              Scan with your Yappy app
            </p>

            <YappyButton onClick={handleYappyClick} />

            {/* Countdown */}
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Expires in: <span className="font-mono font-semibold text-sky-600">{formatCountdown(countdown)}</span>
              </p>
              {countdown === 0 && (
                <p className="text-red-600 text-sm mt-1">
                  Payment expired. Please try again.
                </p>
              )}
            </div>

            <button
              onClick={handleCancel}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Cancel payment
            </button>
          </div>
        )}

        {/* Status Display */}
        {paymentIntent && status !== 'processing' && (
          <StatusDisplay 
            status={status}
            onRetry={createPaymentIntent}
            onDone={() => {
              if (status === 'succeeded') {
                // Post message for parent window (iframe usage)
                if (window.parent !== window) {
                  window.parent.postMessage(
                    { type: 'ORQUESTA_PAYMENT_SUCCESS', paymentIntent },
                    '*'
                  );
                }
              }
            }}
          />
        )}

        {/* Security Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Secure payment processed by Orquesta</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
