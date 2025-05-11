import { create } from 'zustand';

export type FileType = 'pdf' | 'html' | 'text';

export interface PdfParameters {
  x: number;
  y: number;
  pageNumber: number;
  boxHeight: number;
  boxWidth: number;
  pageHeight: number;
  pageWidth: number;
}

interface FileState {
  uploadedFile: File | null;
  fileType: FileType | null;
  pdfParameters: PdfParameters;
  setUploadedFile: (file: File | null) => void;
  setFileType: (type: FileType | null) => void;
  updatePdfParameter: <K extends keyof PdfParameters>(key: K, value: PdfParameters[K]) => void;
  setPdfParameters: (params: Partial<PdfParameters>) => void; // To update multiple params at once
  resetState: () => void;
}

const initialPdfParameters: PdfParameters = {
  x: 50,
  y: 50,
  pageNumber: 1,
  boxHeight: 100,
  boxWidth: 100,
  pageHeight: 842, // Default A4-like height
  pageWidth: 595,  // Default A4-like width
};

export const useFileStore = create<FileState>((set) => ({
  uploadedFile: null,
  fileType: null,
  pdfParameters: initialPdfParameters,
  setUploadedFile: (file) => {
    set({ uploadedFile: file });
    // Reset parameters when a new file is uploaded, or decide if this is desired behavior
    // set({ pdfParameters: initialPdfParameters }); 
  },
  setFileType: (type) => set({ fileType: type }),
  updatePdfParameter: (key, value) =>
    set((state) => ({
      pdfParameters: { ...state.pdfParameters, [key]: value },
    })),
  setPdfParameters: (params) =>
    set((state) => ({
      pdfParameters: { ...state.pdfParameters, ...params },
    })),
  resetState: () => set({
    uploadedFile: null,
    fileType: null,
    pdfParameters: initialPdfParameters,
  }),
}));
