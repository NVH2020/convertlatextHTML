import React, { useState, useEffect } from 'react';
import { FileType, ProcessingFile } from './types';
import { pdfToImages, docxToHtmlAndImages } from './utils/converters';
import { convertToLatexHtml } from './services/gemini';
import { FileText, Settings, Key, CheckCircle2, XCircle, Copy, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessingFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // LOGIC API KEY: Tự động lấy từ localStorage
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(!localStorage.getItem('GEMINI_API_KEY'));

  const handleSaveApiKey = (key: string) => {
    const cleanKey = key.trim();
    localStorage.setItem('GEMINI_API_KEY', cleanKey);
    setApiKey(cleanKey);
    setIsSettingsOpen(false);
    alert("✅ Đã lưu API Key thành công!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type === 'application/pdf' ? FileType.PDF : FileType.DOCX;
    setCurrentFile({ file, type, status: 'idle', progress: 0 });
  };

  const processFile = async () => {
    if (!currentFile) return;
    if (!apiKey) {
      setIsSettingsOpen(true);
      return alert("Vui lòng nhập Gemini API Key trước khi bắt đầu!");
    }

    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 20 } : null);

    try {
      let images: string[] = [];
      let textData = "";

      if (currentFile.type === FileType.PDF) {
        images = await pdfToImages(currentFile.file);
        textData = "[PDF - Gõ lại chuẩn: $ toán, \\begin{cases} hệ, ^\\circ độ, BBT text | , [Có hình vẽ minh họa]]";
      } else {
        const res = await docxToHtmlAndImages(currentFile.file);
        const div = document.createElement('div');
        div.innerHTML = res.html;
        textData = div.innerText;
        images = res.images.slice(0, 10);
      }

      // TRUYỀN API KEY VÀO HÀM SERVICE
      const result = await convertToLatexHtml(images, textData, apiKey);
      setCurrentFile(prev => prev ? { ...prev, status: 'completed', progress: 100, result } : null);
    } catch (err: any) {
      setCurrentFile(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (currentFile?.result?.latex) {
      navigator.clipboard.writeText(currentFile.result.latex);
      alert("Đã copy nội dung!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">MathDigitizer <span className="text-blue-600">Elite</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Digitalize PDF to Math-Ready Text</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${apiKey ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'}`}
          >
            {apiKey ? <CheckCircle2 size={16}/> : <Key size={16}/>}
            {apiKey ? 'API READY' : 'NHẬP API KEY'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* PANEL CÀI ĐẶT API */}
        {isSettingsOpen && (
          <div className="mb-8 bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="text-blue-400" />
              <h2 className="font-black uppercase tracking-widest text-sm">Cấu hình Gemini API</h2>
            </div>
            <p className="text-slate-400 text-xs mb-6 font-medium">Lấy Key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 underline">Google AI Studio</a>. Key sẽ được lưu an toàn trên trình duyệt của bạn.</p>
            <div className="flex gap-3">
              <input 
                id="api-input"
                type="password" 
                defaultValue={apiKey}
                placeholder="Dán API Key vào đây..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById('api-input') as HTMLInputElement).value;
                  handleSaveApiKey(val);
                }}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Lưu Key
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 mb-6">Tải tài liệu</h2>
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input id="file-upload" type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:text-blue-600 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                   <FileType className="w-7 h-7" />
                </div>
                <p className="text-sm font-black text-slate-600">Tải lên PDF / DOCX</p>
                <p className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">AI will process 10 pages max</p>
              </div>

              {currentFile && (
                <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-inner">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xl shadow-sm">
                      {currentFile.type === FileType.PDF ? '📄' : '📝'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{currentFile.file.name}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{currentFile.status}</p>
                    </div>
                  </div>
                  {currentFile.status === 'idle' && (
                    <button onClick={processFile} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                      BẮT ĐẦU SỐ HÓA
                    </button>
                  )}
                  {currentFile.status === 'processing' && (
                    <div className="py-2">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 animate-pulse w-full"></div>
                      </div>
                      <p className="text-[11px] text-center text-slate-500 font-black mt-3 uppercase tracking-widest">Processing Content...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QUY TẮC HIỂN THỊ */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-5 bg-blue-600 rounded-full"></span> QUY TẮC FINAL
              </h3>
              <ul className="text-xs space-y-4 text-slate-600 font-bold">
                <li className="flex gap-3 items-start"><span className="text-blue-500">★</span> <span>Toán học ($x$, $ABC$): Bao bằng 1 dấu $</span></li>
                <li className="flex gap-3 items-start"><span className="text-blue-500">★</span> <span>Hệ phương trình: Dùng cases</span></li>
                <li className="flex gap-3 items-start"><span className="text-blue-500">★</span> <span>Bỏ qua Header/Footer hoàn toàn</span></li>
              </ul>
            </div>
          </div>

          {/* KẾT QUẢ */}
          <div className="lg:col-span-8 flex flex-col min-h-[600px]">
            <div className="bg-white flex-grow rounded-[2rem] shadow-2xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden">
              <div className="border-b border-slate-100 px-8 py-5 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Kết quả số hóa</h2>
                {currentFile?.status === 'completed' && (
                  <button onClick={copyToClipboard} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all">
                    <Copy size={14} /> COPY VĂN BẢN
                  </button>
                )}
              </div>

              <div className="flex-grow p-10 overflow-auto font-mono text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-blue-100">
                {!currentFile && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                    <FileText size={64} className="mb-6" />
                    <p className="text-sm font-black tracking-widest uppercase">Awaiting document...</p>
                  </div>
                )}
                
                {currentFile?.status === 'processing' && (
                  <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="w-10 h-10 border-[4px] border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Digitizing math symbols...</p>
                  </div>
                )}

                {currentFile?.status === 'completed' && currentFile.result?.latex}

                {currentFile?.status === 'error' && (
                  <div className="h-full flex flex-col items-center justify-center text-rose-500 p-12 text-center">
                    <XCircle size={48} className="mb-4 opacity-50" />
                    <p className="font-black mb-2 uppercase text-lg">Xử lý thất bại</p>
                    <p className="text-xs font-bold opacity-70 max-w-xs leading-relaxed">{currentFile.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="max-w-6xl mx-auto py-12 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">MathDigitizer Pro &bull; Optimized for Gemini 1.5 &bull; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;
