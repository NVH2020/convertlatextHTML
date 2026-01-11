
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
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    const checkKeyStatus = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKeyStatus();
    const timer = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleSetupKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Lỗi mở trình chọn Key:", e);
      }
    } else {
      alert("Hệ thống quản lý Key chỉ khả dụng trong môi trường AI Studio.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type as FileType;
    if (type !== FileType.PDF && type !== FileType.DOCX) {
      alert("Chỉ chấp nhận file PDF hoặc Word (.docx)");
      return;
    }
    setCurrentFile({ file, type, status: 'idle', progress: 0 });
  };

  const downloadDoc = () => {
    if (!currentFile?.result?.latex) return;
    
    const content = currentFile.result.latex;
    const lines = content.split('\n').map(l => `<p style="margin:0 0 10pt 0;">${l.trim() === '' ? '&nbsp;' : l}</p>`).join('');
    
    const htmlWrapper = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; text-align: justify; }
      </style></head>
      <body>${lines}</body></html>
    `;
    
    downloadFile(htmlWrapper, currentFile.file.name.replace(/\.[^/.]+$/, "") + "_Convert.doc", 'application/msword');
  };

  const processFile = async () => {
    if (!currentFile) return;
    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 10, error: undefined } : null);

    try {
      let images: string[] = [];
      let textData = "";

      if (currentFile.type === FileType.PDF) {
        images = await pdfToImages(currentFile.file);
        textData = "Yêu cầu: Gõ lại y hệt văn bản, không thêm bớt. Công thức bao bọc bởi $$ $$. Dựng bảng biến thiên và bảng dữ liệu chuẩn LaTeX.";
      } else {
        const res = await docxToHtmlAndImages(currentFile.file);
        const div = document.createElement('div');
        div.innerHTML = res.html;
        textData = div.innerText;
        images = res.images.slice(0, 10);
      }

      setCurrentFile(prev => prev ? { ...prev, progress: 40 } : null);
      const result = await convertToLatexHtml(images, textData);
      setCurrentFile(prev => prev ? { ...prev, status: 'completed', progress: 100, result } : null);
    } catch (err: any) {
      setCurrentFile(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      {/* Header */}
      <nav className="max-w-5xl mx-auto flex items-center justify-between mb-8 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c1.026 0 1.99.191 2.875.539a.75.75 0 001-.707V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Math<span className="text-indigo-700">Digitizer</span></h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Chuẩn MathType $$ &bull; Gõ lại chính xác 100%</p>
          </div>
        </div>

        <button 
          onClick={handleSetupKey}
          className={`px-8 py-3 rounded-2xl text-xs font-black transition-all shadow-xl active:scale-95 border-b-4 ${hasKey ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-900 border-slate-700 text-white'}`}
        >
          {hasKey ? 'HỆ THỐNG SẴN SÀNG' : 'THIẾT LẬP API KEY'}
        </button>
      </nav>

      <main className="max-w-5xl mx-auto">
        {!currentFile ? (
          <div 
            className="group relative bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center hover:border-indigo-400 hover:bg-indigo-50/10 transition-all cursor-pointer shadow-sm"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4">Tải tài liệu lên</h2>
            <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
              Tự động gõ lại văn bản và chuyển công thức sang $$...$$. Hỗ trợ Bảng biến thiên và Bảng LaTeX.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[80vh]">
            <div className="border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg ${currentFile.type === FileType.PDF ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                  {currentFile.type === FileType.PDF ? 'PDF' : 'DOCX'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg truncate max-w-sm">{currentFile.file.name}</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{currentFile.status}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {currentFile.status === 'idle' && (
                  <button 
                    onClick={processFile} 
                    className="bg-indigo-700 text-white px-10 py-3 rounded-2xl text-sm font-black shadow-xl hover:bg-indigo-800 transition-all active:translate-y-1"
                  >
                    Bắt đầu số hóa
                  </button>
                )}
                <button onClick={() => setCurrentFile(null)} className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>

            <div className="flex-grow overflow-hidden relative">
              {currentFile.status === 'processing' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-700 rounded-full animate-spin mb-6"></div>
                  <h4 className="text-xl font-black text-slate-800">Đang số hóa chính xác...</h4>
                  <p className="text-slate-400 font-medium mt-2">Đang dựng lại Bảng và Công thức chuẩn $$</p>
                </div>
              )}

              {currentFile.status === 'completed' && currentFile.result && (
                <div className="flex flex-col h-full">
                  <div className="bg-slate-50 border-b border-slate-100 px-8 py-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Kết quả (Sẵn sàng cho MathType)</span>
                    <div className="flex gap-3">
                      <button onClick={downloadDoc} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.39a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" /></svg>
                        Tải file Word
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentFile.result?.latex || "");
                          alert("Đã copy nội dung LaTeX $$!");
                        }}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-all shadow-lg"
                      >
                        Copy Nội Dung
                      </button>
                    </div>
                  </div>
                  <div className="flex-grow overflow-auto p-12 bg-white font-serif text-[18px] leading-relaxed text-slate-800 whitespace-pre-wrap select-all selection:bg-indigo-100">
                    {currentFile.result.latex}
                  </div>
                </div>
              )}

              {currentFile.status === 'error' && (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">Lỗi gõ lại tài liệu</h4>
                  <p className="text-slate-500 mb-8 max-w-sm">{currentFile.error}</p>
                  <button onClick={() => setCurrentFile(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black">Thử lại</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto mt-12 text-center text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">MathDigitizer Pro &bull; Optimized for MathType &bull; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;
