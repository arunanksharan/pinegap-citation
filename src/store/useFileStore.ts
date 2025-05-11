import { create } from 'zustand';

export type FileType = 'pdf' | 'html' | 'text';

export interface PdfParameters {
  pageNumber: number;
  scale: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  pageWidth: number; // To store the actual width of the loaded PDF page
  pageHeight: number; // To store the actual height of the loaded PDF page
}

interface FileState {
  uploadedFile: File | null;
  fileType: FileType | null;
  pdfParameters: PdfParameters;
  numPages: number | null;
  searchText: string;
  levenshteinThreshold: number;
  highlightColor: string;
  uploadedFileContent: string | null;
  isMatchWholeWord: boolean;
  isCaseSensitive: boolean; 
}

interface FileActions {
  setUploadedFile: (file: File | null) => void;
  setFileType: (type: FileType | null) => void;
  updatePdfParameter: <K extends keyof PdfParameters>(key: K, value: PdfParameters[K]) => void;
  setPdfParameters: (params: Partial<PdfParameters>) => void; 
  setNumPages: (pages: number | null) => void;
  setSearchText: (text: string) => void;
  setLevenshteinThreshold: (threshold: number) => void;
  setHighlightColor: (color: string) => void;
  setUploadedFileContent: (content: string | null) => void;
  setIsMatchWholeWord: (isMatchWholeWord: boolean) => void;
  setIsCaseSensitive: (isCaseSensitive: boolean) => void; 
  resetTextParameters: () => void;
  resetAllParameters: () => void; // Changed from resetState for clarity
}

const initialPdfParameters: PdfParameters = {
  pageNumber: 1,
  scale: 1.0,
  boxX: 0,
  boxY: 0,
  boxWidth: 100,
  boxHeight: 100,
  pageWidth: 595,  // Default A4-like width
  pageHeight: 842, // Default A4-like height
};

const initialFileStateOnly: FileState = {
  uploadedFile: null,
  fileType: null,
  pdfParameters: initialPdfParameters,
  numPages: null,
  searchText: '',
  levenshteinThreshold: 0, // Default to exact match
  highlightColor: '#FFFF00', // Default yellow
  uploadedFileContent: null,
  isMatchWholeWord: true, // Default to true (though not fully implemented yet)
  isCaseSensitive: false, // Default to false (case-insensitive)
};

export const useFileStore = create<FileState & FileActions>((set) => ({
  ...initialFileStateOnly,

  setUploadedFile: (file) => {
    set({
      uploadedFile: file,
      numPages: null, // Reset numPages when a new file is uploaded
      // uploadedFileContent: null, // Clearing content here was in previous version, let's see if ControlPanel handles it
    });
    // If file is null or not a PDF, clear PDF-specific things
    if (!file || file.type !== 'application/pdf') {
      set({ pdfParameters: initialPdfParameters, numPages: null });
    }
     // When a new file is uploaded, always clear previous text content
    set({ uploadedFileContent: null });
  },
  setFileType: (type) => set({ fileType: type }),
  updatePdfParameter: (key, value) =>
    set((state) => ({
      pdfParameters: { ...state.pdfParameters, [key]: value },
    })),
  setPdfParameters: (params) => 
    set((state) => ({ 
      pdfParameters: { ...state.pdfParameters, ...params }
    })),
  setNumPages: (pages) => set({ numPages: pages }),
  setSearchText: (text) => set({ searchText: text }),
  setLevenshteinThreshold: (threshold) => set({ levenshteinThreshold: threshold }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setUploadedFileContent: (content) => set({ uploadedFileContent: content }),
  setIsMatchWholeWord: (isMatchWholeWord) => set({ isMatchWholeWord }),
  setIsCaseSensitive: (isCaseSensitive) => set({ isCaseSensitive }),

  resetTextParameters: () => set({
    searchText: initialFileStateOnly.searchText,
    levenshteinThreshold: initialFileStateOnly.levenshteinThreshold,
    highlightColor: initialFileStateOnly.highlightColor,
    // uploadedFileContent: initialFileStateOnly.uploadedFileContent, // Don't reset content here
    isMatchWholeWord: initialFileStateOnly.isMatchWholeWord,
    isCaseSensitive: initialFileStateOnly.isCaseSensitive,
  }),
  resetAllParameters: () => set(initialFileStateOnly),
}));
