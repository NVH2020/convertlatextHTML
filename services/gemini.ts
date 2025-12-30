
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResult } from "../types";

export const convertToLatexHtml = async (
  base64Images: string[],
  textContext: string = ""
): Promise<ConversionResult> => {
  // Tạo instance mới mỗi lần gọi để đảm bảo lấy đúng API Key hiện tại
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Sử dụng Gemini 3 Flash cho tốc độ xử lý nhanh và độ tin cậy cao
  const modelName = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1] || base64
    }
  }));

  const textPart = {
    text: `You are a professional document converter. I will provide you with images of document pages.
    Your task is to:
    1. Extract all text, formulas, and describe images/tables accurately.
    2. Convert the entire content into both LaTeX and clean semantic HTML formats.
    3. Ensure math formulas are properly formatted in LaTeX ($ and $$) and standard HTML (using simple math markup or clean text).
    4. If there are images in the source, insert placeholders like [IMAGE: description] in LaTeX and <figure><img alt="description"><figcaption>description</figcaption></figure> in HTML.
    
    Context from text extraction: ${textContext}
    
    Return the response strictly as a JSON object with two fields: "latex" and "html".`
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
          required: ["latex", "html"],
          propertyOrdering: ["latex", "html"]
        }
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText) as ConversionResult;
  } catch (error: any) {
    console.error("Gemini conversion error:", error);
    throw error;
  }
};
