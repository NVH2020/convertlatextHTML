
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
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Giả định chọn thành công theo hướng dẫn
      setHasKey(true);
    } else {
      alert("Tính năng này yêu cầu môi trường hỗ trợ Gemini API Key Selection.");
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
    setCurrentFile({ file, type, status: 'idle', progress: 0 });
  };

  const downloadWordMathType = () => {
    if (!currentFile?.result?.latex) return;
    
    // Tạo file Word với font Times New Roman và giữ nguyên ngắt dòng
    const content = currentFile.result.latex;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; }
          p { margin: 0; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        ${content.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
      </body>
      </html>
    `;
    
    const fileName = currentFile.file.name.replace(/\.[^/.]+$/, "") + "_MathType.doc";
    downloadFile(htmlContent, fileName, 'application/msword');
  };

  const processFile = async () => {
    if (!currentFile) return;
    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 10, error: undefined } : null);

    try {
      let images: string[] = [];
      let context = "";

      if (currentFile.type === FileType.PDF) {
        images = await pdfToImages(currentFile.file);
        context = "Tài liệu PDF. Hãy giữ nguyên thứ tự các câu hỏi và trình bày.";
      } else {
        const docResult = await docxToHtmlAndImages(currentFile.file);
        // Lấy text thô để Gemini không bị rối bởi mã HTML rác, nhưng yêu cầu nó giữ ngắt dòng
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = docResult.html;
        context = tempDiv.innerText;
        images = docResult.images.slice(0, 3);
      }

      setCurrentFile(prev => prev ? { ...prev, progress: 50 } : null);
      const result = await convertToLatexHtml(images, context);
      setCurrentFile(prev => prev ? { ...prev, status: 'completed', progress: 100, result } : null);
    } catch (err: any) {
      setCurrentFile(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col font-sans text-slate-900 bg-[#f8fafc]">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-700">Doc2Math <span className="text-slate-900">Exact</span></h1>
          <p className="text-slate-500 text-sm font-bold mt-1">Giữ nguyên 100% định dạng • Chuẩn $...$ cho MathType</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${hasKey ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
            {hasKey ? 'Đã kết nối API' : 'Chưa có API Key'}
          </div>
          <button 
            onClick={handleSelectKey}
            className="px-6 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Thiết lập API Key
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {!currentFile ? (
          <div 
            className="bg-white border-2 border-dashed border-slate-300 rounded-[2.5rem] p-24 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer shadow-sm group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Tải tài liệu của bạn</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Hỗ trợ Word (.docx) và PDF</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[78vh]">
            <div className="bg-white border-b p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${currentFile.type === FileType.PDF ? 'bg-red-500' : 'bg-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V11.25a9 9 0 0 0-9-9h-5.625ZM12 4.5V11.25a.75.75 0 0 0 .75.75h6.75a7.5 7.5 0 0 0-7.5-7.5Z" />
                  </svg>
                </div>
                <div className="max-w-md">
                  <h3 className="font-black text-lg truncate leading-none mb-1">{currentFile.file.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentFile.status === 'completed' ? 'Xử lý hoàn tất' : 'Sẵn sàng'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {currentFile.status === 'idle' && (
                  <button 
                    onClick={processFile} 
                    disabled={!hasKey}
                    className={`px-8 py-3 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${hasKey ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    {!hasKey ? 'Vui lòng thiết lập API' : 'Bắt đầu chuyển đổi'}
                  </button>
                )}
                <button onClick={() => setCurrentFile(null)} className="text-slate-400 hover:text-slate-600 p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>

            <div className="flex-grow overflow-hidden flex flex-col bg-slate-50/50">
              {currentFile.status === 'processing' && (
                <div className="flex-grow flex flex-col items-center justify-center p-12">
                  <div className="w-16 h-16 border-[6px] border-blue-100 border-t-blue-600 rounded-full animate-spin mb-8"></div>
                  <h4 className="text-xl font-black">Đang bảo toàn cấu trúc...</h4>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Tiến trình: {currentFile.progress}%</p>
                </div>
              )}

              {currentFile.status === 'completed' && currentFile.result && (
                <div className="flex flex-col h-full bg-white">
                  <div className="flex border-b border-slate-100 bg-white px-6">
                    <button 
                      onClick={() => setActiveTab('latex')} 
                      className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'}`}
                    >
                      Kết quả chính xác
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                      <button 
                        onClick={downloadWordMathType} 
                        className="bg-green-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                        Tải Word (.doc)
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentFile.result?.latex || "");
                          alert("Đã sao chép văn bản!");
                        }}
                        className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-black transition-all shadow-lg"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-grow overflow-auto p-10 bg-slate-50/30">
                    <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-3xl p-12 min-h-full">
                      <div className="font-serif text-[18px] leading-[1.8] whitespace-pre-wrap select-all text-slate-800">
                        {currentFile.result.latex}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentFile.status === 'error' && (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  </div>
                  <h4 className="text-2xl font-black mb-2">Đã có lỗi xảy ra</h4>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8">{currentFile.error}</p>
                  <button onClick={() => setCurrentFile(null)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95">Thử lại</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] py-6 border-t border-slate-100">
        Doc2Math Exact &bull; {new Date().getFullYear()} &bull; Professional Scholarly Tool
      </footer>
    </div>
  );
};

export default App;
