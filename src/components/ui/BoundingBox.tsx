'use client';

import React from 'react';

interface BoundingBoxProps {
  x: number; // Percentage from left
  y: number; // Percentage from top
  width: number; // Percentage width
  height: number; // Percentage height
  pageHeight: number; // Actual page height in pixels (for scaling if needed, though percentages are preferred)
  pageWidth: number; // Actual page width in pixels
}

const BoundingBox: React.FC<BoundingBoxProps> = ({
  x,
  y,
  width,
  height,
  // pageHeight and pageWidth might be used for more complex scaling or validation in the future
}) => {
  // Ensure x, y, width, height are treated as percentages for positioning
  // The parent container of this BoundingBox should have `position: relative`
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    border: '2px solid red',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    boxSizing: 'border-box', // Ensures border doesn't add to the width/height
    pointerEvents: 'none', // Allows interaction with elements underneath if needed
  };

  return <div style={style} data-testid="bounding-box"></div>;
};

export default BoundingBox;
