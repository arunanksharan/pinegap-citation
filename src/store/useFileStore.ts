import { create } from 'zustand';

export type FileType = 'pdf' | 'html' | 'text';

export interface PdfParameters {
  pageNumber: number;
  scale: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  pageWidth: number;
  pageHeight: number;
}

// States for each file type instance
interface PdfFileState {
  file: File | null;
  numPages: number | null;
}

interface TextFileState {
  file: File | null;
  content: string | null;
}

// Main store structure
interface FileState {
  fileType: FileType | null;       // Currently selected file type in dropdown
  activeFile: File | null;         // File object for FileViewer (can be PDF or Text file obj)
  activeFileContent: string | null; // Text content for FileViewer
  activeNumPages: number | null;   // numPages for current active PDF in viewer

  pdfInstance: PdfFileState;
  textInstance: TextFileState;
  // htmlInstance will be added later

  pdfParameters: PdfParameters; // Remains for PDF specific UI controls
  searchText: string;
  levenshteinThreshold: number;
  highlightColor: string;
  isMatchWholeWord: boolean;
  isCaseSensitive: boolean;
}

interface FileActions {
  setFileType: (type: FileType | null) => void;
  // Action to set a newly uploaded file and its content, and update active states if type matches
  setUploadedFileAndSyncActive: (uploadedFile: File, uploadedContent: string | null) => void;
  setPdfNumPagesForInstance: (pages: number | null) => void; // Updates pdfInstance.numPages

  updatePdfParameter: <K extends keyof PdfParameters>(key: K, value: PdfParameters[K]) => void;
  setPdfParameters: (params: Partial<PdfParameters>) => void;
  setSearchText: (text: string) => void;
  setLevenshteinThreshold: (threshold: number) => void;
  setHighlightColor: (color: string) => void;
  setIsMatchWholeWord: (isMatchWholeWord: boolean) => void;
  setIsCaseSensitive: (isCaseSensitive: boolean) => void;
  resetTextParameters: () => void;
  resetAllParameters: () => void;
}

const initialPdfParameters: PdfParameters = {
  pageNumber: 1, scale: 1.0, boxX: 0, boxY: 0, boxWidth: 100, boxHeight: 100, pageWidth: 595, pageHeight: 842,
};

const initialFileStateOnly: FileState = {
  fileType: null,
  activeFile: null,
  activeFileContent: null,
  activeNumPages: null,
  pdfInstance: { file: null, numPages: null },
  textInstance: { file: null, content: null },
  pdfParameters: initialPdfParameters,
  searchText: '',
  levenshteinThreshold: 0,
  highlightColor: '#FFFF00',
  isMatchWholeWord: true,
  isCaseSensitive: false,
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
      // Placeholder for HTML
      set({ fileType: 'html', activeFile: null, activeFileContent: null, activeNumPages: null });
    } else {
      set({ fileType: null, activeFile: null, activeFileContent: null, activeNumPages: null });
    }
  },

  setUploadedFileAndSyncActive: (uploadedFile, uploadedContent) => {
    const currentFileType = get().fileType;
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
    } 
    // Add HTML handling later
  },
  
  setPdfNumPagesForInstance: (pages) => {
    set(state => ({
      pdfInstance: { ...state.pdfInstance, numPages: pages },
      // If the currently active file is this PDF instance, update activeNumPages too
      activeNumPages: state.activeFile === state.pdfInstance.file ? pages : state.activeNumPages,
    }));
  },

  updatePdfParameter: (key, value) =>
    set((state) => ({ pdfParameters: { ...state.pdfParameters, [key]: value } })),
  setPdfParameters: (params) => 
    set((state) => ({ pdfParameters: { ...state.pdfParameters, ...params }})),
  setSearchText: (text) => set({ searchText: text }),
  setLevenshteinThreshold: (threshold) => set({ levenshteinThreshold: threshold }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setIsMatchWholeWord: (isMatchWholeWord) => set({ isMatchWholeWord }),
  setIsCaseSensitive: (isCaseSensitive) => set({ isCaseSensitive }),

  resetTextParameters: () => set({
    searchText: initialFileStateOnly.searchText,
    levenshteinThreshold: initialFileStateOnly.levenshteinThreshold,
    highlightColor: initialFileStateOnly.highlightColor,
    isMatchWholeWord: initialFileStateOnly.isMatchWholeWord,
    isCaseSensitive: initialFileStateOnly.isCaseSensitive,
  }),
  resetAllParameters: () => {
    // When resetting all, also clear the active file type choice
    get().setFileType(null); // This will clear activeFile, activeFileContent, activeNumPages
    set(initialFileStateOnly); // Then reset all instances and parameters
  },
}));
