'use client';

import React, { useState, useEffect } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { Document, Page, pdfjs } from 'react-pdf';
import BoundingBox from './BoundingBox';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Setup pdfjs worker
// Try to use the version from the react-pdf package itself if available
let pdfjsWorkerSrc;
try {
  pdfjsWorkerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
} catch (e) {
  // Fallback if import.meta.url is not supported or file not found (e.g. older Next.js versions or specific bundlers)
  pdfjsWorkerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  console.warn('Falling back to unpkg for pdf.js worker. For optimal performance, ensure pdf.worker.min.js is served locally.');
}
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

const FileViewer: React.FC = () => {
  const {
    uploadedFile,
    fileType,
    pdfParameters,
    updatePdfParameter
  } = useFileStore();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageRenderWidth, setPageRenderWidth] = useState<number | null>(null);
  const [pageRenderHeight, setPageRenderHeight] = useState<number | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Automatically set page number to 1 if it's out of bounds
    if (pdfParameters.pageNumber > numPages || pdfParameters.pageNumber < 1) {
      updatePdfParameter('pageNumber', 1);
    }
  };

  const onPageLoadSuccess = (page: any) => {
    // The 'page' object from react-pdf contains originalWidth and originalHeight
    // We can use these to update our store if we want to use actual PDF dimensions
    // For now, we are relying on user input for Page Width/Height for calculations
    // but we can use these to inform the user or for display scaling.
    console.log('Page loaded:', page.originalWidth, page.originalHeight);
    // Example: If user hasn't set page dimensions, use the actual ones from the first loaded page.
    // This might be useful for initial setup.
    // if (pdfParameters.pageWidth === initialPdfParameters.pageWidth && pdfParameters.pageHeight === initialPdfParameters.pageHeight) {
    //   updatePdfParameter('pageWidth', page.originalWidth);
    //   updatePdfParameter('pageHeight', page.originalHeight);
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
    // Reset numPages when file changes
    setNumPages(null);
    setPageRenderWidth(null);
    setPageRenderHeight(null);
  }, [uploadedFile]);

  if (!uploadedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
        <p>Upload a file to view it here.</p>
      </div>
    );
  }

  // Calculate bounding box percentages
  const boxXPercent = (pdfParameters.x / pdfParameters.pageWidth) * 100;
  const boxYPercent = (pdfParameters.y / pdfParameters.pageHeight) * 100;
  const boxWidthPercent = (pdfParameters.boxWidth / pdfParameters.pageWidth) * 100;
  const boxHeightPercent = (pdfParameters.boxHeight / pdfParameters.pageHeight) * 100;

  const renderContent = () => {
    switch (fileType) {
      case 'pdf':
        return (
          <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
            <div style={{ width: 'max-content', height: 'max-content', position: 'relative' }} className="shadow-lg">
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
            </div>
             {numPages && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    Page {pdfParameters.pageNumber} of {numPages}
                </div>
            )}
          </div>
        );
      case 'html':
        return <div className="p-4">HTML rendering not yet implemented.</div>;
      case 'text':
        return <div className="p-4">Text rendering not yet implemented.</div>;
      default:
        return <div className="p-4">Select a file type to view.</div>;
    }
  };

  return <div className="flex-1 bg-gray-200 h-full">{renderContent()}</div>;
};

export default FileViewer;
