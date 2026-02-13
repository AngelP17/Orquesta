/**
 * Amount Display Component
 * 
 * Displays the payment amount in a prominent format.
 */

import React from 'react';
import { Currency } from '../types';

interface AmountDisplayProps {
  amount: string;
  currency: Currency;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({ amount, currency }) => {
  return (
    <div className="text-center mb-6">
      <p className="text-gray-500 text-sm uppercase tracking-wide">Amount to pay</p>
      <div className="mt-2 flex items-baseline justify-center gap-1">
        <span className="text-4xl font-bold text-gray-900">{amount}</span>
        <span className="text-lg text-gray-500">{currency}</span>
      </div>
      <p className="text-gray-400 text-xs mt-1">
        Includes ITBMS (7%)
      </p>
    </div>
  );
};
