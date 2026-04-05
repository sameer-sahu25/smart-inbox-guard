import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", size = 48 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brain Structure (Emerald/Green Gradient) */}
      <path 
        d="M50 15C35 15 25 25 25 40C25 55 35 65 50 65C65 65 75 55 75 40C75 25 65 15 50 15Z" 
        fill="#10b981" 
        fillOpacity="0.2"
        stroke="#10b981"
        strokeWidth="2.5"
      />
      
      {/* Neural Nodes (Emerald/Green) */}
      <circle cx="42" cy="30" r="3" fill="#10b981" />
      <circle cx="58" cy="35" r="3" fill="#10b981" />
      <circle cx="48" cy="48" r="3" fill="#10b981" />
      <circle cx="65" cy="45" r="3" fill="#10b981" />
      
      {/* Neural Pathways (Emerald/Green) */}
      <path d="M42 30L48 48L65 45" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M58 35L48 48" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Envelope (Vibrant Magenta) */}
      <rect x="28" y="45" width="44" height="28" rx="3" fill="#ec4899" />
      <path d="M28 45L50 60L72 45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Shield Overlay (Deep Magenta/Plum) */}
      <path 
        d="M50 62C50 62 68 68 68 80C68 92 50 98 50 98C50 98 32 92 32 80C32 68 50 62 50 62Z" 
        fill="#db2777" 
        stroke="white"
        strokeWidth="2"
      />
      <path 
        d="M45 80L50 85L55 80" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};
