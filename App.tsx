import React, { useState } from 'react';
import { FileType, ProcessingFile } from './types';
import { pdfToImages, docxToHtmlAndImages } from './utils/converters';
import { convertToLatexHtml } from './services/gemini';
import { FileText, Settings, Key, CheckCircle2, XCircle, Copy, BookOpen, FileType as FileTypeIcon } from 'lucide-react';

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessingFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Quản lý API Key
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(!localStorage.getItem('GEMINI_API_KEY'));

  const handleSaveApiKey = (key: string) => {
    const cleanKey = key.trim();
    if (!cleanKey) return alert("Vui lòng không để trống API Key!");
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
    if (!currentFile || isProcessing) return;
    if (!apiKey) {
      setIsSettingsOpen(true);
      return alert("Vui lòng nhập Gemini API Key trước!");
    }

    setIsProcessing(true);
    setCurrentFile(prev => prev ? { ...prev, status: 'processing', progress: 20 } : null);

    try {
      let images: string[] = [];
      let textData = "";

      if (currentFile.type === FileType.PDF) {
        images = await pdfToImages(currentFile.file);
        textData = "[PDF Scan Content]";
      } else {
        const res = await docxToHtmlAndImages(currentFile.file);
        const div = document.createElement('div');
        div.innerHTML = res.html;
        textData = div.innerText;
        images = res.images.slice(0, 10);
      }

      // Truyền đúng 3 tham số cho hàm gemini.ts
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
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">MathDigitizer <span className="text-blue-600">Elite</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">PDF TO WORD / LATEX</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${apiKey ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}
          >
            {apiKey ? <CheckCircle2 size={16}/> : <Key size={16}/>}
            {apiKey ? 'API READY' : 'SETUP API'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {isSettingsOpen && (
          <div className="mb-8 bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4 text-blue-400">
              <Settings size={20} />
              <h2 className="font-black uppercase tracking-widest text-sm">Cấu hình API Key</h2>
            </div>
            <div className="flex gap-3 mt-4">
              <input 
                id="api-input"
                type="password" 
                defaultValue={apiKey}
                placeholder="Nhập API Key..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById('api-input') as HTMLInputElement).value;
                  handleSaveApiKey(val);
                }}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black text-xs uppercase"
              >
                Lưu
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 mb-6">Tải tài liệu</h2>
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input id="file-upload" type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                <FileTypeIcon className="w-10 h-10 mx-auto mb-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                <p className="text-sm font-black text-slate-600">Tải lên PDF / DOCX</p>
              </div>

              {currentFile && (
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-black text-slate-800 truncate mb-4">{currentFile.file.name}</p>
                  {currentFile.status === 'idle' && (
                    <button onClick={processFile} disabled={isProcessing} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-black shadow-lg">
                      {isProcessing ? "ĐANG XỬ LÝ..." : "BẮT ĐẦU SỐ HÓA"}
                    </button>
                  )}
                  {currentFile.status === 'processing' && (
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden animate-pulse">
                      <div className="bg-blue-600 h-full w-2/3"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white min-h-[500px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="px-8 py-5 flex items-center justify-between bg-slate-50/50 border-b">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KẾT QUẢ</h2>
                {currentFile?.status === 'completed' && (
                  <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-xs font-black hover:bg-slate-50">
                    <Copy size={14} /> COPY
                  </button>
                )}
              </div>
              <div className="p-10 font-mono text-sm whitespace-pre-wrap flex-grow">
                {!currentFile && <p className="text-slate-300 text-center mt-20">Đang chờ tài liệu...</p>}
                {currentFile?.status === 'completed' && currentFile.result?.latex}
                {currentFile?.status === 'error' && <p className="text-rose-500 font-bold">{currentFile.error}</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
