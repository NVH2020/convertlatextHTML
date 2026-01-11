
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [...imageParts, { text: `Dữ liệu gốc:\n${textContext}` }] },
    config: {
      systemInstruction: `Bạn là một chuyên gia số hóa tài liệu toán học chuyên nghiệp. Hãy gõ lại tài liệu từ hình ảnh/văn bản cung cấp theo các quy tắc nghiêm ngặt sau:

1. ĐỊNH DẠNG TOÁN HỌC:
   - TẤT CẢ các công thức, biến số (x, y...), và ĐỈNH HÌNH HỌC (A, B, C, ABC, S.ABCD) PHẢI nằm trong cặp dấu $ đơn (ví dụ: $x^2 + 1$, $ABC$, $S.ABCD$).
   - Ký tự trong cặp dấu $ phải được hiểu là in nghiêng trong LaTeX.
   - Sử dụng \\begin{cases} ... \\end{cases} cho các hệ phương trình hoặc hệ điều kiện.
   - Ký hiệu ĐỘ sử dụng ^\\circ (ví dụ: $60^\\circ$).

2. BẢNG BIẾN THIÊN (BBT) - QUY TẮC MỚI:
   - KHÔNG dùng mã \\begin{tabular} và KHÔNG dùng định dạng bảng Markdown (dấu --- bọc dưới tiêu đề).
   - Hãy trình bày BBT dưới dạng bảng văn bản thủ công bằng các ký tự gạch đứng | và gạch ngang -.
   - Sử dụng | để phân cách các cột dữ liệu rõ ràng.
   - Dùng mũi tên: \\nearrow (lên) và \\searrow (xuống).
   - Ví dụ cách trình bày BBT:
     x  | -\infty      0      +\infty
     ---|---------------------------
     y' |      +      |      -
     ---|---------------------------
     y  | -\infty \nearrow 1 \searrow -\infty

3. HÌNH VẼ MINH HỌA:
   - Nếu trong câu có hình vẽ, đồ thị hoặc sơ đồ, hãy chèn ngay đoạn: [Có hình vẽ minh họa] vào đúng vị trí trong câu đó.

4. CHỈ GÕ LẠI (STRICT RETYPING):
   - Giữ nguyên định dạng "Câu 1.", "Câu 2.", và các phương án "A.", "B.", "C.", "D.".
   - Tuyệt đối bỏ qua phần Header (Tên trường, Sở, Mã đề) và Footer (Số trang, chữ "Hết").
   - Không thêm lời dẫn, không giải thích, chỉ gõ lại nội dung nguyên bản.

Trả về kết quả dưới dạng JSON:
{
  "latex": "Nội dung văn bản gõ lại hoàn chỉnh",
  "html": "Nội dung văn bản tương ứng bọc trong thẻ <p>"
}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          latex: { type: Type.STRING },
          html: { type: Type.STRING },
        },
        required: ["latex", "html"]
      },
      temperature: 0,
    }
  });

  try {
    return JSON.parse(response.text || "{}") as ConversionResult;
  } catch (error) {
    console.error("Lỗi phân tích JSON:", error);
    throw new Error("Không thể xử lý tài liệu. Vui lòng thử lại với hình ảnh rõ nét hơn.");
  }
};
