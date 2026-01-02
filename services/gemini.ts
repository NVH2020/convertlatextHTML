
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  // Khởi tạo instance mới để lấy API key từ môi trường (process.env.API_KEY)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Sử dụng Gemini 3 Flash cho tốc độ và khả năng hiểu tiếng Việt tốt
  const modelName = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const textPart = {
    text: `Bạn là một chuyên gia chuyển đổi tài liệu sang định dạng văn bản học thuật chuyên nghiệp.
    Nhiệm vụ của bạn:
    1. Trích xuất toàn bộ nội dung từ hình ảnh/văn bản được cung cấp.
    2. Quy tắc định dạng văn bản:
       - Văn bản tiếng Việt thông thường: Giữ nguyên văn bản thuần túy.
       - Toán học và Kỹ thuật: TẤT CẢ các con số đơn lẻ, ký hiệu (x, y, a, b...), tham số, đại lượng đo lường và công thức toán học PHẢI được bao bọc bởi ký hiệu LaTeX $ ... $ (cho inline) hoặc $$ ... $$ (cho block).
       - Ví dụ: Thay vì viết "Diện tích S = 10m2", hãy viết "Diện tích $S = 10m^2$". Thay vì viết "x bằng 5", hãy viết "$x$ bằng $5$".
    3. Chuyển đổi sang 2 định dạng:
       - "latex": Mã nguồn LaTeX hoàn chỉnh (sử dụng gói amsmath).
       - "html": HTML sạch, hiển thị các đoạn LaTeX giữ nguyên dấu $ để các thư viện như MathJax có thể render (hoặc hiển thị rõ ràng).
    4. Đối với hình vẽ/đồ thị: Mô tả ngắn gọn trong dấu [IMAGE: mô tả].
    
    Bối cảnh văn bản: ${textContext}
    
    Trả về kết quả dưới dạng JSON có 2 trường: "latex" và "html".`
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latex: { type: Type.STRING },
            html: { type: Type.STRING },
          },
          required: ["latex", "html"],
          propertyOrdering: ["latex", "html"]
        }
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText) as ConversionResult;
  } catch (error: any) {
    console.error("Gemini conversion error:", error);
    throw error;
  }
};
