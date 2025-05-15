import { create } from 'zustand';

export type FileType = 'pdf' | 'text' | 'html';

export interface PdfParameters {
  pageNumber: number;
  scale: number;
  pageWidth: number; // Actual width of the rendered PDF page in pixels
  pageHeight: number; // Actual height of the rendered PDF page in pixels
  x: number; // User-defined X for bounding box (absolute pixels)
  y: number; // User-defined Y for bounding box (absolute pixels)
  boxWidth: number; // User-defined width for bounding box (absolute pixels)
  boxHeight: number; // User-defined height for bounding box (absolute pixels)
}

export interface HtmlParameters {
  pageNumber: number;
  scale: number;
  pageWidth: number; // Actual width of the rendered HTML viewport in pixels
  pageHeight: number; // Actual height of the rendered HTML viewport in pixels
  x: number; // User-defined X for bounding box (absolute pixels)
  y: number; // User-defined Y for bounding box (absolute pixels)
  boxWidth: number; // User-defined width for bounding box (absolute pixels)
  boxHeight: number; // User-defined height for bounding box (absolute pixels)
}

export interface TextParameters {
  searchTerm: string;
  matchCase: boolean;
  fontSize: number;
}

interface PdfFileState {
  file: File | null;
  numPages: number | null;
}

interface TextFileState {
  file: File | null;
  content: string | null;
}

interface HtmlFileState {
  file: File | null;
  content: string | null;
  numPages: number | null;
}

// Main store structure
interface FileState {
  fileType: FileType | null;       // Currently selected file type in dropdown
  activeFile: File | null;         // File object for FileViewer (can be PDF or Text file obj)
  activeFileContent: string | null; // Text content for FileViewer
  activeNumPages: number | null;   // numPages for current active PDF in viewer
  pdfNumPages: number | null;      // Total number of pages for the loaded PDF document, distinct from activeNumPages for UI elements like sliders

  pdfInstance: PdfFileState;
  textInstance: TextFileState;
  htmlInstance: HtmlFileState;

  pdfParameters: PdfParameters; // Remains for PDF specific UI controls
  htmlParameters: HtmlParameters; // Added for HTML specific UI controls
  textParameters: TextParameters; // Added for Text specific UI controls

  searchText: string;
  searchQueryForFuse: string; // Actual query to be used by Fuse.js, set on button click
  thresholdForFuse: number;   // Actual threshold to be used by Fuse.js, set on button click
  fuseScoreThreshold: number;    // Renamed from levenshteinThreshold, stores 0.0-1.0 score
  highlightColor: string;
  isMatchWholeWord: boolean;
  isCaseSensitive: boolean;
  fileInputKey: number; // Added for resetting file input
}

interface FileActions {
  setFileType: (type: FileType | null) => void;
  // Action to set a newly uploaded file and its content, and update active states if type matches
  setUploadedFileAndSyncActive: (uploadedFile: File | null, uploadedContent: string | null) => void;
  setPdfNumPagesForInstance: (pages: number | null) => void; // Updates pdfInstance.numPages
  setHtmlNumPagesForInstance: (pages: number | null) => void; // Updates htmlInstance.numPages

  updatePdfParameter: <K extends keyof PdfParameters>(key: K, value: PdfParameters[K]) => void;
  setPdfParameters: (params: Partial<PdfParameters>) => void;
  updateHtmlParameter: <K extends keyof HtmlParameters>(key: K, value: HtmlParameters[K]) => void;
  setHtmlParameters: (params: Partial<HtmlParameters>) => void;
  updateTextParameter: <K extends keyof TextParameters>(key: K, value: TextParameters[K]) => void;
  setTextParameters: (params: Partial<TextParameters>) => void;
  setSearchText: (text: string) => void;
  triggerSearch: () => void; // New action to trigger search
  setFuseScoreThreshold: (threshold: number | string) => void; // Renamed, accepts number or string for parsing
  setHighlightColor: (color: string) => void;
  setIsMatchWholeWord: (isMatchWholeWord: boolean) => void;
  setIsCaseSensitive: (isCaseSensitive: boolean) => void;
  resetTextParameters: () => void;
  resetAllParameters: () => void;
  resetFileInput: () => void; // Added for resetting file input
}

const initialPdfParameters: PdfParameters = {
  pageNumber: 1,
  scale: 1.0,
  pageWidth: 595, // Actual width of the rendered PDF page in pixels
  pageHeight: 842, // Actual height of the rendered PDF page in pixels
  x: 50, // Default example value
  y: 50, // Default example value
  boxWidth: 100, // Default example value
  boxHeight: 100, // Default example value
};

const initialHtmlParameters: HtmlParameters = {
  pageNumber: 1,
  scale: 1,
  pageWidth: 0, // Will be set by the renderer component
  pageHeight: 0, // Will be set by the renderer component
  x: 50,
  y: 50,
  boxWidth: 200,
  boxHeight: 100,
};

const initialTextParameters: TextParameters = {
  searchTerm: '',
  matchCase: false,
  fontSize: 16,
};

const initialFileStateOnly: FileState = {
  fileType: null,
  activeFile: null,
  activeFileContent: null,
  activeNumPages: null,
  pdfNumPages: null, // Initialize pdfNumPages
  pdfInstance: { file: null, numPages: null },
  textInstance: { file: null, content: null },
  htmlInstance: { file: null, content: null, numPages: null },
  pdfParameters: initialPdfParameters,
  htmlParameters: initialHtmlParameters,
  textParameters: initialTextParameters,
  searchText: '',
  searchQueryForFuse: '',
  thresholdForFuse: 0.4, // Default to 0.4, will be updated by fuseScoreThreshold
  fuseScoreThreshold: 0.4,   // Renamed, default float value 0.0-1.0
  highlightColor: '#FFFF00',
  isMatchWholeWord: true,
  isCaseSensitive: false,
  fileInputKey: 0, // Added for resetting file input
};

export const useFileStore = create<FileState & FileActions>((set, get) => ({
  ...initialFileStateOnly,

  setFileType: (type) => {
    set((state) => {
      if (state.fileType === type) return {}; // No change if type is already set

      let newActiveFile: File | null = null;
      let newActiveFileContent: string | null = null;
      let newActiveNumPages: number | null = null;
      let newPdfNumPages: number | null = state.pdfNumPages; // Preserve if not changing from PDF

      if (type === 'pdf') {
        newActiveFile = state.pdfInstance.file;
        newActiveFileContent = null; // PDFs don't have string content in this model
        newActiveNumPages = state.pdfInstance.numPages;
        newPdfNumPages = state.pdfInstance.numPages; // Set when PDF becomes active
      } else if (type === 'text') {
        newActiveFile = state.textInstance.file;
        newActiveFileContent = state.textInstance.content;
        newActiveNumPages = null; // Text files don't have pages
        newPdfNumPages = null; // Clear if switching away from PDF
      } else if (type === 'html') {
        newActiveFile = state.htmlInstance.file;
        newActiveFileContent = state.htmlInstance.content;
        newActiveNumPages = state.htmlInstance.numPages; // HTML might have pages
        newPdfNumPages = null; // Clear if switching away from PDF
      } else {
        // Clearing file type
        newPdfNumPages = null;
      }

      return {
        fileType: type,
        activeFile: newActiveFile,
        activeFileContent: newActiveFileContent,
        activeNumPages: newActiveNumPages,
        pdfNumPages: newPdfNumPages, // Update pdfNumPages
      };
    });
  },

  setUploadedFileAndSyncActive: (uploadedFile, uploadedContent) => {
    if (!uploadedFile) {
      // If null is passed, it might mean to clear the specific type or all
      // This function is primarily for new uploads, so handling null might be out of scope
      // or require more specific logic based on which type is being cleared.
      // For now, we assume uploadedFile is always provided for an upload operation.
      return;
    }

    const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
    let actualFileType: FileType | null = null;

    if (fileExtension === 'pdf') actualFileType = 'pdf';
    else if (fileExtension === 'txt') actualFileType = 'text';
    else if (fileExtension === 'html' || fileExtension === 'htm') actualFileType = 'html';

    if (!actualFileType) {
      console.warn("[useFileStore] Unsupported file type for:", uploadedFile.name);
      return; // Exit if file type is not supported
    }

    const currentFileType = get().fileType;

    if (actualFileType === 'pdf') {
      // For PDF, content is not stored as string, numPages will be set by onDocumentLoadSuccess
      set(state => ({
        pdfInstance: { file: uploadedFile, numPages: null }, // numPages set later
        // If current view is already PDF, update active file immediately
        activeFile: currentFileType === 'pdf' ? uploadedFile : state.activeFile,
        activeFileContent: currentFileType === 'pdf' ? null : state.activeFileContent,
        activeNumPages: currentFileType === 'pdf' ? null : state.activeNumPages, // Will be updated by onDocumentLoadSuccess
        pdfNumPages: currentFileType === 'pdf' ? null : state.pdfNumPages, // Will be updated by onDocumentLoadSuccess
      }));
    } else if (actualFileType === 'text') {
      set(state => ({
        textInstance: { file: uploadedFile, content: uploadedContent },
        // If current view is already Text, update active file/content immediately
        activeFile: currentFileType === 'text' ? uploadedFile : state.activeFile,
        activeFileContent: currentFileType === 'text' ? uploadedContent : state.activeFileContent,
        // Clear numPages if Text is uploaded and Text is active view
        activeNumPages: currentFileType === 'text' ? null : state.activeNumPages,
        pdfNumPages: currentFileType === 'text' ? null : state.pdfNumPages, // Clear pdfNumPages if text is active
      }));
    } else if (actualFileType === 'html') {
      set(state => ({ 
        htmlInstance: { file: uploadedFile, content: uploadedContent, numPages: null },
        // If current view is already HTML, update active file/content immediately
        activeFile: currentFileType === 'html' ? uploadedFile : state.activeFile,
        activeFileContent: currentFileType === 'html' ? uploadedContent : state.activeFileContent,
        // Clear numPages if HTML is uploaded and HTML is active view (numPages for HTML might be handled differently)
        activeNumPages: currentFileType === 'html' ? null : state.activeNumPages, // HTML specific numPages might come later
        pdfNumPages: currentFileType === 'html' ? null : state.pdfNumPages, // Clear pdfNumPages if html is active
      }));
    }
  },
  
  setPdfNumPagesForInstance: (pages) => {
    set(state => ({
      pdfInstance: { ...state.pdfInstance, numPages: pages },
      // If the currently active file is this PDF instance, update activeNumPages and pdfNumPages
      activeNumPages: state.activeFile === state.pdfInstance.file ? pages : state.activeNumPages,
      pdfNumPages: state.activeFile === state.pdfInstance.file ? pages : state.pdfNumPages,
    }));
  },

  setHtmlNumPagesForInstance: (pages) => {
    set(state => ({
      htmlInstance: { ...state.htmlInstance, numPages: pages },
      // If the currently active file is this HTML instance, update activeNumPages too
      activeNumPages: state.activeFile === state.htmlInstance.file ? pages : state.activeNumPages,
    }));
  },

  updatePdfParameter: (key, value) =>
    set((state) => ({ pdfParameters: { ...state.pdfParameters, [key]: value } })),
  setPdfParameters: (params) => 
    set((state) => ({ pdfParameters: { ...state.pdfParameters, ...params }})),
  updateHtmlParameter: (key, value) =>
    set((state) => ({ htmlParameters: { ...state.htmlParameters, [key]: value } })),
  setHtmlParameters: (params) => 
    set((state) => ({ htmlParameters: { ...state.htmlParameters, ...params }})),
  updateTextParameter: (key, value) =>
    set((state) => ({ textParameters: { ...state.textParameters, [key]: value } })),
  setTextParameters: (params) => 
    set((state) => ({ textParameters: { ...state.textParameters, ...params }})),
  setSearchText: (text) => set({ searchText: text }),
  triggerSearch: () => {
    set((state) => {
      console.log(`[useFileStore] Triggering search. searchText: '${state.searchText}', fuseScoreThreshold: ${state.fuseScoreThreshold}`);
      return {
        searchQueryForFuse: state.searchText,
        // thresholdForFuse is no longer the primary way FileViewer gets threshold for Fuse instance
      };
    });
  },
  setFuseScoreThreshold: (value) => { // Renamed and updated logic
    let numValue = parseFloat(value.toString());
    if (isNaN(numValue)) {
      numValue = 0.4; // Default if parsing fails
    }
    // Clamp between 0.0 and 1.0
    numValue = Math.max(0.0, Math.min(1.0, numValue));
    set({ fuseScoreThreshold: numValue });
  },
  setHighlightColor: (color) => set({ highlightColor: color }),
  setIsMatchWholeWord: (isMatchWholeWord) => set({ isMatchWholeWord }),
  setIsCaseSensitive: (isCaseSensitive) => set({ isCaseSensitive }),

  resetTextParameters: () => set({
    searchText: initialFileStateOnly.searchText,
    searchQueryForFuse: initialFileStateOnly.searchQueryForFuse,
    fuseScoreThreshold: initialFileStateOnly.fuseScoreThreshold, // Renamed
    thresholdForFuse: initialFileStateOnly.fuseScoreThreshold, // Ensure this also uses the correct initial float value
    highlightColor: initialFileStateOnly.highlightColor,
    isMatchWholeWord: initialFileStateOnly.isMatchWholeWord,
    isCaseSensitive: initialFileStateOnly.isCaseSensitive,
  }),
  resetAllParameters: () => {
    // When resetting all, also clear the active file type choice
    get().setFileType(null); // This will clear activeFile, activeFileContent, activeNumPages
    set(initialFileStateOnly); // Then reset all instances and parameters
    get().resetFileInput(); // Ensure file input is also reset
  },
  resetFileInput: () => set((state) => ({ fileInputKey: state.fileInputKey + 1 })), // Added implementation
}));
