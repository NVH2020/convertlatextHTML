
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
  const [activeTab, setActiveTab] = useState<'latex' | 'html'>('html');
  const [isAIStudioEnv, setIsAIStudioEnv] = useState<boolean>(false);

  useEffect(() => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setIsAIStudioEnv(true);
    }
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    } else {
      alert("Hướng dẫn Vercel: Truy cập Project Settings -> Environment Variables. Thêm Key là 'API_KEY' và dán Gemini API Key của bạn vào Value. Sau đó Redeploy dự án.");
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

  const downloadAsMathTypeWord = () => {
    if (!currentFile?.result?.html) return;
    
    // Tạo cấu trúc HTML đầy đủ cho Word nhận diện tốt hơn
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Doc2Math Export</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
          p { margin: 0 0 10pt 0; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid black; padding: 5px; }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const sourceHTML = header + currentFile.result.html + footer;
    
    const fileName = currentFile.file.name.replace(/\.[^/.]+$/, "") + "_MathType.doc";
    downloadFile(sourceHTML, fileName, 'application/msword');
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
        context = "Tài liệu PDF được chuyển thành hình ảnh. Hãy đọc văn bản từ hình ảnh và tái tạo lại cấu trúc trang, các đoạn văn và công thức toán học.";
      } else {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        const docResult = await docxToHtmlAndImages(currentFile.file);
        // Gửi trực tiếp HTML từ Mammoth để Gemini xử lý trong khi vẫn giữ các thẻ định dạng
        context = docResult.html;
        images = docResult.images.slice(0, 3); // Gửi ít ảnh hơn để tránh quá tải nếu là word
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
      setCurrentFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: err.message || "Đã xảy ra lỗi trong quá trình xử lý AI." 
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
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen flex flex-col font-sans selection:bg-blue-100 bg-slate-50">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Doc2Math <span className="text-blue-600">Premium</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Giữ nguyên cấu trúc gốc • Chuyển đổi công thức MathType ($...$)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSelectKey}
            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Cấu hình API Key
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {!currentFile ? (
          <div 
            className="bg-white border-4 border-dashed border-slate-200 rounded-[3rem] p-24 text-center hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer group shadow-sm" 
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Tải lên Word hoặc PDF</h2>
            <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed uppercase text-xs tracking-widest">
              Hệ thống sẽ giữ nguyên ngắt dòng, bảng biểu và chuyển công thức sang dạng $...$
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[82vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${currentFile.type === FileType.PDF ? 'bg-red-500 shadow-red-200' : 'bg-blue-600 shadow-blue-200'} text-white shadow-lg`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V11.25a9 9 0 0 0-9-9h-5.625ZM12 4.5V11.25a.75.75 0 0 0 .75.75h6.75a7.5 7.5 0 0 0-7.5-7.5Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg truncate max-w-[200px] sm:max-w-md">{currentFile.file.name}</h3>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                      {currentFile.type === FileType.PDF ? 'PDF' : 'WORD'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                      {(currentFile.file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {currentFile.status === 'idle' && (
                  <>
                    <button onClick={reset} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Hủy</button>
                    <button 
                      onClick={processFile} 
                      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.982a.75.75 0 0 0-.75.75v4.25a.75.75 0 0 0 1.5 0v-2.22l.31.31a7 7 0 0 0 11.77-3.13.75.75 0 1 0-1.5-.615ZM16.018 6v-4.25a.75.75 0 0 0-1.5 0v2.22l-.31-.31a7 7 0 0 0-11.77 3.13.75.75 0 1 0 1.5.615 5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5h4.25a.75.75 0 0 0 .75-.75Z" clipRule="evenodd" />
                      </svg>
                      Xử lý tài liệu
                    </button>
                  </>
                )}
                {currentFile.status === 'completed' && (
                  <button onClick={reset} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">Tải tệp mới</button>
                )}
              </div>
            </div>

            {/* Display Area */}
            <div className="flex-grow overflow-hidden flex flex-col bg-slate-50">
              {currentFile.status === 'processing' && (
                <div className="flex-grow flex flex-col items-center justify-center p-12">
                  <div className="relative w-24 h-24 mb-10">
                    <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">Đang đọc & chuẩn hóa toán học...</h4>
                  <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-xs">Tiến độ: {currentFile.progress}%</p>
                  <p className="text-slate-400 mt-6 max-w-sm text-center text-sm leading-relaxed">
                    Hệ thống đang bảo tồn định dạng cũ và bao bọc các con số, công thức trong dấu $...$
                  </p>
                </div>
              )}

              {currentFile.status === 'completed' && currentFile.result && (
                <div className="flex flex-col h-full bg-white">
                  <div className="flex border-b border-slate-200 bg-white px-6">
                    <button 
                      onClick={() => setActiveTab('html')}
                      className={`px-8 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                    >
                      Kết quả Word/HTML
                    </button>
                    <button 
                      onClick={() => setActiveTab('latex')}
                      className={`px-8 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                    >
                      Mã LaTeX/MathType
                    </button>
                    
                    <div className="ml-auto flex items-center gap-3">
                      <button 
                        onClick={downloadAsMathTypeWord}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                        Tải file Word MathType (.doc)
                      </button>
                    </div>
                  </div>

                  <div className="flex-grow overflow-auto p-8 bg-slate-50/50">
                    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] border border-slate-200 shadow-sm p-12 min-h-full">
                      {activeTab === 'latex' ? (
                        <div className="font-serif text-[16px] text-slate-800 whitespace-pre-wrap leading-relaxed select-all font-medium">
                          {currentFile.result.latex}
                        </div>
                      ) : (
                        <div 
                          className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:my-5 prose-img:rounded-2xl prose-table:border prose-td:border prose-td:p-2"
                          dangerouslySetInnerHTML={{ __html: currentFile.result.html }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {currentFile.status === 'error' && (
                <div className="flex-grow flex flex-col items-center justify-center p-16 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-4">Lỗi xử lý tài liệu</h4>
                  <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium leading-relaxed">{currentFile.error}</p>
                  <button onClick={reset} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl">Thử lại từ đầu</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-10 text-center py-8">
        <div className="flex justify-center gap-8 mb-4">
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
             AI Powered
           </span>
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
             MathType Compatible
           </span>
        </div>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.5em]">
          &copy; {new Date().getFullYear()} Doc2Math Premium Edition
        </p>
      </footer>
    </div>
  );
};

export default App;
