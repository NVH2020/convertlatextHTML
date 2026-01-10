
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Sử dụng gemini-3-pro-preview để có độ chính xác cao nhất về định dạng
  const modelName = 'gemini-3-pro-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const textPart = {
    text: `Bạn là một công cụ trích xuất và chuẩn hóa công thức toán học. 
    NHIỆM VỤ: 
    1. Giữ nguyên 100% văn bản gốc, bao gồm cả các nhãn "Câu 1.", "Câu 2.", "Bài tập:", các dấu ngắt dòng, khoảng trắng và thứ tự các đoạn văn.
    2. CHỈ tìm và chuyển đổi các công thức toán học, biểu thức, biến số (x, y, f(x)...) hoặc các con số nằm trong ngữ cảnh toán học sang định dạng LaTeX và bao bọc bởi duy nhất một cặp dấu $.
    3. KHÔNG được thêm bất kỳ văn bản giải thích nào, không được tóm tắt, không được thay đổi từ ngữ của người dùng.
    4. Nếu đầu vào có các thẻ HTML (như <p>, <br>, <b>, <table>), hãy giữ nguyên các thẻ đó ở trường "html".

    VÍ DỤ:
    Gốc: "Câu 1. Cho hàm số y = 2x + 1. Tính đạo hàm y'."
    Kết quả: "Câu 1. Cho hàm số $y = 2x + 1$. Tính đạo hàm $y'$."

    Nội dung cần xử lý:
    ${textContext}
    
    Hãy trả về JSON với:
    - "latex": Văn bản thuần có dấu $ và giữ nguyên ngắt dòng (\n).
    - "html": Văn bản có thẻ HTML (nếu có ở đầu vào) và dấu $.`
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
        },
        temperature: 0.1, // Giảm temperature để tránh việc AI tự ý sáng tạo hoặc thay đổi định dạng
      }
    });

    return JSON.parse(response.text || "{}") as ConversionResult;
  } catch (error: any) {
    console.error("Gemini conversion error:", error);
    throw error;
  }
};
