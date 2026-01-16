import { GoogleGenerativeAI } from "@google/generative-ai"; // Đảm bảo dùng đúng thư viện chính thức
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = "",
  apiKey: string // THÊM THAM SỐ NÀY
): Promise<ConversionResult> => {
  
  // Khởi tạo AI bằng API Key người dùng cung cấp từ App.tsx
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Sử dụng model 1.5-flash để tốc độ nhanh và ổn định nhất
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
  });

  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const prompt = `Dữ liệu gốc:\n${textContext}`;

  const result = await model.generateContent({
    contents: [{ 
        role: "user", 
        parts: [...imageParts, { text: prompt }] 
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
    systemInstruction: `Bạn là một chuyên gia số hóa tài liệu toán học chuyên nghiệp. Hãy gõ lại tài liệu từ hình ảnh/văn bản cung cấp theo các quy tắc nghiêm ngặt sau:

1. ĐỊNH DẠNG TOÁN HỌC:
   - TẤT CẢ các công thức, biến số (x, y...), và ĐỈNH HÌNH HỌC (A, B, C, ABC, S.ABCD) PHẢI nằm trong cặp dấu $ đơn (ví dụ: $x^2 + 1$, $ABC$, $S.ABCD$).
   - Sử dụng \\begin{cases} ... \\end{cases} cho các hệ phương trình hoặc hệ điều kiện.
   - Ký hiệu ĐỘ sử dụng ^\\circ (ví dụ: $60^\\circ$).

2. BẢNG BIẾN THIÊN (BBT):
   - KHÔNG dùng mã \\begin{tabular} và KHÔNG dùng định dạng bảng Markdown.
   - Hãy trình bày BBT dưới dạng bảng văn bản thủ công bằng các ký tự gạch đứng | và gạch ngang -.
   - Sử dụng mũi tên: \\nearrow (lên) và \\searrow (xuống).
   - Ví dụ:
     x  | -\\infty      0      +\\infty
     ---|---------------------------
     y' |      +      |      -
     ---|---------------------------
     y  | -\\infty \\nearrow 1 \\searrow -\\infty

3. HÌNH VẼ MINH HỌA:
   - Nếu có hình vẽ, đồ thị, hãy chèn: [Có hình vẽ minh họa] vào đúng vị trí.

4. CHỈ GÕ LẠI (STRICT RETYPING):
   - Giữ nguyên "Câu 1.", "Câu 2.", và các phương án "A.", "B.", "C.", "D.".
   - Bỏ qua Header (Tên trường, mã đề) và Footer hoàn toàn.

Trả về kết quả JSON:
{
  "latex": "Văn bản gõ lại hoàn chỉnh",
  "html": "Văn bản bọc trong thẻ <p>"
}`,
  });

  const response = await result.response;
  const output = response.text();

  try {
    return JSON.parse(output) as ConversionResult;
  } catch (error) {
    console.error("Lỗi phân tích JSON:", error);
    throw new Error("Không thể xử lý tài liệu. Hãy đảm bảo API Key chính xác và hình ảnh rõ nét.");
  }
};
