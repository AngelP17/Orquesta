/**
 * Orquesta Demo Checkout Widget
 * 
 * Lead: SMEE (Senior Mobile/Embedded Engineer)
 * Co-Authority: SFL (Senior Frontend Lead), PPSA (Principal Payment Systems Architect)
 * 
 * Embeddable checkout widget for Yappy payments.
 * Features:
 * - Yappy QR code generation
 * - Payment status polling
 * - postMessage API for iframe embedding
 * - < 200KB gzipped target
 * - Mobile-responsive design
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { OrquestaCheckoutWidget } from './OrquestaCheckoutWidget';
import './index.css';

// Export widget for programmatic usage
export { OrquestaCheckoutWidget } from './OrquestaCheckoutWidget';
export type { CheckoutConfig, PaymentStatus } from './types';

// Global initialization function for embeddable usage
declare global {
  interface Window {
    OrquestaCheckout: {
      init: (config: {
        clientKey: string;
        amount: { cents: number; currency: 'PAB' | 'USD' };
        sellerId: string;
        description?: string;
        onSuccess?: (paymentIntent: unknown) => void;
        onError?: (error: Error) => void;
        onCancel?: () => void;
      }) => void;
    };
  }
}

// Mount for standalone usage
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <OrquestaCheckoutWidget
          clientKey="pk_test_demo"
          amount={{ cents: 10000, currency: 'PAB' }}
          sellerId="demo-seller"
          description="Demo Purchase"
          onSuccess={(pi) => console.log('Payment succeeded:', pi)}
          onError={(err) => console.error('Payment failed:', err)}
          onCancel={() => console.log('Payment cancelled')}
        />
      </div>
    </React.StrictMode>
  );
}

// Global initialization for embeddable usage
window.OrquestaCheckout = {
  init: (config) => {
    const container = document.createElement('div');
    container.id = 'orquesta-checkout-container';
    document.body.appendChild(container);

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <OrquestaCheckoutWidget
          clientKey={config.clientKey}
          amount={config.amount}
          sellerId={config.sellerId}
          description={config.description}
          onSuccess={config.onSuccess}
          onError={config.onError}
          onCancel={config.onCancel}
        />
      </React.StrictMode>
    );
  },
};
