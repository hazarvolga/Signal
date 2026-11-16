/**
 * Multi-LLM Provider Engine for Signal
 * Supports: Google Gemini, OpenAI, Anthropic Claude, Ollama (Local), & Custom OpenAI-compatible endpoints
 */
import { apiFetch } from "../api";

export type AIProviderType = "GEMINI" | "OPENAI" | "CLAUDE" | "OLLAMA" | "CUSTOM";

export interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string; // For Ollama or Custom OpenAI-compatible endpoints
}

export interface AISubjectLineOptions {
  topic: string;
  tone?: string;
  count?: number;
}

export interface AISpamAnalysis {
  score: number; // 0 (clean) to 100 (spam)
  reasons: string[];
}

export class AIService {
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    this.config = {
      provider: config?.provider || "GEMINI",
      apiKey: "",
      model: config?.model || "gemini-2.5-flash",
      baseUrl: config?.baseUrl,
    };
  }

  public updateConfig(newConfig: Partial<AIConfig>) {
    const { apiKey: _apiKey, ...safeConfig } = newConfig;
    this.config = { ...this.config, ...safeConfig, apiKey: "" };
  }

  public getConfig(): AIConfig {
    return this.config;
  }

  /**
   * Generate high-converting email subject lines using active AI Provider
   */
  async generateSubjectLines(options: AISubjectLineOptions): Promise<string[]> {
    const prompt = `Generate ${options.count || 3} highly engaging, high-open-rate email subject lines for a campaign about: "${options.topic}". 
Tone: ${options.tone || "professional, editorial, and compelling"}.
Return ONLY a raw JSON array of strings without markdown formatting. Example: ["Subject 1", "Subject 2", "Subject 3"]`;

    const rawText = await this.callActiveProvider(prompt);
    try {
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [rawText];
    } catch {
      return [rawText.trim()];
    }
  }

  /**
   * Analyze email for spam score & trigger keywords
   */
  async checkSpamScore(subject: string, content: string): Promise<AISpamAnalysis> {
    const prompt = `Analyze this email for spam trigger words, clickbait, or deliverability risks:
Subject: ${subject}
Content: ${content.substring(0, 1000)}

Return JSON with "score" (0 clean to 100 spam) and "reasons" (array of warning strings). Example: {"score": 15, "reasons": ["Avoid ALL CAPS", "Exclamation marks"]}`;

    const rawText = await this.callActiveProvider(prompt);
    try {
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch {
      return { score: 10, reasons: ["Could not parse detailed AI spam breakdown"] };
    }
  }

  /**
   * Adjust email tone (Professional, Urgent, Casual, Friendly, Sales)
   */
  async adjustTone(content: string, targetTone: string): Promise<string> {
    const prompt = `Rewrite this email content to match a "${targetTone}" tone. Keep all key details intact:
"${content}"
Return ONLY the rewritten email copy.`;

    return (await this.callActiveProvider(prompt)).trim();
  }

  /**
   * Translate email content to any target language
   */
  async translateContent(content: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate this email content accurately to ${targetLanguage}. Maintain original formatting:
"${content}"
Return ONLY the translated content.`;

    return (await this.callActiveProvider(prompt)).trim();
  }

  /**
   * Core router calling the configured AI provider
   */
  private async callActiveProvider(prompt: string): Promise<string> {
    const res = await apiFetch("/api/ai/generate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: prompt, tone: "professional" }),
    });
    if (!res.ok) throw new Error("AI provider request failed");
    const data = await res.json();
    return data.content || data.html || "";
  }
}

export const defaultAIService = new AIService();
