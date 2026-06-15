
import React, { useState, useRef } from 'react';
import { 
  FilePlus, 
  Trash2, 
  GripVertical, 
  Download, 
  Layers, 
  FileText,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Type as TypeIcon,
  Settings2,
  Filter,
  Hash,
  ChevronDown,
  FolderOpen,
  ShieldCheck,
  Lock,
  AlertCircle
} from 'lucide-react';
import { extractPages, mergePDFs } from './services/pdfService';
import { PDFFile, PDFPage } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [customFileName, setCustomFileName] = useState<string>("merged_document");
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Filter state
  const [filterType, setFilterType] = useState<'first' | 'last' | 'specific'>('first');
  const [specificPageNum, setSpecificPageNum] = useState<number>(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const processFileList = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    const newFiles: PDFFile[] = [];
    const newPages: PDFPage[] = [];

    const pdfFiles = Array.from(fileList).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    for (const file of pdfFiles) {
      const fileId = Math.random().toString(36).substr(2, 9);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const extracted = await extractPages(fileId, file.name, uint8Array);
        
        if (extracted.length > 0) {
          const fileObj: PDFFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            data: uint8Array,
            pageCount: extracted.length
          };
          
          newFiles.push(fileObj);
          newPages.push(...extracted);
        }
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setPages(prev => [...prev, ...newPages]);
    setIsProcessing(false);
    
    // Clear inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (dirInputRef.current) dirInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFileList(e.target.files);
  };

  const removePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
  };

  const movePage = (fromIdx: number, toIdx: number) => {
    const updatedPages = [...pages];
    const [movedItem] = updatedPages.splice(fromIdx, 1);
    updatedPages.splice(toIdx, 0, movedItem);
    setPages(updatedPages);
  };

  const applyFilter = () => {
    if (files.length === 0) return;

    const fileMap = files.reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {} as Record<string, PDFFile>);

    setPages(prev => {
      const filtered = prev.filter(p => {
        const file = fileMap[p.originalFileId];
        if (!file) return false;

        if (filterType === 'first') return p.pageIndex === 0;
        if (filterType === 'last') return p.pageIndex === file.pageCount - 1;
        if (filterType === 'specific') return p.pageIndex === (specificPageNum - 1);
        
        return true;
      });
      return filtered;
    });
    
    setIsFilterOpen(false);
  };

  const handleDownload = async () => {
    if (pages.length === 0) return;
    setIsMerging(true);
    setDownloadSuccess(false);
    
    try {
      const mergedData = await mergePDFs(pages, files);
      const blob = new Blob([mergedData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const rawName = customFileName.trim() || 'merged_document';
      a.download = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Merge error:", error);
      setErrorMessage("Failed to merge PDF. Please ensure all uploaded files are valid PDFs.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleClear = () => {
    // Revoke object URLs to prevent memory leaks
    pages.forEach(page => {
      if (page.previewUrl && page.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(page.previewUrl);
        } catch (e) {
          console.error("Error revoking preview URL:", e);
        }
      }
    });

    setFiles([]);
    setPages([]);
    setCustomFileName("merged_document");
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Layers size={22} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-none mb-1">PDF Master</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={10} className="text-green-600" /> Secure & Local
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {pages.length > 0 && (
            <>
              <div className="hidden lg:flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-blue-400 transition-all">
                <TypeIcon size={14} className="text-slate-400 mr-2" />
                <input 
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="Filename..."
                  className="bg-transparent text-sm font-semibold focus:outline-none w-48 text-slate-700"
                />
                <span className="text-slate-400 text-xs font-bold">.pdf</span>
              </div>

              <button 
                onClick={() => setShowClearConfirm(true)}
                className="text-slate-400 hover:text-red-500 text-sm font-bold px-2 py-2 transition-colors"
              >
                Clear
              </button>

              <button 
                onClick={handleDownload}
                disabled={isMerging}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-xl transition-all active:scale-95 disabled:opacity-70 ${
                  downloadSuccess 
                    ? 'bg-green-500 text-white shadow-green-100' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }`}
              >
                {isMerging ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : downloadSuccess ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Download size={18} />
                )}
                {downloadSuccess ? "Saved!" : "Download Merged"}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {pages.length === 0 ? (
          <div className="h-[75vh] flex flex-col items-center justify-center gap-8">
            <div 
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); }}
              onDrop={(e) => { 
                e.preventDefault(); 
                e.currentTarget.classList.remove('drag-over');
                if (e.dataTransfer.files) {
                  processFileList(e.dataTransfer.files);
                }
              }}
              className="group w-full max-w-xl border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center hover:border-blue-400 hover:bg-white transition-all shadow-sm bg-white/50"
            >
              <div className="bg-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                <UploadCloud size={48} className="text-blue-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Merge PDFs Instantly</h2>
              <p className="text-slate-500 mb-10 text-lg max-w-sm mx-auto">
                Select a single file, multiple files, or an entire folder.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100"
                >
                  <FilePlus size={20} />
                  Choose Files
                </button>
                <button 
                  onClick={() => dirInputRef.current?.click()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  <FolderOpen size={20} className="text-amber-500" />
                  Upload Folder
                </button>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="w-full max-w-xl">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-start gap-4">
                  <div className="bg-green-50 p-3 rounded-2xl">
                    <Lock size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Local Processing</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">PDF content is processed 100% in your browser. No files are uploaded to any server or processed by external engines.</p>
                  </div>
               </div>
            </div>
            
            <input type="file" multiple accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <input type="file" multiple webkitdirectory="" className="hidden" ref={dirInputRef} onChange={handleFileUpload} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Privacy Alert for active workspace */}
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-blue-600" />
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">All merging happens locally on this device</p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-800 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <FileText size={18} className="text-blue-600" />
                  <span className="font-bold text-sm tracking-tight">{pages.length} <span className="text-slate-400 font-medium ml-1">Pages</span></span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-slate-800 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <Settings2 size={16} className="text-slate-400" />
                  <span className="font-bold text-sm tracking-tight">{files.length} <span className="text-slate-400 font-medium ml-1">Docs</span></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
                  <div className="relative group">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all font-bold text-sm text-slate-700"
                    >
                      <Filter size={16} className="text-indigo-500" />
                      Keep: {filterType === 'first' ? 'First Page' : filterType === 'last' ? 'Last Page' : `Page ${specificPageNum}`}
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    
                    {isFilterOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => { setFilterType('first'); setIsFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterType === 'first' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          First Page
                        </button>
                        <button 
                          onClick={() => { setFilterType('last'); setIsFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterType === 'last' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          Last Page
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        <div className="px-4 py-2">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Specific Page</p>
                          <div className="flex items-center gap-2">
                            <Hash size={12} className="text-slate-400" />
                            <input 
                              type="number" 
                              min="1"
                              value={specificPageNum}
                              onChange={(e) => { setFilterType('specific'); setSpecificPageNum(parseInt(e.target.value) || 1); }}
                              className="w-full bg-slate-100 border-none text-sm font-bold p-1 rounded-md focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={applyFilter}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Apply Filter
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 font-bold text-sm bg-white border-2 border-blue-100 px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    <FilePlus size={18} />
                    Files
                  </button>
                  <button 
                    onClick={() => dirInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 font-bold text-sm bg-white border-2 border-slate-200 px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    <FolderOpen size={18} className="text-amber-500" />
                    Folder
                  </button>
                </div>
              </div>

              <input type="file" multiple accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <input type="file" multiple webkitdirectory="" className="hidden" ref={dirInputRef} onChange={handleFileUpload} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-24">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDraggedIdx(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedIdx !== null && draggedIdx !== index) {
                      movePage(draggedIdx, index);
                      setDraggedIdx(index);
                    }
                  }}
                  onDragEnd={() => setDraggedIdx(null)}
                  className={`group relative bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100 transition-all cursor-grab active:cursor-grabbing ${draggedIdx === index ? 'opacity-30 scale-95 ring-4 ring-blue-500/20' : ''}`}
                >
                  <div className="absolute top-4 left-4 z-10 bg-slate-900/90 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-lg backdrop-blur-sm">
                    {index + 1}
                  </div>

                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 flex flex-col gap-2">
                    <button 
                      onClick={() => removePage(page.id)}
                      className="bg-white hover:bg-red-50 text-red-600 p-2.5 rounded-2xl shadow-xl border border-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="bg-white/90 text-slate-400 p-2.5 rounded-2xl shadow-xl border border-slate-100 backdrop-blur-sm">
                      <GripVertical size={18} />
                    </div>
                  </div>

                  <div className="aspect-[3/4] overflow-hidden bg-slate-100/50 flex items-center justify-center p-6 group-hover:bg-white transition-colors duration-500">
                    <img 
                      src={page.previewUrl} 
                      alt={`Page ${index + 1}`} 
                      className="max-h-full max-w-full shadow-lg rounded-sm border border-slate-100 transform group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                  </div>

                  <div className="px-5 py-4 bg-white border-t border-slate-50">
                    <p className="text-[10px] font-extrabold text-slate-900 truncate mb-1">
                      {page.originalFileName}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Original P.{page.pageIndex + 1}</span>
                      <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <Lock size={12} className="text-green-500" />
            100% Local Merging
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-blue-500" />
            No Tracking
          </div>
        </div>
      </footer>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full transform animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 text-center">
              Clear All Pages?
            </h3>
            <p className="text-sm text-slate-500 text-center font-medium leading-relaxed mb-6">
              This will remove all uploaded files and reset progress. This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-100"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full transform animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 text-center">
              Something Went Wrong
            </h3>
            <p className="text-sm text-slate-500 text-center font-medium leading-relaxed mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {(isProcessing || isMerging) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full transform animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-8 relative">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
              <div className="absolute inset-0 rounded-[2rem] border-4 border-blue-600/10 animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 text-center">
              {isMerging ? "Merging Pages..." : "Loading Files..."}
            </h3>
            <p className="text-sm text-slate-500 text-center font-medium leading-relaxed max-w-[240px]">
              {isMerging 
                ? "Assembling your final PDF locally. Your download will start instantly." 
                : "Processing each page to ensure high-quality editing locally."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
