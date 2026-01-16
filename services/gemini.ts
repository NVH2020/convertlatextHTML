import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = "",
  apiKey: string 
): Promise<ConversionResult> => {
  
  const genAI = new GoogleGenerativeAI(apiKey);

  // DÙNG TÊN MODEL NÀY - KHÔNG THÊM LATEST, KHÔNG THÊM MODELS/
  // Đây là tên chuẩn nhất cho API hiện tại
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash" 
  });

  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  // Gộp tất cả yêu cầu vào một Prompt duy nhất (Bỏ systemInstruction tách biệt)
  const mainPrompt = `
Bạn là một chuyên gia số hóa toán học. Hãy gõ lại tài liệu từ hình ảnh theo các quy tắc:
1. Toán học: Bao bằng dấu $ (ví dụ: $x^2$, $ABC$).
2. Hệ phương trình: Dùng \\begin{cases}.
3. BBT: Dùng ký tự | và - để vẽ bảng, dùng \\nearrow và \\searrow.
4. Hình vẽ: Chèn [Có hình vẽ minh họa].
5. Chỉ gõ lại nội dung, bỏ qua Header/Footer.

Dữ liệu gốc bổ sung: ${textContext}

Trả về DUY NHẤT một mã JSON theo cấu trúc:
{
  "latex": "nội dung văn bản",
  "html": "nội dung bọc trong thẻ p"
}`;

  try {
    const result = await model.generateContent([mainPrompt, ...imageParts]);
    const response = await result.response;
    const output = response.text();

    // Làm sạch chuỗi nếu AI trả về có bọc dấu ```json
    const cleanJson = output.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson) as ConversionResult;
  } catch (error: any) {
    console.error("Lỗi chi tiết:", error);
    // Nếu vẫn 404, thử đổi model trong code sang "gemini-1.5-pro"
    throw new Error("Lỗi kết nối AI: " + (error.message || "Thầy hãy kiểm tra lại API Key"));
  }
};
