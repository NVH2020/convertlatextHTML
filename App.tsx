
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
  const [activeTab, setActiveTab] = useState<'latex' | 'html'>('latex'); // Mặc định xem LaTeX/Text
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
      alert("Hướng dẫn: Bạn cần cài đặt API_KEY trong môi trường của mình.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type as FileType;
    if (type !== FileType.PDF && type !== FileType.DOCX) {
      alert("Vui lòng tải lên tệp PDF hoặc DOCX.");
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
    
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6; }
          p { margin: 0 0 12pt 0; white-space: pre-wrap; }
          .math { color: black; }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    // Sử dụng nội dung HTML nhưng đảm bảo các ngắt dòng được giữ lại nếu cần
    const sourceHTML = header + currentFile.result.html + footer;
    
    const fileName = currentFile.file.name.replace(/\.[^/.]+$/, "") + "_Fixed.doc";
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
        context = "Đây là tài liệu PDF. Hãy trích xuất nội dung văn bản và công thức toán học, giữ nguyên thứ tự câu hỏi.";
      } else {
        setCurrentFile(prev => prev ? { ...prev, progress: 30 } : null);
        const docResult = await docxToHtmlAndImages(currentFile.file);
        // Ưu tiên gửi HTML gốc để Gemini thấy được cấu trúc bảng biểu/đoạn văn
        context = docResult.html;
        images = docResult.images.slice(0, 3);
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
        error: err.message || "Lỗi xử lý." 
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
    <div className="max-w-5xl mx-auto px-4 py-6 min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <header className="mb-8 flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-700">Doc2Math <span className="text-slate-900">Exact</span></h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Bảo toàn 100% văn bản & Chuyển đổi toán học</p>
        </div>
        <button onClick={handleSelectKey} className="text-[10px] font-black uppercase border px-3 py-1.5 rounded-lg hover:bg-white transition-all">Thiết lập</button>
      </header>

      <main className="flex-grow">
        {!currentFile ? (
          <div 
            className="bg-white border-2 border-dashed border-slate-300 rounded-[2rem] p-20 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer shadow-sm group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Chọn file PDF hoặc Word</h2>
            <p className="text-slate-400 text-sm font-medium">Giữ nguyên định dạng gốc, chỉ đổi công thức toán</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[75vh]">
            <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${currentFile.type === FileType.PDF ? 'bg-red-500' : 'bg-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                  </svg>
                </div>
                <div className="truncate max-w-[200px] sm:max-w-sm">
                  <p className="font-bold text-sm truncate">{currentFile.file.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{currentFile.status === 'completed' ? 'Hoàn tất' : 'Đang đợi'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {currentFile.status === 'idle' && (
                  <button onClick={processFile} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100">Bắt đầu xử lý</button>
                )}
                <button onClick={reset} className="text-slate-400 hover:text-slate-600 p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
            </div>

            <div className="flex-grow overflow-hidden flex flex-col">
              {currentFile.status === 'processing' && (
                <div className="flex-grow flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-slate-700">Đang chuẩn hóa: {currentFile.progress}%</p>
                </div>
              )}

              {currentFile.status === 'completed' && currentFile.result && (
                <div className="flex flex-col h-full">
                  <div className="flex border-b bg-white px-4">
                    <button onClick={() => setActiveTab('latex')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Văn bản (LaTeX)</button>
                    <button onClick={() => setActiveTab('html')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Xem trước HTML</button>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={downloadAsMathTypeWord} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm">Tải Word (.doc)</button>
                    </div>
                  </div>
                  <div className="flex-grow overflow-auto p-6 bg-slate-50">
                    <div className="max-w-3xl mx-auto bg-white border rounded-2xl p-8 shadow-sm min-h-full">
                      {activeTab === 'latex' ? (
                        <div className="font-serif text-[16px] leading-relaxed whitespace-pre-wrap select-all">
                          {currentFile.result.latex}
                        </div>
                      ) : (
                        <div className="prose prose-slate max-w-none prose-p:my-4" dangerouslySetInnerHTML={{ __html: currentFile.result.html }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentFile.status === 'error' && (
                <div className="p-20 text-center">
                  <p className="text-red-500 font-bold mb-4">{currentFile.error}</p>
                  <button onClick={reset} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold">Quay lại</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-6 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] py-4">
        Doc2Math Pro • Hệ thống bảo toàn cấu trúc văn bản
      </footer>
    </div>
  );
};

export default App;
