'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from 'lodash'; 
import { useFileStore } from '@/store/useFileStore';

const SCROLL_DEBOUNCE_WAIT = 150; // Milliseconds to wait after scroll stops
const SCROLL_TOLERANCE = 5; // Pixels tolerance for detecting programmatic scroll

const HtmlViewer: React.FC = () => {
  const htmlContent = useFileStore((state) => state.htmlInstance.content);
  const htmlParameters = useFileStore((state) => state.htmlParameters);
  const setHtmlNumPagesForInstance = useFileStore((state) => state.setHtmlNumPagesForInstance);
  const updateHtmlParameter = useFileStore((state) => state.updateHtmlParameter);
  const highlightColor = useFileStore((state) => state.highlightColor);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const injectedBoxRef = useRef<HTMLDivElement | null>(null); // Ref for the injected bounding box

  // Helper to get background color (adapted from BoundingBox.tsx)
  const getDerivedBackgroundColor = useCallback((borderColor: string) => {
    if (!borderColor) return 'rgba(255, 0, 0, 0.1)'; // Default if color is undefined
    if (borderColor.startsWith('rgba')) {
      return borderColor.replace(/,\s*[^,)]+\)$/, ', 0.1)');
    }
    if (borderColor.startsWith('#')) {
      const r = parseInt(borderColor.slice(1, 3), 16);
      const g = parseInt(borderColor.slice(3, 5), 16);
      const b = parseInt(borderColor.slice(5, 7), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, 0.1)`;
      }
    }
    return 'rgba(255, 0, 0, 0.1)'; // Default fallback
  }, []); // No dependencies, so it's stable

  // Calculates dimensions, page count, and applies scale transform
  const calculateDimensionsAndApplyScale = useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow || !iframeRef.current.contentDocument || !containerRef.current) {
      return;
    }
    const iframeDoc = iframeRef.current.contentDocument;
    const iframeBody = iframeDoc.body;
    const container = containerRef.current;
    if (!iframeBody) return;

    // Reset potential previous styles affecting scrollHeight calculation
    iframeBody.style.transform = '';
    iframeBody.style.transformOrigin = '';
    iframeBody.style.margin = '0'; 
    iframeBody.style.padding = '1rem';
    iframeDoc.documentElement.style.margin = '0';

    const currentScale = htmlParameters.scale;
    const viewPortHeight = container.clientHeight; 
    const viewPortWidth = container.clientWidth;

    const totalScrollHeight = iframeBody.scrollHeight;
    const numPages = totalScrollHeight > 0 ? Math.ceil(totalScrollHeight / viewPortHeight) : 1;

    setHtmlNumPagesForInstance(numPages);
    updateHtmlParameter('pageWidth', viewPortWidth); 
    updateHtmlParameter('pageHeight', viewPortHeight);

    // Apply scaling only
    iframeBody.style.transform = `scale(${currentScale})`;
    iframeBody.style.transformOrigin = 'top left';

  }, [htmlParameters.scale, setHtmlNumPagesForInstance, updateHtmlParameter]);

  // Applies scroll based on page number - intended for programmatic changes
  const applyProgrammaticScroll = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    const { pageNumber, pageHeight } = useFileStore.getState().htmlParameters;
    if (pageHeight <= 0) return;

    const scrollTop = (pageNumber - 1) * pageHeight;

    // Always apply programmatic scroll if iframe is ready
    if (Math.abs(iframeRef.current.contentWindow.scrollY - scrollTop) > SCROLL_TOLERANCE) {
        console.log(`Programmatic scroll to page ${pageNumber}, pos: ${scrollTop}`);
        iframeRef.current.contentWindow.scrollTo(0, scrollTop);
    }
  }, []); 

  // Effect to handle iframe loading
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('iframe loaded event triggered');
      setIframeLoaded(true);
      // calculateDimensionsAndApplyScale(); will be called by iframeLoaded effect
    };

    iframe.addEventListener('load', handleLoad);

    if (htmlContent) {
      // When content changes, reset injected box and mark iframe as not loaded until 'load' event fires
      if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
        injectedBoxRef.current.remove();
      }
      injectedBoxRef.current = null;
      setIframeLoaded(false); 
      iframe.srcdoc = htmlContent;
    } else {
        // Clear srcdoc and reset flags if no content
        iframe.srcdoc = '';
        if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
            injectedBoxRef.current.remove();
        }
        injectedBoxRef.current = null;
        setIframeLoaded(false);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
      // Cleanup injected box on component unmount or if iframe is removed
      if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
        injectedBoxRef.current.remove();
      }
      injectedBoxRef.current = null;
      setIframeLoaded(false); // Reset load state on cleanup
    };
  }, [htmlContent]); 

  // Effect to create/update injected bounding box
  useEffect(() => {
    if (iframeLoaded && iframeRef.current?.contentWindow && iframeRef.current?.contentDocument) {
      const iframeDoc = iframeRef.current.contentDocument;
      const { x, y, boxWidth, boxHeight, pageNumber, pageHeight: effectivePageHeight } = htmlParameters;

      if (boxWidth <= 0 || boxHeight <= 0) {
        if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
          injectedBoxRef.current.remove();
          injectedBoxRef.current = null;
        }
        return; // No box to draw
      }

      if (!injectedBoxRef.current) {
        injectedBoxRef.current = iframeDoc.createElement('div');
        iframeDoc.body.appendChild(injectedBoxRef.current);
        // Initial mandatory styles
        injectedBoxRef.current.style.position = 'absolute';
        injectedBoxRef.current.style.boxSizing = 'border-box';
        injectedBoxRef.current.style.pointerEvents = 'none';
        injectedBoxRef.current.style.zIndex = '9999'; // Ensure visibility
      }

      // Update styles
      const boxElement = injectedBoxRef.current;
      boxElement.style.left = `${x}px`;
      // Calculate top position based on pageNumber, pageHeight, and y (offset within that page)
      const pageOffsetY = effectivePageHeight > 0 ? (pageNumber - 1) * effectivePageHeight : 0;
      boxElement.style.top = `${pageOffsetY + y}px`;
      boxElement.style.width = `${boxWidth}px`;
      boxElement.style.height = `${boxHeight}px`;
      
      const primaryColor = highlightColor || 'rgba(255,0,0,1)'; // Fallback border color
      boxElement.style.border = `2px solid ${primaryColor}`;
      boxElement.style.backgroundColor = getDerivedBackgroundColor(primaryColor);
      boxElement.style.display = 'block';

    } else {
      // If iframe not loaded or no valid document, ensure box is removed/hidden
      if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
        injectedBoxRef.current.remove();
        injectedBoxRef.current = null;
      }
    }
    // Cleanup for this effect: remove box if it exists
    return () => {
      if (injectedBoxRef.current && injectedBoxRef.current.parentElement) {
        // Check parentElement as iframeDoc might be gone during HMR or fast refresh
        try {
            injectedBoxRef.current.remove();
        } catch (e) {
            console.warn('Could not remove injectedBoxRef during cleanup:', e);
        }
      }
      injectedBoxRef.current = null;
    };
  }, [
    iframeLoaded,
    htmlParameters, // Add the whole object
    highlightColor,
    getDerivedBackgroundColor
  ]);

  // Effect to calculate dimensions/scale on load, scale change, or content change
  useEffect(() => {
    if (iframeLoaded) {
      console.log("Recalculating dimensions/scale due to load/scale/content change.");
      calculateDimensionsAndApplyScale();
    }
  }, [iframeLoaded, htmlParameters.scale, htmlContent, calculateDimensionsAndApplyScale]);

  // Effect for handling container resize
  useEffect(() => {
    if (!containerRef.current || !iframeLoaded) return; // Also check iframeLoaded
    const resizeObserver = new ResizeObserver(() => {
      console.log("Recalculating dimensions/scale due to resize.");
      calculateDimensionsAndApplyScale(); 
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [iframeLoaded, calculateDimensionsAndApplyScale]); // Depends on iframeLoaded now

  // Effect for adding scroll listener to iframe content
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current?.contentWindow) {
        return;
    }
    const iframeWindow = iframeRef.current.contentWindow;
    
    const handleScroll = () => {
      console.log('Iframe scrolled, current scrollY:', iframeWindow.scrollY); // Optional: for debugging scroll events
    };

    const debouncedHandler = debounce(handleScroll, SCROLL_DEBOUNCE_WAIT);
    iframeWindow.addEventListener('scroll', debouncedHandler);
    console.log('Scroll listener attached');

    return () => {
      debouncedHandler.cancel(); 
      iframeWindow.removeEventListener('scroll', debouncedHandler);
      console.log('Scroll listener removed');
    };
  }, [iframeLoaded]); 

  // Effect to apply programmatic scroll when page number changes (if needed)
  useEffect(() => {
    if (iframeLoaded) {
      applyProgrammaticScroll();
    }
  // Run when pageNumber or pageHeight changes, or iframe loads
  }, [iframeLoaded, htmlParameters.pageNumber, htmlParameters.pageHeight, applyProgrammaticScroll]); 

  // --- Rendering --- 
  if (!htmlContent) {
    return <div className="flex justify-center items-center h-full text-gray-500">Upload an HTML file to view it here.</div>;
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden border border-gray-300">
      <iframe
        ref={iframeRef}
        title="HTML Content Viewer"
        sandbox="allow-same-origin allow-scripts" 
        className="w-full h-full border-none"
        style={{
        }}
      ></iframe>
    </div>
  );
};

export default HtmlViewer;
