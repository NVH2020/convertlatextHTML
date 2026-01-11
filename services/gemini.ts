
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
    contents: { parts: [...imageParts, { text: `Dữ liệu gốc cần chuyển đổi:\n${textContext}` }] },
    config: {
      systemInstruction: `Bạn là một trợ lý số hóa tài liệu toán học cực kỳ chính xác và tuân thủ định dạng. Nhiệm vụ của bạn là gõ lại tài liệu từ hình ảnh/văn bản cung cấp.

QUY TẮC BẮT BUỘC:
1. ĐỊNH DẠNG CÔNG THỨC: 
   - Sử dụng DUY NHẤT cặp dấu $$ ... $$ để bao bọc tất cả các ký hiệu toán học, biến số, tên điểm, hình học và biểu thức (ví dụ: $$x$$, $$ABC$$, $$f(x) = x^2$$).
   - KHÔNG sử dụng \\( ... \\) hay $ ... $.
   - Các chữ cái trong $$ tự động được LaTeX hiểu là in nghiêng, hãy gõ đúng mã LaTeX.

2. VĂN BẢN TIẾNG VIỆT:
   - CHỈ GÕ LẠI Y HỆT những gì có trong tài liệu. 
   - TUYỆT ĐỐI KHÔNG thêm lời dẫn, không giải thích, không tóm tắt, không sửa câu chữ của người dùng.
   - Giữ nguyên các nhãn "Câu 1.", "Câu 2.", "Lời giải:", "Đáp án:".

3. BẢNG BIỂU (TABLE):
   - Chuyển đổi bảng dữ liệu sang môi trường \\begin{tabular} ... \\end{tabular}.

4. BẢNG BIẾN THIÊN (VARIATION TABLES):
   - Chuyển bảng biến thiên thành bảng LaTeX đơn giản.
   - Sử dụng các mũi tên: \\uparrow, \\downarrow, \\nearrow, \\searrow để mô tả chiều biến thiên.

5. LỌC DỮ LIỆU:
   - Loại bỏ các thông tin thừa không thuộc nội dung đề bài như Header (Tên trường, Sở), Footer (Số trang).

Trả về định dạng JSON:
{
  "latex": "Văn bản gõ lại hoàn chỉnh với các công thức đặt trong $$",
  "html": "Văn bản đã được định dạng cơ bản với thẻ <p> để giữ cấu trúc xuống dòng"
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
    throw new Error("Mô hình gặp khó khăn khi xử lý cấu trúc này. Vui lòng kiểm tra lại file.");
  }
};
