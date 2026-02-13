/**
 * QR Code Display Component
 * 
 * Displays a QR code for Yappy payment scanning.
 * Falls back to a placeholder if QR generation fails.
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  value, 
  size = 200 
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setQrDataUrl(dataUrl);
        setError(false);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError(true);
      }
    };

    generateQR();
  }, [value, size]);

  if (error) {
    return (
      <div 
        className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p className="text-gray-500 text-sm">QR Code unavailable</p>
          <p className="text-gray-400 text-xs mt-1">Use button below instead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-block p-4 bg-white border-2 border-primary-100 rounded-lg">
      {qrDataUrl ? (
        <img 
          src={qrDataUrl} 
          alt="Scan to pay with Yappy"
          width={size}
          height={size}
          className="block"
        />
      ) : (
        <div 
          className="bg-gray-200 animate-pulse rounded"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
};
