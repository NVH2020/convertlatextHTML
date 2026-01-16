import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = "",
  apiKey: string 
): Promise<ConversionResult> => {
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  // PROMPT ĐẦY ĐỦ CÁC QUY TẮC CỦA THẦY
  const prompt = `Bạn là một chuyên gia số hóa toán học. Hãy gõ lại tài liệu từ hình ảnh theo các quy tắc nghiêm ngặt:
  1. Toán học: Tất cả công thức, biến số, đỉnh hình học PHẢI bao bằng dấu $ (ví dụ: $x^2$, $ABC$).
  2. Hệ phương trình: Sử dụng \\begin{cases} ... \\end{cases}.
  3. ĐƠN VỊ ĐỘ: Sử dụng ký hiệu ^\\circ (ví dụ: $60^\\circ$, $90^\\circ$).
  4. BẢNG BIẾN THIÊN: Dùng ký tự | và - để vẽ bảng thủ công, dùng mũi tên \\nearrow và \\searrow.
  5. Hình vẽ: Chèn [Có hình vẽ minh họa] vào vị trí tương ứng.
  6. Loại bỏ hoàn toàn Header/Footer (tên trường, số trang).

  Dữ liệu gốc bổ sung: ${textContext}

  Trả về DUY NHẤT mã JSON: {"latex": "nội dung văn bản gõ lại", "html": "nội dung bọc trong thẻ p"}`;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson) as ConversionResult;

  } catch (error: any) {
    console.error("Lỗi:", error);
    // Nếu vẫn lỗi 404, thầy hãy kiểm tra xem API Key đã được kích hoạt trong AI Studio chưa
    throw new Error(`Lỗi kết nối AI: ${error.message}`);
  }
};
