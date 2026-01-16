import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = "",
  apiKey: string 
): Promise<ConversionResult> => {
  
  const genAI = new GoogleGenerativeAI(apiKey);

  // ĐƯA SYSTEM INSTRUCTION VÀO ĐÂY (Cách mới nhất của Google)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", // Dùng bản latest để tránh lỗi version
    systemInstruction: `Bạn là một chuyên gia số hóa tài liệu toán học chuyên nghiệp. Hãy gõ lại tài liệu từ hình ảnh/văn bản cung cấp theo các quy tắc:
    1. Toán học: Bao bằng dấu $ (ví dụ: $x^2$, $ABC$).
    2. Hệ phương trình: Dùng \\begin{cases}.
    3. BBT: Dùng | và - để vẽ bảng, dùng \\nearrow và \\searrow.
    4. Hình vẽ: Chèn [Có hình vẽ minh họa].
    5. Chỉ gõ lại nội dung, bỏ qua Header/Footer.
    Trả về JSON: {"latex": "...", "html": "..."}`
  });

  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const result = await model.generateContent({
    contents: [{ 
      role: "user", 
      parts: [...imageParts, { text: `Dữ liệu gốc:\n${textContext}` }] 
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const response = await result.response;
  const output = response.text();

  try {
    return JSON.parse(output) as ConversionResult;
  } catch (error) {
    console.error("Lỗi phân tích JSON:", error);
    throw new Error("AI trả về định dạng không đúng. Thầy hãy thử lại với ảnh rõ hơn.");
  }
};
