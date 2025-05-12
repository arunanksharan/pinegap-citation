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
    const state = get();
    if (type === 'pdf') {
      set({
        fileType: 'pdf',
        activeFile: state.pdfInstance.file,
        activeFileContent: null,
        activeNumPages: state.pdfInstance.numPages,
      });
    } else if (type === 'text') {
      set({
        fileType: 'text',
        activeFile: state.textInstance.file, // Text file object can also be in activeFile
        activeFileContent: state.textInstance.content,
        activeNumPages: null, // No pages for text
      });
    } else if (type === 'html') {
      set({
        fileType: 'html',
        activeFile: state.htmlInstance.file,
        activeFileContent: state.htmlInstance.content,
        activeNumPages: state.htmlInstance.numPages,
      });
    } else {
      set({ fileType: null, activeFile: null, activeFileContent: null, activeNumPages: null });
    }
  },

  setUploadedFileAndSyncActive: (uploadedFile, uploadedContent) => {
    const currentFileType = get().fileType;

    if (!uploadedFile) {
      // Handle the case where the file input is cleared or no file is selected
      if (currentFileType === 'pdf') {
        set(state => ({
          pdfInstance: { file: null, numPages: null },
          activeFile: state.fileType === 'pdf' ? null : state.activeFile,
          activeNumPages: state.fileType === 'pdf' ? null : state.activeNumPages,
          activeFileContent: state.fileType === 'pdf' ? null : state.activeFileContent, // Ensure text content is cleared if PDF was active
        }));
      } else if (currentFileType === 'text') {
        set(state => ({
          textInstance: { file: null, content: null },
          activeFile: state.fileType === 'text' ? null : state.activeFile,
          activeFileContent: state.fileType === 'text' ? null : state.activeFileContent,
          activeNumPages: state.fileType === 'text' ? null : state.activeNumPages, // Ensure PDF pages are cleared if text was active
        }));
      } else if (currentFileType === 'html') {
        set(state => ({
          htmlInstance: { file: null, content: null, numPages: null },
          activeFile: state.fileType === 'html' ? null : state.activeFile,
          activeFileContent: state.fileType === 'html' ? null : state.activeFileContent,
          activeNumPages: state.fileType === 'html' ? null : state.activeNumPages,
        }));
      }
      return; // Exit early as there's no file to process
    }

    // If uploadedFile is not null, proceed with determining its type
    const actualFileType = uploadedFile.type === 'application/pdf' ? 'pdf'
                         : (uploadedFile.type === 'text/plain' || uploadedFile.name.endsWith('.txt')) ? 'text'
                         : (uploadedFile.type === 'text/html' || uploadedFile.name.endsWith('.html')) ? 'html'
                         : null;

    if (actualFileType === 'pdf') {
      set(state => ({ 
        pdfInstance: { file: uploadedFile, numPages: null }, // Reset numPages for new PDF
        // If current view is already PDF, update active file immediately
        activeFile: currentFileType === 'pdf' ? uploadedFile : state.activeFile,
        activeNumPages: currentFileType === 'pdf' ? null : state.activeNumPages, 
        // Clear text content if PDF is uploaded and PDF is active view
        activeFileContent: currentFileType === 'pdf' ? null : state.activeFileContent,
      }));
    } else if (actualFileType === 'text') {
      set(state => ({ 
        textInstance: { file: uploadedFile, content: uploadedContent },
        // If current view is already Text, update active file/content immediately
        activeFile: currentFileType === 'text' ? uploadedFile : state.activeFile,
        activeFileContent: currentFileType === 'text' ? uploadedContent : state.activeFileContent,
        // Clear numPages if Text is uploaded and Text is active view
        activeNumPages: currentFileType === 'text' ? null : state.activeNumPages,
      }));
    } else if (actualFileType === 'html') {
      set(state => ({ 
        htmlInstance: { file: uploadedFile, content: uploadedContent, numPages: null },
        // If current view is already HTML, update active file/content immediately
        activeFile: currentFileType === 'html' ? uploadedFile : state.activeFile,
        activeFileContent: currentFileType === 'html' ? uploadedContent : state.activeFileContent,
        // Clear numPages if HTML is uploaded and HTML is active view
        activeNumPages: currentFileType === 'html' ? null : state.activeNumPages,
      }));
    }
  },
  
  setPdfNumPagesForInstance: (pages) => {
    set(state => ({
      pdfInstance: { ...state.pdfInstance, numPages: pages },
      // If the currently active file is this PDF instance, update activeNumPages too
      activeNumPages: state.activeFile === state.pdfInstance.file ? pages : state.activeNumPages,
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
