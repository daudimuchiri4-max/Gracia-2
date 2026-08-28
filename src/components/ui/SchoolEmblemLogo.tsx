import React from 'react';

interface SchoolEmblemLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

export const SchoolEmblemLogo: React.FC<SchoolEmblemLogoProps> = ({
  className = 'w-16 h-16',
  alt = 'Gracia Learning Centre Official Crest',
}) => {
  return (
    <img
      src="/gracia_logo.svg"
      alt={alt}
      className={`object-contain drop-shadow-xs ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
