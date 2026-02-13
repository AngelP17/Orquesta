/**
 * Payment Status Component
 * 
 * Displays payment status with appropriate icon and message.
 */

import React from 'react';
import { PaymentStatus as Status } from '../types';

interface PaymentStatusProps {
  status: Status;
  onRetry?: () => void;
  onDone?: () => void;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  status,
  onRetry,
  onDone,
}) => {
  const config = getStatusConfig(status);

  return (
    <div className="text-center py-6">
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${config.bgColor}`}>
        {config.icon}
      </div>
      
      <h3 className={`mt-4 text-lg font-semibold ${config.textColor}`}>
        {config.title}
      </h3>
      
      <p className="mt-2 text-gray-600">
        {config.message}
      </p>

      {status === 'succeeded' && (
        <button
          onClick={onDone}
          className="mt-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Done
        </button>
      )}

      {status === 'failed' && (
        <button
          onClick={onRetry}
          className="mt-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}

      {status === 'canceled' && (
        <button
          onClick={onRetry}
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Start Over
        </button>
      )}
    </div>
  );
};

function getStatusConfig(status: Status) {
  switch (status) {
    case 'succeeded':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        icon: (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        title: 'Payment Successful!',
        message: 'Your payment has been processed successfully.',
      };
    
    case 'failed':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: (
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        title: 'Payment Failed',
        message: 'We couldn\'t process your payment. Please try again.',
      };
    
    case 'canceled':
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        icon: (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Payment Canceled',
        message: 'You canceled the payment. No charges were made.',
      };
    
    case 'requires_payment_method':
    default:
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: (
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
        title: 'Ready to Pay',
        message: 'Click the button below to proceed with payment.',
      };
  }
}
