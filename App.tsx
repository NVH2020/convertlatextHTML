
import React, { useState, useEffect } from 'react';
import { FileType, ProcessingFile, ConversionResult } from './types';
import { pdfToImages, docxToHtmlAndImages, downloadFile } from './utils/converters';
import { convertToLatexHtml } from './services/gemini';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Fixed: Removed 'readonly' modifier from 'aistudio' to prevent modifier mismatch errors during interface merging.
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessingFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'latex' | 'html'>('latex');

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Không thể mở trình chọn khóa:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type as FileType;
    if (type !== FileType.PDF && type !== FileType.DOCX) {
      alert("Vui lòng chỉ tải lên tệp PDF hoặc DOCX.");
      return;
    }

    setCurrentFile({
      file,
      type,
      status: 'idle',
      progress: 0
    });
  };

  const processFile = async () => {
    if (!currentFile) return;

    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 10 } : null);

    try {
      let images: string[] = [];
      let context = "";

      if (currentFile.type === FileType.PDF) {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        images = await pdfToImages(currentFile.file);
      } else {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        const { html, images: docImages } = await docxToHtmlAndImages(currentFile.file);
        context = html;
        images = docImages.slice(0, 5); 
      }

      setCurrentFile(prev => prev ? { ...prev, progress: 60 } : null);
      
      const result = await convertToLatexHtml(images, context);

      setCurrentFile(prev => prev ? { 
        ...prev, 
        status: 'completed', 
        progress: 100, 
        result 
      } : null);
    } catch (err: any) {
      let errorMessage = err.message || "Đã xảy ra lỗi không xác định";
      
      if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("API_KEY")) {
        errorMessage = "Lỗi xác thực API. Vui lòng bấm vào 'Cấu hình API Key' bên dưới để thiết lập.";
      }

      setCurrentFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: errorMessage 
      } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCurrentFile(null);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen flex flex-col">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Doc2Latex <span className="text-blue-600">&</span> HTML
          </h1>
          <p className="text-slate-500 text-sm">Chuyển đổi tài liệu thông minh bằng AI</p>
        </div>
        <button 
          onClick={handleSelectKey}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
          </svg>
          Cấu hình API Key
        </button>
      </header>

      <main className="flex-grow space-y-6">
        {!currentFile ? (
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-3xl p-12 bg-white transition-all hover:border-blue-300 hover:bg-blue-50/20 group">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <label className="cursor-pointer text-center">
              <span className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 hover:-translate-y-1 active:translate-y-0">
                Tải lên PDF / Word
              </span>
              <input type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
              <p className="mt-4 text-slate-400 text-sm font-medium">Kéo thả hoặc nhấn để chọn tệp</p>
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {/* File Info Bar */}
            <div className="bg-slate-50 p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${currentFile.type === FileType.PDF ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-xs">{currentFile.file.name}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{(currentFile.file.size / 1024 / 1024).toFixed(2)} MB • {currentFile.type === FileType.PDF ? 'PDF' : 'DOCX'}</p>
                </div>
              </div>

              {currentFile.status === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={reset} className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors">Hủy</button>
                  <button 
                    onClick={processFile}
                    className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                    Bắt đầu chuyển đổi
                  </button>
                </div>
              )}

              {currentFile.status === 'processing' && (
                <div className="flex items-center gap-4 flex-grow max-w-md ml-auto">
                   <div className="flex-grow h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500 rounded-full" 
                        style={{ width: `${currentFile.progress}%` }} 
                      />
                   </div>
                   <span className="text-sm font-bold text-blue-600 whitespace-nowrap animate-pulse">{currentFile.progress}%</span>
                </div>
              )}

              {currentFile.status === 'completed' && (
                <button onClick={reset} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors">Đổi tệp khác</button>
              )}
            </div>

            {/* Error Message */}
            {currentFile.status === 'error' && (
              <div className="p-12 text-center bg-red-50/30">
                <div className="text-red-500 mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-red-900 mb-2">Đã xảy ra lỗi</h4>
                <p className="text-red-700 mb-8 max-w-md mx-auto">{currentFile.error}</p>
                <div className="flex justify-center gap-4">
                   <button onClick={reset} className="px-8 py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors shadow-sm">Thoát</button>
                   <button onClick={processFile} className="bg-red-600 text-white px-10 py-3 rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100">Thử lại</button>
                </div>
              </div>
            )}

            {/* Processing state detail */}
            {currentFile.status === 'processing' && (
              <div className="flex flex-col items-center justify-center p-24">
                <div className="relative w-28 h-28 mb-8">
                  <div className="absolute inset-0 border-[6px] border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Đang phân tích tài liệu...</h3>
                <p className="text-slate-500 text-center max-w-sm">
                  Gemini AI đang trích xuất văn bản, nhận diện công thức và hình ảnh từ tài liệu của bạn.
                </p>
              </div>
            )}

            {/* Results Display */}
            {currentFile.status === 'completed' && currentFile.result && (
              <div className="flex flex-col h-[75vh]">
                <div className="flex border-b border-slate-200 px-6 pt-4 bg-white sticky top-0 z-10">
                  <button 
                    onClick={() => setActiveTab('latex')}
                    className={`px-8 py-4 font-bold text-sm tracking-widest uppercase transition-all border-b-4 ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    LaTeX Code
                  </button>
                  <button 
                    onClick={() => setActiveTab('html')}
                    className={`px-8 py-4 font-bold text-sm tracking-widest uppercase transition-all border-b-4 ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    HTML Preview
                  </button>
                  <div className="ml-auto flex items-center gap-3 mb-2">
                    <button 
                      onClick={() => {
                        const content = activeTab === 'latex' ? currentFile.result?.latex : currentFile.result?.html;
                        const ext = activeTab === 'latex' ? '.tex' : '.html';
                        const mime = activeTab === 'latex' ? 'text/plain' : 'text/html';
                        if (content) downloadFile(content, currentFile.file.name.replace(/\.[^/.]+$/, "") + ext, mime);
                      }}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Tải về .{activeTab}
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-100/50 p-6 sm:p-8">
                  {activeTab === 'latex' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Editor</span>
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(currentFile.result?.latex || "");
                                alert("Đã sao chép vào bộ nhớ tạm!");
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            Sao chép
                          </button>
                       </div>
                       <pre className="p-6 text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {currentFile.result.latex}
                       </pre>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                         <div 
                           className="prose prose-slate max-w-none prose-img:rounded-xl prose-img:shadow-md"
                           dangerouslySetInnerHTML={{ __html: currentFile.result.html }}
                         />
                      </div>
                      <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HTML Source</span>
                        </div>
                        <pre className="p-6 text-[10px] sm:text-xs font-mono text-blue-300 overflow-x-auto">
                          {currentFile.result.html}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto py-8 text-center">
        <div className="inline-flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
           <span>Cung cấp bởi Gemini AI</span>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <span>Hỗ trợ Word & PDF</span>
        </div>
        <div className="flex justify-center gap-6">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors text-xs font-bold uppercase tracking-widest">Tài liệu API</a>
           <button onClick={handleSelectKey} className="text-slate-400 hover:text-blue-500 transition-colors text-xs font-bold uppercase tracking-widest">Cài đặt lại Key</button>
        </div>
      </footer>
    </div>
  );
};

export default App;
