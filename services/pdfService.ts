
// PDF.js and PDF-Lib globals are loaded via script tags in index.html
declare const pdfjsLib: any;
declare const PDFLib: any;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Validates if the given Uint8Array starts with the standard PDF header %PDF-
 */
const isPdfDataValid = (data: Uint8Array): boolean => {
  if (!data || data.length < 5) return false;
  // Check for %PDF- (0x25 0x50 0x44 0x46 0x2D)
  return (
    data[0] === 0x25 &&
    data[1] === 0x50 &&
    data[2] === 0x44 &&
    data[3] === 0x46 &&
    data[4] === 0x2D
  );
};

export const extractPages = async (fileId: string, fileName: string, data: Uint8Array): Promise<any[]> => {
  try {
    // Defensive copy to prevent issues if pdf.js transfers the buffer
    const dataCopy = data.slice(0);
    
    if (!isPdfDataValid(dataCopy)) {
      console.error(`Invalid PDF header for file: ${fileName}`);
      return [];
    }

    const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const pages: any[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        const previewUrl = canvas.toDataURL('image/jpeg', 0.8);

        pages.push({
          id: `${fileId}-p${i}-${Math.random().toString(36).substr(2, 9)}`,
          originalFileId: fileId,
          originalFileName: fileName,
          pageIndex: i - 1,
          previewUrl
        });
      }
    }

    return pages;
  } catch (error) {
    console.error("Error extracting pages:", error);
    // If it's a password protected file, pdf.js will throw an error
    return [];
  }
};

export const mergePDFs = async (pages: any[], files: any[]): Promise<Uint8Array> => {
  // Use the global PDFLib object
  const { PDFDocument } = PDFLib;
  const mergedPdf = await PDFDocument.create();
  const docCache: Record<string, any> = {};

  for (const page of pages) {
    try {
      if (!docCache[page.originalFileId]) {
        const file = files.find(f => f.id === page.originalFileId);
        if (file) {
          const fileData = file.data.slice(0); // Defensive copy
          
          if (!isPdfDataValid(fileData)) {
            throw new Error(`File "${file.name}" has an invalid PDF header at runtime.`);
          }
          
          // Fix: Use ignoreEncryption to allow merging of files with permission restrictions
          docCache[page.originalFileId] = await PDFDocument.load(fileData, { ignoreEncryption: true });
        } else {
          console.warn(`File ID ${page.originalFileId} not found in state.`);
          continue;
        }
      }

      const srcDoc = docCache[page.originalFileId];
      const [copiedPage] = await mergedPdf.copyPages(srcDoc, [page.pageIndex]);
      mergedPdf.addPage(copiedPage);
    } catch (err) {
      console.error(`Failed to copy page ${page.pageIndex} from file ${page.originalFileId}:`, err);
      throw err; // Re-throw to inform the UI that the merge failed
    }
  }

  return await mergedPdf.save();
};
