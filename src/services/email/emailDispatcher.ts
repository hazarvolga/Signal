/**
 * Multi-Provider Bulk & Transactional Email Dispatcher for Signal
 * Supports: Resend, SendGrid, Mailgun, Amazon SES, and Custom SMTP
 */
import { apiFetch } from "../api";

export type EmailProviderType = "RESEND" | "SENDGRID" | "MAILGUN" | "AMAZON_SES" | "SMTP";

export interface EmailProviderConfig {
  provider: EmailProviderType;
  apiKey?: string;
  domain?: string; // Required for Mailgun
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailDispatchOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export class EmailDispatcher {
  private config: EmailProviderConfig;

  constructor(config?: Partial<EmailProviderConfig>) {
    this.config = {
      provider: config?.provider || "AMAZON_SES",
      fromName: config?.fromName || "Signal Campaign",
      fromEmail: config?.fromEmail || "",
    };
  }

  public updateConfig(newConfig: Partial<EmailProviderConfig>) {
    const { apiKey: _apiKey, smtpPass: _smtpPass, ...safeConfig } = newConfig;
    this.config = { ...this.config, ...safeConfig, apiKey: undefined, smtpPass: undefined };
  }

  public getConfig(): EmailProviderConfig {
    return this.config;
  }

  /**
   * Dispatch campaign or transactional email securely via backend API
   */
  async sendEmail(options: EmailDispatchOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { fromName, fromEmail } = this.config;

    try {
      const res = await apiFetch("/api/email/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          replyTo: options.replyTo,
          fromName,
          fromEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Server email dispatch failed");
      }

      return { success: true, messageId: data.messageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}

export const defaultEmailDispatcher = new EmailDispatcher();
