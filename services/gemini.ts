import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConversionResult } from "../types"; // Nó dùng interface thầy vừa gửi ở đây

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = "",
  apiKey: string 
): Promise<ConversionResult> => {
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // ÉP dùng model flash bản ổn định nhất
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageParts = base64Images.map(base64 => ({
    inlineData: { mimeType: 'image/jpeg', data: base64.split(',')[1] || base64 }
  }));

  const prompt = `Bạn là chuyên gia toán học. Hãy gõ lại nội dung từ ảnh. 
  Quy tắc: Toán và Đỉnh dùng $...$, Độ dùng ^\\circ, Hệ phương trình dùng cases.
  Trả về duy nhất định dạng JSON như sau:
  {
    "latex": "nội dung latex ở đây",
    "html": "<p>nội dung html ở đây</p>"
  }`;

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text().replace(/```json|```/g, "").trim();

  // Chuyển đổi về đúng interface ConversionResult
  return JSON.parse(text) as ConversionResult;
};
