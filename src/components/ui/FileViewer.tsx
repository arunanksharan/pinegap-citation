'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useFileStore } from '@/store/useFileStore';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import BoundingBox from './BoundingBox';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Levenshtein from 'fast-levenshtein';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const FileViewer: React.FC = () => {
  const {
    fileType,
    activeFile, // Use activeFile for PDF object
    activeFileContent, // Use activeFileContent for text
    activeNumPages, // Use activeNumPages for PDF pages
    pdfParameters,
    updatePdfParameter,
    setPdfNumPagesForInstance, // New action to set numPages for the PDF instance
    searchText,
    levenshteinThreshold,
    highlightColor,
    isCaseSensitive,
  } = useFileStore();

  const [pageRenderWidth, setPageRenderWidth] = useState<number | null>(null);
  const [pageRenderHeight, setPageRenderHeight] = useState<number | null>(null);

  // Effect to reset render dimensions when the active PDF file changes
  useEffect(() => {
    if (fileType === 'pdf') {
        setPageRenderWidth(null);
        setPageRenderHeight(null);
    } // For text/html, these are not used currently
  }, [activeFile, fileType]);


  const onDocumentLoadSuccess = useCallback(({ numPages: loadedNumPages }: { numPages: number }) => {
    setPdfNumPagesForInstance(loadedNumPages); // Update the specific PDF instance's page count
    // Automatically set page number to 1 if it's out of bounds or initial load for this PDF
    if (pdfParameters.pageNumber > loadedNumPages || pdfParameters.pageNumber < 1 || activeNumPages === null) {
      updatePdfParameter('pageNumber', 1);
    }
  }, [setPdfNumPagesForInstance, updatePdfParameter, pdfParameters.pageNumber, activeNumPages]);

  const onPageLoadSuccess = (page: PDFPageProxy) => { // Typed page parameter
    // Store the natural dimensions of the PDF page, scaled by the current scale factor
    const viewport = page.getViewport({ scale: 1 });
    updatePdfParameter('pageWidth', viewport.width);
    updatePdfParameter('pageHeight', viewport.height);
    // The rendered size will depend on the container and the `width` prop of <Page>
  };

  const onPageRenderSuccess = () => {
    const canvasElement = document.querySelector('.react-pdf__Page__canvas');
    if (canvasElement) {
      setPageRenderWidth(canvasElement.clientWidth);
      setPageRenderHeight(canvasElement.clientHeight);
    }
  };

  const boxXPercent = pageRenderWidth && pdfParameters.pageWidth ? (pdfParameters.boxX / pdfParameters.pageWidth) * 100 : 0;
  const boxYPercent = pageRenderHeight && pdfParameters.pageHeight ? (pdfParameters.boxY / pdfParameters.pageHeight) * 100 : 0;
  const boxWidthPercent = pageRenderWidth && pdfParameters.pageWidth ? (pdfParameters.boxWidth / pdfParameters.pageWidth) * 100 : 0;
  const boxHeightPercent = pageRenderHeight && pdfParameters.pageHeight ? (pdfParameters.boxHeight / pdfParameters.pageHeight) * 100 : 0;

  if (!fileType) {
    return <div className="w-full p-4 flex-grow h-full flex items-center justify-center bg-gray-200 border-l border-gray-300 text-gray-500">Select a file type to begin.</div>;
  }

  return (
    <div className="w-full p-0 relative flex-grow h-full overflow-auto bg-gray-200 border-l border-gray-300">
      {fileType === 'pdf' && (
        activeFile && activeFile.type === 'application/pdf' ? (
          <div
            className="w-full h-full overflow-y-scroll relative"
            id="pdf-viewer-container"
          >
            <Document
              file={activeFile} // Use activeFile
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => console.error('Error loading PDF:', error)}
              options={{ CMapReaderFactory: null }} // Example option, adjust as needed
            >
              <Page
                pageNumber={pdfParameters.pageNumber}
                scale={pdfParameters.scale} // Use scale from store
                onLoadSuccess={onPageLoadSuccess}
                onRenderSuccess={onPageRenderSuccess}
              />
            </Document>
            {activeNumPages !== null && pageRenderWidth && pageRenderHeight && (
              <BoundingBox
                x={boxXPercent}
                y={boxYPercent}
                width={boxWidthPercent}
                height={boxHeightPercent}
                color="rgba(255, 0, 0, 0.3)" // Reverted to original example color, actual fix depends on BoundingBox.tsx
                pageWidth={pdfParameters.pageWidth} // Pass actual page width
                pageHeight={pdfParameters.pageHeight} // Pass actual page height
              />
            )}
            {activeNumPages !== null && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Page {pdfParameters.pageNumber} of {activeNumPages}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            {activeFile ? "Waiting for a valid PDF file..." : "Upload a PDF file to view it here."}
          </div>
        )
      )}

      {(fileType === 'text' || fileType === 'html') && (
        activeFileContent ? (
          <div className="w-full h-full p-4 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
            {searchText && searchText.trim() !== ''
              ? (() => {
                  const segments = [];
                  let lastIndex = 0;
                  const searchTarget = isCaseSensitive ? searchText : searchText.toLowerCase();
                  const contentToSearch = isCaseSensitive ? activeFileContent : activeFileContent.toLowerCase();
                  const searchLength = searchTarget.length;

                  console.log('[Highlight Debug] Search Initiated');
                  console.log('[Highlight Debug] searchText (original):', searchText);
                  console.log('[Highlight Debug] isCaseSensitive:', isCaseSensitive);
                  console.log('[Highlight Debug] levenshteinThreshold:', levenshteinThreshold);
                  console.log('[Highlight Debug] searchTarget (processed):', searchTarget);
                  console.log('[Highlight Debug] contentToSearch (processed snippet):', contentToSearch.substring(0, 200)); // Log first 200 chars
                  console.log('[Highlight Debug] searchLength:', searchLength);

                  if (searchLength === 0) return <>{activeFileContent}</>;

                  for (let i = 0; i <= contentToSearch.length - searchLength; ) {
                    const window = contentToSearch.substring(i, i + searchLength);
                    const distance = Levenshtein.get(window, searchTarget);

                    if (window.toLowerCase().includes('karrinyup') || searchTarget.toLowerCase().includes(window.toLowerCase())) {
                      console.log(`[Highlight Debug] Iteration i=${i}:`);
                      console.log(`[Highlight Debug]   Window: '${window}' (length: ${window.length})`);
                      console.log(`[Highlight Debug]   SearchTarget: '${searchTarget}' (length: ${searchTarget.length})`);
                      console.log(`[Highlight Debug]   Distance: ${distance}`);
                    }

                    if (distance <= levenshteinThreshold) {
                      console.log(`[Highlight Debug] Match found at index ${i}! Window: '${window}'`); // Log match
                      if (i > lastIndex) {
                        segments.push(
                          <React.Fragment key={`pre-${lastIndex}`}>
                            {activeFileContent.substring(lastIndex, i)}
                          </React.Fragment>
                        );
                      }
                      segments.push(
                        <mark
                          key={`match-${i}`}
                          style={{
                            backgroundColor: highlightColor,
                            color: 'black', // Ensure text is visible on highlight
                          }}
                        >
                          {activeFileContent.substring(i, i + searchLength)}
                        </mark>
                      );
                      lastIndex = i + searchLength;
                      i += searchLength;
                    } else {
                      i++;
                    }
                  }

                  if (lastIndex < activeFileContent.length) {
                    segments.push(
                      <React.Fragment key={`post-${lastIndex}`}>
                        {activeFileContent.substring(lastIndex)}
                      </React.Fragment>
                    );
                  }
                  return segments;
                })()
              : activeFileContent}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Upload a {fileType === 'text' ? '.txt' : '.html'} file to view its content.
          </div>
        )
      )}
    </div>
  );
};

export default FileViewer;
