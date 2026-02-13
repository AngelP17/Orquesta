/**
 * Yappy Button Component
 * 
 * Styled button for opening Yappy app.
 */

import React from 'react';

interface YappyButtonProps {
  onClick: () => void;
}

export const YappyButton: React.FC<YappyButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full bg-[#ffdd00] hover:bg-[#e6c700] text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      <YappyLogo />
      <span>Open Yappy App</span>
    </button>
  );
};

const YappyLogo: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#6B238E"/>
    <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
