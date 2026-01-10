import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  // 1. Lấy API Key từ localStorage (Khách tự nhập) hoặc biến môi trường (Nếu có)
  const apiKey = localStorage.getItem('user_gemini_api_key') || import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("Vui lòng nhập API KEY của bạn trong phần Thiết lập để sử dụng.");
  }

  // 2. Khởi tạo AI với Key đã tìm được
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Sử dụng model mới nhất (Gemini 1.5 Flash hoặc Pro để hỗ trợ Schema và hình ảnh tốt nhất)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Hoặc "gemini-1.5-pro"
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          latex: { type: SchemaType.STRING },
          html: { type: SchemaType.STRING },
        },
        required: ["latex", "html"],
      },
      temperature: 0.1, // Giữ độ ổn định cao nhất cho định dạng toán học
    },
  });

  // 3. Chuẩn bị dữ liệu hình ảnh
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  // 4. Thiết lập Prompt (Giữ nguyên các quy tắc khắt khe của thầy)
  const prompt = `Bạn là một công cụ trích xuất và chuẩn hóa công thức toán học chuyên nghiệp. 
    NHIỆM VỤ: 
    1. Giữ nguyên 100% văn bản gốc, bao gồm cả các nhãn "Câu 1.", "Câu 2.", "Bài tập:", các dấu ngắt dòng (\\n), khoảng trắng và thứ tự các đoạn văn.
    2. CHỈ tìm và chuyển đổi các công thức toán học, biểu thức, biến số (x, y, f(x)...) sang định dạng LaTeX và bao bọc bởi duy nhất một cặp dấu $.
    3. KHÔNG được thêm bất kỳ văn bản giải thích nào, không được tóm tắt, không được thay đổi từ ngữ của người dùng.
    4. Nếu đầu vào có các thẻ HTML (như <p>, <br>, <b>, <table>), hãy giữ nguyên các thẻ đó ở trường "html".

    VÍ DỤ:
    Gốc: "Câu 1. Cho hàm số y = 2x + 1. Tính đạo hàm y'."
    Kết quả: "Câu 1. Cho hàm số $y = 2x + 1$. Tính đạo hàm $y'$."

    Nội dung cần xử lý:
    ${textContext}`;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as ConversionResult;
  } catch (error: any) {
    console.error("Gemini conversion error:", error);
    
    // Bắt lỗi quá hạn mức (Quota) để thông báo cho khách
    if (error.message?.includes("429")) {
      throw new Error("API KEY của bạn đã hết hạn mức sử dụng (Quota). Vui lòng thử lại sau hoặc dùng Key khác.");
    }
    if (error.message?.includes("401")) {
      throw new Error("API KEY không chính xác. Vui lòng kiểm tra lại trong phần Thiết lập.");
    }
    
    throw new Error("Lỗi khi kết nối với trí tuệ nhân tạo. Thầy hãy kiểm tra lại kết nối mạng hoặc API Key.");
  }
};
