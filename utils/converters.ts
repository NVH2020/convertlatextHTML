import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Cấu hình Worker cho PDF.js bằng CDN tương ứng với phiên bản thư viện
// Điều này cực kỳ quan trọng để không bị trắng trang khi đọc PDF
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version || '4.0.379'}/build/pdf.worker.min.mjs`;

export const pdfToImages = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const imageUrls: string[] = [];

    // Chỉ lấy tối đa 5 trang đầu để tránh làm treo trình duyệt
    const numPages = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // Giảm scale xuống 1.5 để nhẹ hơn
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    return imageUrls;
  } catch (error) {
    console.error("Lỗi chuyển đổi PDF:", error);
    throw new Error("Không thể đọc file PDF. Thầy kiểm tra lại file nhé!");
  }
};

export const docxToHtmlAndImages = async (file: File): Promise<{ html: string, images: string[] }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const images: string[] = [];
    
    const options = {
      convertImage: mammoth.images.inline((element: any) => {
        return element.read("base64").then((imageBuffer: any) => {
          const base64 = `data:${element.contentType};base64,${imageBuffer.base64}`;
          images.push(base64);
          return { src: base64 };
        });
      })
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    return { html: result.value, images };
  } catch (error) {
    console.error("Lỗi chuyển đổi Word:", error);
    throw new Error("Không thể đọc file Word. File có thể bị khóa hoặc lỗi định dạng.");
  }
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
