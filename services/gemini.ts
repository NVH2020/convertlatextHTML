
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const textPart = {
    text: `Bạn là một chuyên gia soạn thảo văn bản học thuật và toán học. 
    Nhiệm vụ: Xử lý nội dung văn bản để chuẩn hóa các công thức toán học sang định dạng LaTeX ($...$) dùng cho MathType, đồng thời phải GIỮ NGUYÊN HOÀN TOÀN cấu trúc trình bày của bản gốc.

    YÊU CẦU CHI TIẾT:
    1. GIỮ NGUYÊN CẤU TRÚC: 
       - Nếu nội dung cung cấp có các thẻ HTML (như <p>, <b>, <i>, <table>, <tr>, <td>, <ul>, <li>, <br>), bạn PHẢI giữ lại các thẻ này.
       - Giữ nguyên các khoảng trắng, ngắt dòng (\n), thụt lề và đánh số câu.
    2. CHUYỂN ĐỔI TOÁN HỌC:
       - Tìm tất cả các con số, biến số (x, y, a, b...), tham số, đơn vị đo lường và công thức toán học.
       - Bao bọc chúng bằng ký hiệu $...$. Ví dụ: $x^2 + y = 5$, $10 cm$, $Câu 1$.
    3. HÌNH ẢNH:
       - Giữ nguyên vị trí các hình ảnh. Nếu thấy mô tả hình ảnh hoặc placeholder, hãy dùng [HÌNH VẼ: mô tả].
    4. ĐẦU RA (JSON):
       - "latex": Văn bản thuần túy (Plain Text) có chứa $, giữ nguyên các ký tự ngắt dòng (\n).
       - "html": Mã HTML hoàn chỉnh có chứa $, giữ nguyên định dạng in đậm, bảng biểu nếu có.

    Nội dung gốc cần xử lý:
    ${textContext}
    
    Hãy trả về kết quả dưới dạng JSON với hai trường "latex" và "html".`
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
          required: ["latex", "html"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as ConversionResult;
  } catch (error: any) {
    console.error("Gemini conversion error:", error);
    throw error;
  }
};
