'use client';

import React from 'react';

interface BoundingBoxProps {
  x: number; // Percentage from left
  y: number; // Percentage from top
  width: number; // Percentage width
  height: number; // Percentage height
  pageHeight: number; // Actual page height in pixels (for scaling if needed, though percentages are preferred)
  pageWidth: number; // Actual page width in pixels
  color?: string; // Optional color for the box
}

const BoundingBox: React.FC<BoundingBoxProps> = ({
  x,
  y,
  width,
  height,
  color = 'rgba(255, 0, 0, 0.3)', // Default color if not provided
  // pageHeight and pageWidth might be used for more complex scaling or validation in the future
}) => {
  // Ensure x, y, width, height are treated as percentages for positioning
  // The parent container of this BoundingBox should have `position: relative`

  // Function to derive a semi-transparent background from the main color
  const getBackgroundColor = (borderColor: string) => {
    if (borderColor.startsWith('rgba')) {
      // If it's already rgba, try to use it with modified alpha or a default
      return borderColor.replace(/,\s*[^,)]+\)$/, ', 0.1)');
    } else if (borderColor.startsWith('#') && borderColor.length === 7) {
      // Convert hex to rgba
      const r = parseInt(borderColor.slice(1, 3), 16);
      const g = parseInt(borderColor.slice(3, 5), 16);
      const b = parseInt(borderColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }
    return 'rgba(255, 0, 0, 0.1)'; // Default fallback for unknown formats
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    border: `2px solid ${color.split(',')[0] + (color.includes('rgba') ? ')' : '')}`, // Use main part of color for border
    backgroundColor: getBackgroundColor(color),
    boxSizing: 'border-box', // Ensures border doesn't add to the width/height
    pointerEvents: 'none', // Allows interaction with elements underneath if needed
  };

  return <div style={style} data-testid="bounding-box"></div>;
};

export default BoundingBox;
