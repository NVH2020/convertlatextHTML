import React, { useState, useEffect } from 'react';
import { FileType, ProcessingFile } from './types';
import { pdfToImages, docxToHtmlAndImages, downloadFile } from './utils/converters';
import { convertToLatexHtml } from './services/gemini';
import { Settings, FileText, Play, X, Download, CheckCircle, AlertCircle, Eye } from 'lucide-react';

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
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('user_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Kiểm tra môi trường AI Studio
  const isAIStudioEnv = !!(window.aistudio && typeof window.aistudio.openSelectKey === 'function');

  const handleSelectKey = async () => {
    if (isAIStudioEnv) {
      await window.aistudio?.openSelectKey();
    } else {
      setShowKeyInput(!showKeyInput);
    }
  };

  const saveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('user_gemini_api_key', val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type === 'application/pdf' ? FileType.PDF : FileType.DOCX;
    if (file.type !== 'application/pdf' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      alert("Vui lòng tải lên tệp PDF hoặc DOCX chuẩn.");
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
    if (!apiKey && !isAIStudioEnv) {
      alert("Thầy vui lòng nhập API KEY trong phần Thiết lập trước khi xử lý.");
      setShowKeyInput(true);
      return;
    }

    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 10, error: undefined } : null);

    try {
      let images: string[] = [];
      let context = "";

      if (currentFile.type === FileType.PDF) {
        images = await pdfToImages(currentFile.file);
        context = "Tài liệu PDF gốc.";
      } else {
        const docResult = await docxToHtmlAndImages(currentFile.file);
        context = docResult.html;
        images = docResult.images;
      }

      setCurrentFile(prev => prev ? { ...prev, progress: 50 } : null);
      
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
        error: err.message || "Lỗi xử lý AI." 
      } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAsMathTypeWord = () => {
    if (!currentFile?.result?.html) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Times New Roman', serif; font-size: 13pt; }</style></head><body>`;
    const sourceHTML = header + currentFile.result.html + "</body></html>";
    const fileName = currentFile.file.name.replace(/\.[^/.]+$/, "") + "_Math.doc";
    downloadFile(sourceHTML, fileName, 'application/msword');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-700 flex items-center gap-2">
            Doc2Math <span className="text-slate-900 font-light">Exact</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Hệ thống bảo toàn cấu trúc văn bản & Toán học</p>
        </div>

        <div className="flex items-center gap-3">
          {showKeyInput && !isAIStudioEnv && (
            <input 
              type="password"
              placeholder="Nhập Gemini API Key..."
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="text-xs border rounded-lg px-3 py-2 w-48 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          )}
          <button 
            onClick={handleSelectKey} 
            className={`flex items-center gap-2 text-[10px] font-black uppercase border px-4 py-2 rounded-xl transition-all ${apiKey || isAIStudioEnv ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white border-slate-200'}`}
          >
            <Settings size={14} /> {isAIStudioEnv ? 'AI Studio Key' : (apiKey ? 'Đã có Key' : 'Thiết lập Key')}
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {!currentFile ? (
          <div 
            className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileUpload} />
            <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
              <FileText size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tải tài liệu lên</h2>
            <p className="text-slate-400 font-medium max-w-sm mx-auto">Tự động giữ nguyên định dạng câu hỏi và chuyển đổi công thức sang LaTeX.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col h-[70vh]">
            <div className="bg-slate-50/80 backdrop-blur-sm border-b p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${currentFile.type === FileType.PDF ? 'bg-red-500 shadow-red-100' : 'bg-blue-600 shadow-blue-100'}`}>
                   <FileText size={20} />
                </div>
                <div className="max-w-[150px] sm:max-w-md">
                  <p className="font-bold text-slate-800 truncate">{currentFile.file.name}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {currentFile.status === 'completed' ? 'Xử lý thành công' : currentFile.status === 'processing' ? 'Đang phân tích...' : 'Sẵn sàng'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {currentFile.status === 'idle' && (
                  <button onClick={processFile} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                    <Play size={16} fill="currentColor" /> Bắt đầu
                  </button>
                )}
                <button onClick={reset} className="bg-slate-200 text-slate-500 p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-grow flex flex-col overflow-hidden">
              {currentFile.status === 'processing' && (
                <div className="flex-grow flex flex-col items-center justify-center bg-white/80">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="font-black text-slate-800 uppercase tracking-widest text-sm">Tiến độ: {currentFile.progress}%</p>
                  <p className="text-slate-400 text-xs mt-2 italic">Gemini đang đọc và bao bọc dấu $...</p>
                </div>
              )}

              {currentFile.status === 'completed' && currentFile.result && (
                <div className="flex flex-col h-full bg-slate-50">
                  <div className="flex border-b bg-white px-6">
                    <button onClick={() => setActiveTab('latex')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'latex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                      Mã LaTeX
                    </button>
                    <button onClick={() => setActiveTab('html')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                      Xem Trước
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={downloadAsMathTypeWord} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all">
                        <Download size={14} /> Tải .doc
                      </button>
                    </div>
                  </div>
                  <div className="flex-grow overflow-auto p-8">
                    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-[2rem] p-10 shadow-sm min-h-full">
                      {activeTab === 'latex' ? (
                        <div className="font-serif text-[17px] leading-[1.8] whitespace-pre-wrap select-all text-slate-700">
                          {currentFile.result.latex}
                        </div>
                      ) : (
                        <div className="prose prose-slate max-w-none prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: currentFile.result.html }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentFile.status === 'error' && (
                <div className="p-20 text-center bg-red-50/30 flex-grow flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <p className="text-red-600 font-bold text-lg mb-2">Rất tiếc, đã có lỗi xảy ra</p>
                  <p className="text-red-400 text-sm mb-8 max-w-xs mx-auto font-medium">{currentFile.error}</p>
                  <button onClick={reset} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:scale-105 transition-transform">Thử lại với tệp khác</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] py-6 border-t border-slate-200">
        <span>AI Engine: Gemini 1.5 Flash</span>
        <span className="text-slate-400">Doc2Math Exact v2.0</span>
      </footer>
    </div>
  );
};

export default App;
