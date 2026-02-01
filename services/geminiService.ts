import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Singleton instance management for chat sessions
let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getGenAI = (): GoogleGenAI => {
  if (!genAI) {
    if (!process.env.API_KEY) {
      console.error("API Key is missing");
      throw new Error("API Key is missing");
    }
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const initializeChat = (systemInstruction?: string) => {
  const ai = getGenAI();
  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction || "Bạn là một trợ lý AI hữu ích, chuyên nghiệp trong môi trường doanh nghiệp. Hãy trả lời ngắn gọn, súc tích và hỗ trợ người dùng bằng Tiếng Việt.",
    },
  });
  return chatSession;
};

export const sendMessageStream = async function* (message: string) {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  try {
    const responseStream = await chatSession.sendMessageStream({ message });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    yield "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.";
  }
};

export const resetChat = () => {
  chatSession = null;
};