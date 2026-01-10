
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  // Khởi tạo AI với Key từ môi trường (được tiêm qua window.aistudio)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Sử dụng mô hình Pro để có khả năng tuân thủ định dạng tốt nhất
  const modelName = 'gemini-3-pro-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [...imageParts, { text: `Nội dung cần xử lý:\n${textContext}` }] },
    config: {
      systemInstruction: `Bạn là một công cụ định dạng văn bản toán học chính xác 100%.
      
      NHIỆM VỤ DUY NHẤT:
      1. COPY HOÀN TOÀN văn bản gốc, bao gồm tất cả các nhãn (Câu 1, Câu 2...), ngắt dòng, khoảng trắng và dấu câu. KHÔNG ĐƯỢC THAY ĐỔI BẤT KỲ CHỮ NÀO.
      2. Chỉ tìm các thành phần toán học (biến số x, y, z; con số 1, 2, 3 trong ngữ cảnh tính toán; các biểu thức; đơn vị đo) và bao bọc chúng bằng duy nhất một cặp dấu $.
      3. Tuyệt đối KHÔNG thêm văn bản giải thích, KHÔNG dùng Markdown (như ### hoặc **), KHÔNG tóm tắt.
      
      VÍ DỤ:
      Input: "Câu 1. Cho x = 5. Tính x + 1?"
      Output: "Câu 1. Cho $x = 5$. Tính $x + 1$?"
      
      Định dạng đầu ra: Trả về JSON với 2 trường "latex" (văn bản thuần có dấu $) và "html" (văn bản có thẻ <p> và <br> để giữ ngắt dòng).`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          latex: { type: Type.STRING },
          html: { type: Type.STRING },
        },
        required: ["latex", "html"]
      },
      temperature: 0, // Đặt bằng 0 để đảm bảo tính nhất quán tuyệt đối
    }
  });

  try {
    return JSON.parse(response.text || "{}") as ConversionResult;
  } catch (error) {
    console.error("Lỗi parse JSON từ Gemini:", error);
    throw new Error("Mô hình không trả về đúng định dạng JSON.");
  }
};
