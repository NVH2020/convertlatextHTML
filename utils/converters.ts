
declare const pdfjsLib: any;
declare const mammoth: any;

// Configure PDF.js worker
if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const pdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
    
    // Safety limit for large docs
    if (i >= 10) break; 
  }

  return imageUrls;
};

export const docxToHtmlAndImages = async (file: File): Promise<{ html: string, images: string[] }> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract images and text
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
