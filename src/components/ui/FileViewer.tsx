import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useFileStore } from '../../store/useFileStore';
import Fuse from 'fuse.js';
// import BoundingBox from './BoundingBox'; // Not currently used in text/HTML view
import { ScrollArea } from "@/components/ui/scroll-area"

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`; // Changed to a known good version
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const FileViewer: React.FC = () => {
  const {
    activeFile,
    activeFileContent,
    fileType,
    pdfParameters,
    setPdfNumPagesForInstance,
    searchQueryForFuse, 
    thresholdForFuse,   
    highlightColor,
    isCaseSensitive,    
  } = useFileStore();

  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  // const [viewportWidth, setViewportWidth] = useState<number>(0); // Not currently used for BoundingBox scaling in text
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeFile && fileType === 'pdf') {
      const url = URL.createObjectURL(activeFile);
      setPdfFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfFileUrl(null);
    }
  }, [activeFile, fileType]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setPdfNumPagesForInstance(numPages); 
    if (pdfParameters.pageNumber > numPages) {
      useFileStore.getState().updatePdfParameter('pageNumber', Math.min(pdfParameters.pageNumber, numPages) || 1);
    }
  }

  function onPageLoadSuccess() { // Potentially useful for getting PDF page dimensions
    if (pdfWrapperRef.current) {
      // const newViewportWidth = pdfWrapperRef.current.offsetWidth;
      // setViewportWidth(newViewportWidth); 
      // Example: if (pdfWrapperRef.current?.firstChild instanceof HTMLElement) {
      // const pdfPageElement = pdfWrapperRef.current.firstChild as HTMLElement;
      // useFileStore.getState().updatePdfParameter('pageWidth', pdfPageElement.clientWidth);
      // useFileStore.getState().updatePdfParameter('pageHeight', pdfPageElement.clientHeight);
      // }
    }
  }

  const lines = useMemo(() => {
    if (!activeFileContent) return [];
    return activeFileContent.split('\n').map((text, index) => ({ text, lineNumber: index + 1 }));
  }, [activeFileContent]);

  const fuseInstance = useMemo(() => {
    if (!lines || lines.length === 0) return null; // Guard against empty lines array
    return new Fuse(lines, {
      includeScore: true,
      includeMatches: true,
      threshold: thresholdForFuse, // << CHANGED: Use thresholdForFuse from store
      minMatchCharLength: 1,
      findAllMatches: true,
      ignoreLocation: true, 
      keys: ['text'],
      isCaseSensitive: isCaseSensitive, // << CHANGED: Directly use isCaseSensitive from store
    });
  }, [lines, thresholdForFuse, isCaseSensitive]); // << CHANGED: Added thresholdForFuse and isCaseSensitive

  const searchResults = useMemo(() => {
    if (!searchQueryForFuse || !fuseInstance) return []; // Use searchQueryForFuse
    
    const queryToSearch = searchQueryForFuse;
    // Note: isMatchWholeWord is not directly used to modify `queryToSearch` here for Fuse.js
    // as `\b` might interfere with fuzzy matching. 
    // If strict whole word is needed with fuzzy search, results might need post-filtering.

    return fuseInstance.search(queryToSearch).flatMap(result => 
      (result.matches || []).map(match => ({
        lineNumber: result.item.lineNumber,
        indices: match.indices,
      }))
    );
  }, [searchQueryForFuse, fuseInstance]);

  const renderLineWithHighlights = (lineText: string, lineNumber: number) => {
    const matchesOnThisLine = searchResults.filter(match => match.lineNumber === lineNumber);
    if (!matchesOnThisLine.length || searchQueryForFuse.trim() === '') { // Also check if searchQueryForFuse is empty
      return <div key={lineNumber}>{lineText}</div>;
    }

    let lastIndex = 0;
    const parts = [];
    const allIndices = matchesOnThisLine
      .flatMap(match => match.indices)
      .sort((a, b) => a[0] - b[0]);

    const mergedIndices: Array<[number, number]> = [];
    if (allIndices.length > 0) {
      mergedIndices.push([...allIndices[0]] as [number, number]);
      for (let i = 1; i < allIndices.length; i++) {
        const current = allIndices[i];
        const lastMerged = mergedIndices[mergedIndices.length - 1];
        if (current[0] <= lastMerged[1] + 1) {
          lastMerged[1] = Math.max(lastMerged[1], current[1]);
        } else {
          mergedIndices.push([...current] as [number, number]);
        }
      }
    }

    mergedIndices.forEach(([start, end], i) => {
      if (start > lastIndex) {
        parts.push(lineText.substring(lastIndex, start));
      }
      parts.push(
        <mark key={`match-${lineNumber}-${i}`} style={{ backgroundColor: highlightColor, color: 'black' }}>
          {lineText.substring(start, end + 1)}
        </mark>
      );
      lastIndex = end + 1;
    });

    if (lastIndex < lineText.length) {
      parts.push(lineText.substring(lastIndex));
    }
    return <div key={lineNumber}>{parts.length > 0 ? parts : lineText}</div>;
  };
  
  if (fileType === 'pdf') {
    return (
      <div ref={pdfWrapperRef} className="w-full h-full overflow-auto border rounded-md shadow-inner bg-gray-100 flex justify-center items-start p-4">
        {pdfFileUrl && activeFile ? (
          <Document
            file={pdfFileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error('Error loading PDF:', error.message)}
            className="flex flex-col items-center"
          >
            <Page 
              pageNumber={pdfParameters.pageNumber}
              scale={pdfParameters.scale}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={true} 
              renderAnnotationLayer={true}
              customTextRenderer={({ str }) => { // Basic renderer, PDF search highlighting not via Fuse indices
                return str;
              }}
            />
          </Document>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">{activeFile ? "Loading PDF..." : "No PDF file loaded or selected."}</p>
          </div>
        )}
      </div>
    );
  }

  if ((fileType === 'text' || fileType === 'html') && activeFileContent) {
    return (
      <ScrollArea className="w-full h-[calc(100vh-200px)] p-1 border rounded-md shadow-inner bg-gray-50">
        <div className="whitespace-pre-wrap font-mono text-sm p-4">
          {lines.map(line => renderLineWithHighlights(line.text, line.lineNumber))}
        </div>
      </ScrollArea>
    );
  }
  
  return (
    <div className="flex justify-center items-center h-full border rounded-md shadow-inner bg-gray-100">
      <p className="text-gray-500">No file content to display. Please select a file type and upload a file.</p>
    </div>
  );
};

export default FileViewer;
