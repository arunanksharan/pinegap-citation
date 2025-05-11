import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs, PageProps } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useFileStore } from '../../store/useFileStore';
import Fuse from 'fuse.js';
import BoundingBox from './BoundingBox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Configure PDF.js worker to use the locally served file from the public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const FileViewer: React.FC = () => {
  const {
    activeFile,
    activeFileContent,
    fileType,
    pdfParameters,
    setPdfNumPagesForInstance,
    searchQueryForFuse,
    fuseScoreThreshold, // Use this directly for the threshold
    highlightColor,
    isCaseSensitive, // Re-add
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
    if (activeFileContent && (fileType === 'text' || fileType === 'html')) {
      const currentLines = activeFileContent.split('\n').map((line, index) => ({
        text: line,
        lineNumber: index + 1,
      }));
      console.log('[FileViewer] Lines for Fuse.js:', currentLines);
    } else {
      console.log('[FileViewer] No active text/html content for lines.');
    }
  }, [activeFileContent, fileType]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setPdfNumPagesForInstance(numPages);
    if (pdfParameters.pageNumber > numPages) {
      useFileStore
        .getState()
        .updatePdfParameter(
          'pageNumber',
          Math.min(pdfParameters.pageNumber, numPages) || 1
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

  const lines = useMemo(() => {
    if (activeFileContent && (fileType === 'text' || fileType === 'html')) {
      return activeFileContent
        .split('\n')
        .map((text, index) => ({ text, lineNumber: index + 1 }));
    } else {
      return [];
    }
  }, [activeFileContent, fileType]);

  const fuseInstance = useMemo(() => {
    if (!lines || lines.length === 0) return null;
    console.log(
      `[FileViewer] Fuse instance recomputing. Threshold: ${fuseScoreThreshold}, Lines count: ${lines.length}, CaseSensitive: ${isCaseSensitive}`
    );
    // DIAGNOSTIC: Options adjusted for better substring matching
    return new Fuse(lines, {
      keys: ['text'],
      includeScore: true, // Keep for debugging
      includeMatches: true, // Keep for debugging
      threshold: fuseScoreThreshold, // This is the threshold from the UI
      ignoreLocation: true, // Crucial for substring matching regardless of position
      ignoreFieldNorm: true, // Disable field length penalty for long text matches
      isCaseSensitive: isCaseSensitive, // Use value from store
    });
  }, [lines, fuseScoreThreshold, isCaseSensitive]); // Added isCaseSensitive back

  const searchResults = useMemo(() => {
    console.log(
      `[FileViewer] SearchResults recomputing. Query: '${searchQueryForFuse}', Fuse Threshold: ${fuseScoreThreshold}`
    );
    if (!searchQueryForFuse || !fuseInstance) {
      console.log(
        '[FileViewer] No search query or fuse instance, returning empty results.'
      );
      return [];
    }

    // Log the query and a sample line from the source data for comparison
    console.log(
      '[FileViewer] JSON.stringified searchQueryForFuse:',
      JSON.stringify(searchQueryForFuse)
    );
    // IMPORTANT: Adjust the index lines[X] to a line you know contains the search query
    // For example, if your search query is expected in the 2nd line of the file (index 1):
    if (lines && lines.length > 1 && lines[1]) {
      // Check if line exists
      console.log(
        '[FileViewer] JSON.stringified lines[1].text:',
        JSON.stringify(lines[1].text)
      );
    }
    // You might need to log a different line index based on your pinegap.txt content

    const fuseResults = fuseInstance.search(searchQueryForFuse);
    console.log('[FileViewer] Fuse raw results:', fuseResults);
    // Manual threshold filtering: keep only matches with score <= threshold
    const filteredResults = fuseResults.filter(
      (r) => typeof r.score === 'number' && r.score <= fuseScoreThreshold
    );
    console.log(
      `[FileViewer] Results after manual threshold filter (score <= ${fuseScoreThreshold}): ${filteredResults.length}`
    );
    return filteredResults
      .map((fuseResult) => {
        // Assuming matches exist and matches[0] is the relevant one for 'text' key
        const matchDetails = fuseResult.matches?.[0];
        return {
          lineNumber: fuseResult.item.lineNumber,
          text: fuseResult.item.text, // Original line text
          score: fuseResult.score, // Score of the match
          indices: matchDetails?.indices || [], // Array of [start, end] character indices
        };
      })
      .filter((result) => result.indices.length > 0); // Only keep results that have match segments
  }, [searchQueryForFuse, fuseInstance, fuseScoreThreshold, lines]);

  const renderLineWithHighlights = (lineText: string, lineNumber: number) => {
    const matchesOnThisLine = searchResults.filter(
      (match) => match.lineNumber === lineNumber
    );
    if (!matchesOnThisLine.length || searchQueryForFuse.trim() === '') {
      return <div key={lineNumber}>{lineText}</div>;
    }

    let lastIndex = 0;
    const parts = [];
    const allIndices = matchesOnThisLine
      .flatMap((match) => match.indices)
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
        <mark
          key={`match-${lineNumber}-${i}`}
          style={{ backgroundColor: highlightColor, color: 'black' }}
        >
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
            <div style={{ position: 'relative' }}>
              <Page
                pageNumber={pdfParameters.pageNumber}
                scale={pdfParameters.scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                customTextRenderer={({ str }) => {
                  return str;
                }}
              />
              {fileType === 'pdf' &&
                pdfFileUrl &&
                pdfParameters.pageWidth > 0 &&
                pdfParameters.pageHeight > 0 &&
                pdfParameters.boxWidth > 0 &&
                pdfParameters.boxHeight > 0 && (
                  <BoundingBox
                    x={(pdfParameters.x / pdfParameters.pageWidth) * 100}
                    y={(pdfParameters.y / pdfParameters.pageHeight) * 100}
                    width={
                      (pdfParameters.boxWidth / pdfParameters.pageWidth) * 100
                    }
                    height={
                      (pdfParameters.boxHeight / pdfParameters.pageHeight) * 100
                    }
                    pageWidth={pdfParameters.pageWidth}
                    pageHeight={pdfParameters.pageHeight}
                    color={highlightColor}
                  />
                )}
            </div>
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
  }

  if ((fileType === 'text' || fileType === 'html') && activeFileContent) {
    return (
      <ScrollArea className="w-full h-[calc(100vh-200px)] p-1 border rounded-md shadow-inner bg-gray-50">
        <div className="whitespace-pre-wrap font-mono text-sm p-4">
          {lines.map((line) =>
            renderLineWithHighlights(line.text, line.lineNumber)
          )}
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
