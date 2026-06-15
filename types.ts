
export interface PDFPage {
  id: string;
  originalFileId: string;
  originalFileName: string;
  pageIndex: number;
  previewUrl: string;
}

export interface PDFFile {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  pageCount: number;
}

export interface AppState {
  files: PDFFile[];
  pages: PDFPage[];
  isProcessing: boolean;
  isMerging: boolean;
  statusMessage: string;
}
