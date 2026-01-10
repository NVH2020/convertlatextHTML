import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Thầy dùng đúng đoạn này để đảm bảo load được Worker thành công
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const pdfToImages = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Khởi tạo tác vụ đọc PDF
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      // Cấu hình thêm để tránh lỗi "fake worker"
      isEvalSupported: false 
    });
    
    const pdf = await loadingTask.promise;
    const imageUrls: string[] = [];
    
    // Chỉ lấy 3-5 trang đầu để đảm bảo tốc độ
    const numPages = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) continue;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    return imageUrls;
  } catch (error: any) {
    console.error("Lỗi chuyển đổi PDF cụ thể:", error);
    throw new Error(`Lỗi đọc PDF: ${error.message}`);
  }
};
