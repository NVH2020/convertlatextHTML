
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
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessingFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'latex' | 'html'>('latex');
  const [isAIStudioEnv, setIsAIStudioEnv] = useState<boolean>(false);

  useEffect(() => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      setIsAIStudioEnv(true);
    }
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    } else {
      alert("Bạn đang chạy ứng dụng ngoài AI Studio (ví dụ: Vercel). Để ứng dụng hoạt động, hãy truy cập Vercel Dashboard -> Project Settings -> Environment Variables và thêm 'API_KEY' với giá trị là Gemini API Key của bạn.");
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
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 10, error: undefined } : null);

    try {
      let images: string[] = [];
      let context = "";

      if (currentFile.type === FileType.PDF) {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        images = await pdfToImages(currentFile.file);
      } else {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        const docResult = await docxToHtmlAndImages(currentFile.file);
        context = docResult.html;
        images = docResult.images.slice(0, 5); 
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
      
      if (errorMessage.includes("Requested entity was not found") || 
          errorMessage.includes("API_KEY") || 
          errorMessage.includes("API key not found") ||
          errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = isAIStudioEnv 
          ? "Lỗi xác thực API. Vui lòng bấm vào 'Cấu hình API Key' để thiết lập."
          : "Không tìm thấy API Key. Nếu bạn đang chạy trên Vercel/GitHub, hãy đảm bảo đã cấu hình biến môi trường 'API_KEY' trong Vercel Project Settings.";
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
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen flex flex-col font-sans">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Doc2Latex <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-500 text-sm">Chuyển đổi Word/PDF sang định dạng văn bản chuẩn LaTeX</p>
        </div>
        
        <div className="flex gap-2">
          {!isAIStudioEnv && (
            <div className="hidden sm:flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              Cần cấu hình API_KEY trên Vercel
            </div>
          )}
          <button 
            onClick={handleSelectKey}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
            Cài đặt API Key
          </button>
        </div>
      </header>

      <main className="flex-grow space-y-6">
        {!currentFile ? (
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[2.5rem] p-16 bg-white transition-all hover:border-blue-400 hover:bg-blue-50/10 group">
            <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 text-blue-500 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <label className="cursor-pointer text-center">
              <span className="inline-block bg-blue-600 text-white px-12 py-5 rounded-3xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 hover:-translate-y-1 active:translate-y-0">
                Tải lên PDF hoặc Word
              </span>
              <input type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
              <p className="mt-6 text-slate-400 font-medium">Kéo thả tệp vào đây để bắt đầu</p>
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
            {/* File Info Bar */}
            <div className="bg-slate-50 p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${currentFile.type === FileType.PDF ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg truncate max-w-xs">{currentFile.file.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{(currentFile.file.size / 1024 / 1024).toFixed(2)} MB • {currentFile.type === FileType.PDF ? 'PDF' : 'DOCX'}</p>
                </div>
              </div>

              {currentFile.status === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={reset} className="px-6 py-3 text-slate-500 hover:bg-slate-200 rounded-2xl font-bold transition-colors">Hủy</button>
                  <button 
                    onClick={processFile}
                    className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                  >
                    Bắt đầu chuyển đổi
                  </button>
                </div>
              )}

              {currentFile.status === 'processing' && (
                <div className="flex items-center gap-4 flex-grow max-w-md ml-auto">
                   <div className="flex-grow h-4 bg-slate-200 rounded-full overflow-hidden p-1">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-700 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${currentFile.progress}%` }} 
                      />
                   </div>
                   <span className="text-sm font-black text-blue-600 whitespace-nowrap">{currentFile.progress}%</span>
                </div>
              )}

              {currentFile.status === 'completed' && (
                <button onClick={reset} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors">Tải tệp khác</button>
              )}
            </div>

            {/* Error Message */}
            {currentFile.status === 'error' && (
              <div className="p-16 text-center bg-red-50/50">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-black text-red-900 mb-4">Lỗi hệ thống</h4>
                <p className="text-red-700 mb-10 max-w-lg mx-auto leading-relaxed font-medium">{currentFile.error}</p>
                <div className="flex justify-center gap-4">
                   <button onClick={reset} className="px-10 py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors shadow-sm">Bỏ qua</button>
                   <button onClick={processFile} className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all">Thử lại lần nữa</button>
                </div>
              </div>
            )}

            {/* Results Display */}
            {currentFile.status === 'completed' && currentFile.result && (
              <div className="flex flex-col h-[75vh]">
                <div className="flex border-b border-slate-200 px-6 pt-6 bg-white sticky top-0 z-10">
                  <button 
                    onClick={() => setActiveTab('latex')}
                    className={`px-10 py-4 font-black text-sm tracking-widest uppercase transition-all border-b-4 ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    LaTeX Code
                  </button>
                  <button 
                    onClick={() => setActiveTab('html')}
                    className={`px-10 py-4 font-black text-sm tracking-widest uppercase transition-all border-b-4 ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Xem trước HTML
                  </button>
                  <div className="ml-auto flex items-center gap-3 mb-4">
                    <button 
                      onClick={() => {
                        const content = activeTab === 'latex' ? currentFile.result?.latex : currentFile.result?.html;
                        const ext = activeTab === 'latex' ? '.tex' : '.html';
                        const mime = activeTab === 'latex' ? 'text/plain' : 'text/html';
                        if (content) downloadFile(content, currentFile.file.name.replace(/\.[^/.]+$/, "") + ext, mime);
                      }}
                      className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-slate-800 flex items-center gap-2 shadow-2xl shadow-slate-200 transition-all hover:-translate-y-0.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Tải về .{activeTab}
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-50/50 p-8 sm:p-10">
                  {activeTab === 'latex' ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source Code (UTF-8)</span>
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(currentFile.result?.latex || "");
                                alert("Đã sao chép mã LaTeX!");
                            }}
                            className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                          >
                            SAO CHÉP
                          </button>
                       </div>
                       <pre className="p-8 text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {currentFile.result.latex}
                       </pre>
                    </div>
                  ) : (
                    <div className="space-y-8 max-w-4xl mx-auto">
                      <div className="bg-white p-10 sm:p-16 rounded-[2.5rem] shadow-sm border border-slate-200 min-h-[500px]">
                         <div 
                           className="prose prose-slate max-w-none prose-p:leading-relaxed prose-img:rounded-3xl prose-img:shadow-2xl prose-headings:font-black"
                           dangerouslySetInnerHTML={{ __html: currentFile.result.html }}
                         />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing state detail */}
            {currentFile.status === 'processing' && (
              <div className="flex flex-col items-center justify-center p-32">
                <div className="relative w-32 h-32 mb-10">
                  <div className="absolute inset-0 border-[8px] border-blue-50 rounded-full"></div>
                  <div className="absolute inset-0 border-[8px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">Đang xử lý bằng AI...</h3>
                <p className="text-slate-500 text-center max-w-md font-medium leading-relaxed">
                  Chúng tôi đang chuyển các con số, công thức và tham số sang định dạng LaTeX chuẩn $...$ cho bạn.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 py-10 border-t border-slate-200 text-center">
        <div className="flex justify-center gap-10 mb-6">
           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Gemini 3 Flash
           </div>
           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Vietnamese Optimized
           </div>
        </div>
        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em]">
           &copy; {new Date().getFullYear()} Doc2Latex Pro • Chuyên gia văn bản học thuật
        </p>
      </footer>
    </div>
  );
};

export default App;
