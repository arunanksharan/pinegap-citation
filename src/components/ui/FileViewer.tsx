'use client';

import React, { useState, useEffect } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import BoundingBox from './BoundingBox';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Levenshtein from 'fast-levenshtein';

// Setup pdfjs worker
// Point to the worker file that will be copied to the public directory.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

const FileViewer: React.FC = () => {
  const {
    uploadedFile,
    fileType,
    pdfParameters,
    updatePdfParameter,
    numPages,
    setNumPages,
    uploadedFileContent,
    searchText,
    highlightColor,
    levenshteinThreshold,
    isCaseSensitive, // Get case sensitivity flag
  } = useFileStore();

  const [pageRenderWidth, setPageRenderWidth] = useState<number | null>(null);
  const [pageRenderHeight, setPageRenderHeight] = useState<number | null>(null);

  const onDocumentLoadSuccess = ({
    numPages: loadedNumPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(loadedNumPages);
    // Automatically set page number to 1 if it's out of bounds
    if (
      pdfParameters.pageNumber > loadedNumPages ||
      pdfParameters.pageNumber < 1
    ) {
      updatePdfParameter('pageNumber', 1);
    }
  };

  const onPageLoadSuccess = (page: PDFPageProxy) => {
    // The 'page' object from react-pdf contains originalWidth and originalHeight
    // We can use these to update our store if we want to use actual PDF dimensions
    // For now, we are relying on user input for Page Width/Height for calculations
    // but we can use these to inform the user or for display scaling.
    const viewport = page.getViewport({ scale: 1 });
    console.log('Page loaded:', viewport.width, viewport.height);
    // Example: If user hasn't set page dimensions, use the actual ones from the first loaded page.
    // This might be useful for initial setup.
    // if (pdfParameters.pageWidth === initialPdfParameters.pageWidth && pdfParameters.pageHeight === initialPdfParameters.pageHeight) {
    //   updatePdfParameter('pageWidth', viewport.width);
    //   updatePdfParameter('pageHeight', viewport.height);
    // }
  };

  const onPageRenderSuccess = () => {
    // Get the rendered page dimensions to help with scaling if needed.
    // This is the size of the canvas element.
    const canvasElement = document.querySelector('.react-pdf__Page__canvas');
    if (canvasElement) {
      setPageRenderWidth(canvasElement.clientWidth);
      setPageRenderHeight(canvasElement.clientHeight);
    }
  };

  useEffect(() => {
    // Reset numPages when file changes - this is handled by the store's setUploadedFile now
    setPageRenderWidth(null);
    setPageRenderHeight(null);
  }, [uploadedFile]);

  if (!uploadedFile) {
    return (
      <div className="w-1/2 p-4 flex justify-center items-center bg-gray-100 h-full">
        <p className="text-gray-500">Upload a file to view it here.</p>
      </div>
    );
  }

  // Calculate Bounding Box percentages
  // These are calculated based on the natural dimensions of the PDF page, then applied to the rendered size.
  const boxXPercent = (pdfParameters.boxX / pdfParameters.pageWidth) * 100;
  const boxYPercent = (pdfParameters.boxY / pdfParameters.pageHeight) * 100;
  const boxWidthPercent =
    (pdfParameters.boxWidth / pdfParameters.pageWidth) * 100;
  const boxHeightPercent =
    (pdfParameters.boxHeight / pdfParameters.pageHeight) * 100;

  return (
    <div className="w-1/2 p-0 relative flex-grow h-full overflow-auto bg-gray-200 border-l border-gray-300">
      {fileType === 'pdf' && uploadedFile && (
        <div
          className="w-full h-full overflow-y-scroll relative"
          id="pdf-viewer-container"
        >
          <Document
            file={uploadedFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error('Error loading PDF:', error)}
          >
            <Page
              pageNumber={pdfParameters.pageNumber}
              onLoadSuccess={onPageLoadSuccess}
              onRenderSuccess={onPageRenderSuccess}
              // width={600} // You can set a fixed width for the PDF page render if needed
            />
          </Document>
          {pageRenderWidth && pageRenderHeight && (
            <BoundingBox
              x={boxXPercent}
              y={boxYPercent}
              width={boxWidthPercent}
              height={boxHeightPercent}
              pageWidth={pageRenderWidth} // Pass rendered dimensions
              pageHeight={pageRenderHeight}
            />
          )}
          {numPages !== null && ( // Re-add page count for PDF
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              Page {pdfParameters.pageNumber} of {numPages}
            </div>
          )}
        </div>
      )}

      {fileType === 'text' && uploadedFileContent && (
        <div className="w-full h-full p-4 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
          {searchText && searchText.trim() !== ''
            ? (() => {
                const segments = [];
                let lastIndex = 0;
                const searchTarget = isCaseSensitive
                  ? searchText
                  : searchText.toLowerCase();
                const contentToSearch = isCaseSensitive
                  ? uploadedFileContent
                  : uploadedFileContent.toLowerCase();
                const searchLength = searchTarget.length;

                if (searchLength === 0) return <>{uploadedFileContent}</>; // No search text

                for (let i = 0; i <= contentToSearch.length - searchLength; ) {
                  const window = contentToSearch.substring(i, i + searchLength);
                  const distance = Levenshtein.get(window, searchTarget);

                  if (distance <= levenshteinThreshold) {
                    // Add preceding non-matching segment
                    if (i > lastIndex) {
                      segments.push(
                        <React.Fragment key={`pre-${lastIndex}`}>
                          {uploadedFileContent.substring(lastIndex, i)}
                        </React.Fragment>
                      );
                    }
                    // Add highlighted segment
                    segments.push(
                      <mark
                        key={`match-${i}`}
                        style={{
                          backgroundColor: highlightColor,
                          color: 'black',
                        }}
                      >
                        {uploadedFileContent.substring(i, i + searchLength)}
                      </mark>
                    );
                    lastIndex = i + searchLength;
                    i += searchLength; // Move past this match
                  } else {
                    i++; // Slide window by one character
                  }
                }

                // Add any remaining non-matching segment at the end
                if (lastIndex < uploadedFileContent.length) {
                  segments.push(
                    <React.Fragment key={`post-${lastIndex}`}>
                      {uploadedFileContent.substring(lastIndex)}
                    </React.Fragment>
                  );
                }
                return segments;
              })()
            : uploadedFileContent}
        </div>
      )}

      {/* Add similar block for HTML if needed, potentially using an iframe or dangerouslySetInnerHTML after sanitization */}
    </div>
  );
};

export default FileViewer;
