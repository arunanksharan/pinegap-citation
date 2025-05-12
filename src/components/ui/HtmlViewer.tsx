'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from 'lodash'; 
import { useFileStore } from '@/store/useFileStore';
import BoundingBox from './BoundingBox';

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
  const scrollInitiatedByUserRef = useRef(false); 

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

    // Only scroll if not user-initiated and position needs changing
    if (!scrollInitiatedByUserRef.current) {
        if (Math.abs(iframeRef.current.contentWindow.scrollY - scrollTop) > SCROLL_TOLERANCE) {
            console.log(`Programmatic scroll to page ${pageNumber}, pos: ${scrollTop}`);
            iframeRef.current.contentWindow.scrollTo(0, scrollTop);
        }
    }
    // Always reset the flag after checking
    scrollInitiatedByUserRef.current = false;

  }, []); // No dependencies needed here as it reads fresh state


  // Effect to handle iframe loading
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      setIframeLoaded(true);
      // calculateDimensionsAndApplyScale(); // Called by the iframeLoaded effect below
    };
    iframe.addEventListener('load', handleLoad);
    if (htmlContent) {
      iframe.srcdoc = htmlContent;
    }
    return () => {
      iframe.removeEventListener('load', handleLoad);
      setIframeLoaded(false);
    };
  }, [htmlContent]); // Only depends on content

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
      const currentScrollY = iframeWindow.scrollY;
      const { pageHeight, pageNumber: currentPageNumber } = useFileStore.getState().htmlParameters;
      const totalPages = useFileStore.getState().htmlInstance.numPages ?? 1;
      if (pageHeight <= 0) return; 

      // Avoid updates if scroll likely programmatic
      const expectedScrollY = (currentPageNumber - 1) * pageHeight;
      if (Math.abs(currentScrollY - expectedScrollY) < SCROLL_TOLERANCE) {
        return; 
      }

      let newPageNumber = Math.floor(currentScrollY / pageHeight) + 1;
      newPageNumber = Math.max(1, Math.min(newPageNumber, totalPages)); 
      
      if (newPageNumber !== currentPageNumber) {
        console.log(`Scroll detected page change: ${currentPageNumber} -> ${newPageNumber}`);
        scrollInitiatedByUserRef.current = true; 
        updateHtmlParameter('pageNumber', newPageNumber);
      }
    };

    const debouncedHandler = debounce(handleScroll, SCROLL_DEBOUNCE_WAIT);
    iframeWindow.addEventListener('scroll', debouncedHandler);
    console.log('Scroll listener attached');

    return () => {
      debouncedHandler.cancel(); 
      iframeWindow.removeEventListener('scroll', debouncedHandler);
      console.log('Scroll listener removed');
    };
  }, [iframeLoaded, updateHtmlParameter]); 

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
      {iframeLoaded && htmlParameters.pageWidth > 0 && htmlParameters.pageHeight > 0 && (
        <BoundingBox
            x={htmlParameters.x}
            y={htmlParameters.y}
            width={htmlParameters.boxWidth}
            height={htmlParameters.boxHeight}
            color={highlightColor} 
            pageWidth={htmlParameters.pageWidth * htmlParameters.scale} 
            pageHeight={htmlParameters.pageHeight * htmlParameters.scale} 
        />
      )}
    </div>
  );
};

export default HtmlViewer;
