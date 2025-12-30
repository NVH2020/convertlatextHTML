
import React, { useState, useEffect } from 'react';
import { FileType, ProcessingFile, ConversionResult } from './types';
import { pdfToImages, docxToHtmlAndImages, downloadFile } from './utils/converters';
import { convertToLatexHtml } from './services/gemini';

// Fix: Define the AIStudio interface and update Window augmentation to use the expected type and modifiers
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessingFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'latex' | 'html'>('latex');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      setHasApiKey(false);
    }
  };

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setHasApiKey(true); // Giả định thành công theo tài liệu để tránh race condition
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
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định";
      
      // Kiểm tra lỗi yêu cầu chọn lại Key
      if (errorMessage.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setCurrentFile(prev => prev ? { 
          ...prev, 
          status: 'error', 
          error: "API Key không hợp lệ hoặc hết hạn. Vui lòng chọn lại API Key." 
        } : null);
      } else {
        setCurrentFile(prev => prev ? { 
          ...prev, 
          status: 'error', 
          error: errorMessage 
        } : null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCurrentFile(null);
    setIsProcessing(false);
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 mx-auto text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Yêu cầu API Key</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Ứng dụng cần API Key để thực hiện chuyển đổi tài liệu. Vui lòng chọn một API Key từ dự án có trả phí của bạn.
            <br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm block mt-2">Xem hướng dẫn thanh toán</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Chọn API Key ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Doc2Latex <span className="text-blue-600">&</span> HTML
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Chuyển đổi tài liệu Word và PDF sang định dạng LaTeX hoặc HTML một cách thông minh, bao gồm cả hình ảnh và công thức toán học.
        </p>
      </header>

      <main className="space-y-8">
        {!currentFile ? (
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-3xl p-16 bg-white transition-all hover:border-blue-400 hover:bg-blue-50/30 group">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 block">
                Chọn tệp (Word hoặc PDF)
              </span>
              <input type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
            </label>
            <p className="mt-4 text-slate-500 text-sm">Hỗ trợ .docx và .pdf (Lên tới 10 trang)</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {/* File Info Bar */}
            <div className="bg-slate-50 p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${currentFile.type === FileType.PDF ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-xs">{currentFile.file.name}</h3>
                  <p className="text-xs text-slate-500">{(currentFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {currentFile.status === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={reset} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-full font-medium transition-colors">Hủy</button>
                  <button 
                    onClick={processFile}
                    className="bg-blue-600 text-white px-8 py-2 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Bắt đầu chuyển đổi
                  </button>
                </div>
              )}

              {currentFile.status === 'processing' && (
                <div className="flex items-center gap-4 flex-grow max-w-md ml-auto">
                   <div className="flex-grow h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300" 
                        style={{ width: `${currentFile.progress}%` }} 
                      />
                   </div>
                   <span className="text-sm font-semibold text-blue-600 whitespace-nowrap animate-pulse">Đang xử lý...</span>
                </div>
              )}

              {currentFile.status === 'completed' && (
                <button onClick={reset} className="text-blue-600 hover:underline font-medium text-sm">Tải lên tệp khác</button>
              )}
            </div>

            {/* Error Message */}
            {currentFile.status === 'error' && (
              <div className="p-8 text-center">
                <div className="text-red-500 mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra lỗi</h4>
                <p className="text-slate-600 mb-6">{currentFile.error}</p>
                <div className="flex justify-center gap-4">
                   <button onClick={reset} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-full font-medium transition-colors">Hủy</button>
                   <button onClick={processFile} className="bg-slate-900 text-white px-8 py-2 rounded-full">Thử lại</button>
                </div>
              </div>
            )}

            {/* Content Display */}
            {currentFile.status === 'completed' && currentFile.result && (
              <div className="flex flex-col h-[70vh]">
                <div className="flex border-b border-slate-100 px-6 pt-4 bg-white sticky top-0">
                  <button 
                    onClick={() => setActiveTab('latex')}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    LATEX
                  </button>
                  <button 
                    onClick={() => setActiveTab('html')}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    HTML
                  </button>
                  <div className="ml-auto flex items-center gap-2 mb-2">
                    <button 
                      onClick={() => {
                        const content = activeTab === 'latex' ? currentFile.result?.latex : currentFile.result?.html;
                        const ext = activeTab === 'latex' ? '.tex' : '.html';
                        const mime = activeTab === 'latex' ? 'text/plain' : 'text/html';
                        if (content) downloadFile(content, currentFile.file.name.replace(/\.[^/.]+$/, "") + ext, mime);
                      }}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Tải về .{activeTab}
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-50 p-6">
                  {activeTab === 'latex' ? (
                    <pre className="bg-white p-6 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap">
                      {currentFile.result.latex}
                    </pre>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-6 rounded-xl border border-slate-200">
                         <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Xem trước HTML</span>
                         </div>
                         <div 
                           className="prose prose-slate max-w-none"
                           dangerouslySetInnerHTML={{ __html: currentFile.result.html }}
                         />
                      </div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 overflow-x-auto">
                        <pre className="text-xs font-mono text-blue-300">
                          {currentFile.result.html}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Initial Loading Screen */}
            {currentFile.status === 'processing' && (
              <div className="flex flex-col items-center justify-center p-20">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Đang xử lý tài liệu</h3>
                <p className="text-slate-500 text-center max-w-xs">
                  Hệ thống đang trích xuất văn bản, hình ảnh và chuyển đổi sang LaTeX/HTML bằng AI...
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-16 pb-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Doc2Latex/HTML Converter. Powered by Gemini AI.</p>
        <button onClick={handleSelectKey} className="text-blue-500 hover:underline mt-2">Thay đổi API Key</button>
      </footer>
    </div>
  );
};

export default App;
