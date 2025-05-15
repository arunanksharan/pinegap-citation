import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs, PageProps } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useFileStore } from '../../store/useFileStore';
import BoundingBox from './BoundingBox';
import { ScrollArea } from '@/components/ui/scroll-area';
import HtmlViewer from './HtmlViewer';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const FileViewer: React.FC = () => {
  const {
    activeFile,
    activeFileContent,
    fileType,
    pdfParameters,
    setPdfNumPagesForInstance,
    searchQueryForFuse,
    highlightColor,
    isCaseSensitive,
    pdfNumPages,
  } = useFileStore();

  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (activeFileContent && fileType === 'text') {
      console.log('[FileViewer] Text content is available for exact search.');
    } else if (fileType === 'text'){
      console.log('[FileViewer] No active text content for exact search.');
    }
  }, [activeFileContent, fileType]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setPdfNumPagesForInstance(numPages);
    const currentPdfPageNumber =
      useFileStore.getState().pdfParameters.pageNumber;
    if (currentPdfPageNumber > numPages || currentPdfPageNumber === 0) {
      useFileStore
        .getState()
        .updatePdfParameter(
          'pageNumber',
          numPages > 0
            ? Math.min(
                currentPdfPageNumber > 0 ? currentPdfPageNumber : 1,
                numPages
              )
            : 1
        );
    }
  }

  const onPageLoadSuccess: PageProps['onLoadSuccess'] = (page) => {
    if (!page) return;

    const { updatePdfParameter, pdfParameters: currentPdfParams } =
      useFileStore.getState();
    const viewportWidth = page.width;
    const viewportHeight = page.height;

    if (viewportWidth !== currentPdfParams.pageWidth) {
      updatePdfParameter('pageWidth', viewportWidth);
    }
    if (viewportHeight !== currentPdfParams.pageHeight) {
      updatePdfParameter('pageHeight', viewportHeight);
    }
  };

  const renderFullTextWithExactHighlights = (
    fullText: string,
    searchTerm: string,
    caseSensitive: boolean,
    color: string
  ): React.ReactNode[] => {
    if (!searchTerm || searchTerm.trim() === '') {
      return [fullText]; 
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const textToSearch = caseSensitive ? fullText : fullText.toLowerCase();
    const termToSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const searchTermLength = searchTerm.length; 

    let currentIndex = textToSearch.indexOf(termToSearch, lastIndex);

    while (currentIndex !== -1) {
      if (currentIndex > lastIndex) {
        parts.push(fullText.substring(lastIndex, currentIndex));
      }
      parts.push(
        <mark
          key={`match-${currentIndex}`}
          style={{ backgroundColor: color, color: 'black' }} 
        >
          {fullText.substring(currentIndex, currentIndex + searchTermLength)}
        </mark>
      );
      lastIndex = currentIndex + searchTermLength;
      currentIndex = textToSearch.indexOf(termToSearch, lastIndex);
    }

    if (lastIndex < fullText.length) {
      parts.push(fullText.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [fullText];
  };

  if (fileType === 'pdf') {
    return (
      <div
        ref={pdfWrapperRef}
        className="w-full h-full overflow-auto border rounded-md shadow-inner bg-gray-100 flex justify-center items-start p-4"
      >
        {pdfFileUrl && activeFile ? (
          <Document
            file={pdfFileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) =>
              console.error('Error loading PDF:', error.message)
            }
            className="flex flex-col items-center"
          >
            {pdfNumPages &&
              pdfNumPages > 0 &&
              Array.from(new Array(pdfNumPages), (el, index) => {
                const currentPageNumber = index + 1;
                return (
                  <div
                    key={`page_wrapper_${currentPageNumber}`}
                    style={{ position: 'relative', marginBottom: '10px' }} 
                    className="pdf-page-wrapper"
                  >
                    <Page
                      key={`page_${currentPageNumber}`}
                      pageNumber={currentPageNumber}
                      scale={pdfParameters.scale}
                      onLoadSuccess={(pageProxy) => {
                        if (currentPageNumber === pdfParameters.pageNumber) {
                          onPageLoadSuccess(pageProxy);
                        }
                      }}
                      renderTextLayer={true} 
                      renderAnnotationLayer={true} 
                      // customTextRenderer removed to use default react-pdf text layer rendering
                    />
                    {currentPageNumber === pdfParameters.pageNumber &&
                      pdfParameters.pageWidth > 0 &&
                      pdfParameters.pageHeight > 0 &&
                      pdfParameters.boxWidth > 0 &&
                      pdfParameters.boxHeight > 0 && (
                        <BoundingBox
                          x={(pdfParameters.x / pdfParameters.pageWidth) * 100}
                          y={(pdfParameters.y / pdfParameters.pageHeight) * 100}
                          width={
                            (pdfParameters.boxWidth / pdfParameters.pageWidth) *
                            100
                          }
                          height={
                            (pdfParameters.boxHeight /
                              pdfParameters.pageHeight) *
                            100
                          }
                          pageWidth={pdfParameters.pageWidth} 
                          pageHeight={pdfParameters.pageHeight} 
                          color={highlightColor}
                        />
                      )}
                  </div>
                );
              })}
          </Document>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">
              {activeFile
                ? 'Loading PDF...'
                : 'No PDF file loaded or selected.'}
            </p>
          </div>
        )}
      </div>
    );
  } else if (fileType === 'html' && activeFileContent) {
    return <HtmlViewer />;
  } else if (fileType === 'text' && activeFileContent) {
    const highlightedContent = renderFullTextWithExactHighlights(
      activeFileContent,
      searchQueryForFuse, 
      isCaseSensitive,
      highlightColor
    );
    return (
      <ScrollArea className="w-full h-[calc(100vh-200px)] p-1 border rounded-md shadow-inner bg-gray-50">
        <div className="whitespace-pre-wrap font-mono text-sm p-4">
          {highlightedContent}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex justify-center items-center h-full border rounded-md shadow-inner bg-gray-100">
      <p className="text-gray-500">
        No file content to display. Please select a file type and upload a file.
      </p>
    </div>
  );
};

export default FileViewer;
