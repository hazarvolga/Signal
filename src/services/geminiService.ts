import { GoogleGenAI, Type } from "@google/genai";
import { guardInput } from "./aiGuard";
import { requireAiUsageContext } from "./aiUsageContext";
import { completeAiUsage, failAiUsage, reserveAiUsage } from "./aiUsageLedger";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type GeminiModel = "gemini-3-flash-preview" | "gemini-2.5-flash-image";

async function generateTracked(
  feature: string,
  model: GeminiModel,
  request: Parameters<typeof ai.models.generateContent>[0],
  kind: "text" | "image" = "text"
) {
  const { organizationId } = requireAiUsageContext();
  const ledger = await reserveAiUsage({ organizationId, feature, model, kind });
  try {
    const response = await ai.models.generateContent(request);
    await completeAiUsage({
      id: ledger.id,
      model,
      usage: response.usageMetadata,
      imageCount: kind === "image" ? 1 : 0,
      startedAt: ledger.startedAt,
    });
    return response;
  } catch (error) {
    await failAiUsage(ledger.id, ledger.startedAt, error);
    throw error;
  }
}

function check(inputs: string[]): void {
  for (const input of inputs) {
    const result = guardInput(input);
    if (!result.safe) {
      throw new Error(`AI guard rejected input: ${result.reason}`);
    }
  }
}

export const geminiService = {
  async generateImage(prompt: string, aspectRatio: string): Promise<string> {
    check([prompt, aspectRatio]);
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const allowedRatios = new Set(["1:1", "16:9", "9:16", "4:3", "3:4"]);
    if (!allowedRatios.has(aspectRatio)) {
      throw new Error("Unsupported image aspect ratio");
    }

    const response = await generateTracked(
      "generate_image",
      "gemini-2.5-flash-image",
      {
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any } },
      },
      "image"
    );
    const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
    if (!imagePart?.inlineData?.data) {
      throw new Error("AI provider returned no image");
    }
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
  },

  async generateSubjectLines(topic: string): Promise<string[]> {
    check([topic]);
    const response = await generateTracked("subject_lines", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Generate 3 professional and engaging email subject lines for a campaign about: ${topic}. 
      The tone should be editorial, authoritative, and sophisticated, matching a high-end newsroom aesthetic.
      Return the results as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    try {
      const text = response.text || "[]";
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return [];
    }
  },

  async optimizePreviewText(subject: string, content: string): Promise<string> {
    check([subject, content]);
    const response = await generateTracked("preview_text", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Given the subject line: "${subject}" and the email content summary: "${content.substring(0, 500)}", 
      generate a compelling preview text (max 150 characters) that complements the subject and encourages opens.
      Return only the preview text string.`,
    });
    return response.text?.trim() || "";
  },

  async checkSpamScore(
    subject: string,
    content: string
  ): Promise<{ score: number; reasons: string[] }> {
    check([subject, content]);
    const response = await generateTracked("spam_score", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Analyze the following email for spam triggers:
      Subject: ${subject}
      Content: ${content.substring(0, 1000)}
      
      Provide a spam score from 0 to 100 (where 0 is clean and 100 is definitely spam) and a list of reasons for the score.
      Return as JSON with "score" (number) and "reasons" (array of strings).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "reasons"],
        },
      },
    });
    try {
      return JSON.parse(response.text || '{"score": 0, "reasons": []}');
    } catch (e) {
      return { score: 0, reasons: [] };
    }
  },

  async adjustTone(content: string, targetTone: string): Promise<string> {
    check([content, targetTone]);
    const response = await generateTracked("adjust_tone", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following email content to match a "${targetTone}" tone. 
      Maintain the core message but adjust the vocabulary and sentence structure.
      Content: ${content}
      
      Return only the rewritten content.`,
    });
    return response.text?.trim() || content;
  },

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    check([content, targetLanguage]);
    const response = await generateTracked("translate_content", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Translate the following email content into ${targetLanguage}. 
      Ensure the translation is natural, professional, and culturally appropriate.
      Content: ${content}
      
      Return only the translated content.`,
    });
    return response.text?.trim() || content;
  },

  async predictBestSendTime(
    topic: string,
    engagementData?: any,
    timezone?: string
  ): Promise<{ hour: number; reason: string }> {
    check([topic]);
    const dataContext = engagementData
      ? `Here is the historical engagement data (opens by hour in UTC): ${JSON.stringify(engagementData)}`
      : "No historical data available.";
    const tzContext = timezone
      ? `The user's target timezone is ${timezone}.`
      : "The target timezone is UTC.";
    const response = await generateTracked("predict_send_time", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Based on the topic "${topic}" and the following context: ${dataContext}. ${tzContext}
      What is the statistically best hour of the day (0-23) to send this email for maximum engagement in the target timezone?
      If historical data is provided, prioritize it (remember it is in UTC, so convert it to the target timezone to find the best hour). If not, use general industry trends for this topic in the target timezone.
      Return as JSON with "hour" (number) and "reason" (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hour: { type: Type.NUMBER },
            reason: { type: Type.STRING },
          },
          required: ["hour", "reason"],
        },
      },
    });
    try {
      return JSON.parse(response.text || '{"hour": 9, "reason": "Defaulting to 9 AM"}');
    } catch (e) {
      return { hour: 9, reason: "Error predicting time" };
    }
  },

  async generateFullContent(
    brief: string,
    tone: string
  ): Promise<{ subject: string; content: string }> {
    check([brief, tone]);
    const response = await generateTracked("generate_content", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Generate a complete professional email campaign based on this brief: "${brief}".
      The tone should be "${tone}".
      The output should be a JSON object with "subject" (string) and "content" (HTML string).
      Use clean, semantic HTML for the content, suitable for an email newsletter.
      The style should be sophisticated, editorial, and authoritative.
      Include a headline, body paragraphs, and a clear call to action.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ["subject", "content"],
        },
      },
    });
    try {
      return JSON.parse(response.text || '{"subject": "", "content": ""}');
    } catch (e) {
      return { subject: "", content: "" };
    }
  },

  async predictChurnRisk(
    contactData: any,
    audienceContext?: any
  ): Promise<{ riskLevel: "LOW" | "MEDIUM" | "HIGH"; probability: number; reasons: string[] }> {
    check([JSON.stringify(contactData), audienceContext ? JSON.stringify(audienceContext) : ""]);
    const context = audienceContext ? `Audience context: ${JSON.stringify(audienceContext)}` : "";
    const response = await generateTracked("predict_churn", "gemini-3-flash-preview", {
      model: "gemini-3-flash-preview",
      contents: `Analyze the following contact engagement data and predict their churn risk:
      Contact Data: ${JSON.stringify(contactData)}
      ${context}
      
      Provide a risk level (LOW, MEDIUM, HIGH), a probability (0-1), and a list of reasons.
      Consider engagement score, recent activity, and status.
      Return as JSON with "riskLevel", "probability", and "reasons".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            probability: { type: Type.NUMBER },
            reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["riskLevel", "probability", "reasons"],
        },
      },
    });
    try {
      return JSON.parse(response.text || '{"riskLevel": "LOW", "probability": 0, "reasons": []}');
    } catch (e) {
      return { riskLevel: "LOW", probability: 0, reasons: [] };
    }
  },
};
