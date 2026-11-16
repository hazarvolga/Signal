import {
  SendEmailCommand,
  SESv2Client,
  type SESv2ClientConfig,
} from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";

export type EmailProviderType = "RESEND" | "SENDGRID" | "MAILGUN" | "AMAZON_SES" | "SMTP";
export type EmailAcceptanceStatus = "ACCEPTED" | "FAILED";

export interface EmailCustomHeaders {
  "List-Unsubscribe"?: string;
  "List-Unsubscribe-Post"?: string;
}

export interface EmailDispatchPayload {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  headers?: EmailCustomHeaders;
  campaignId?: string;
  contactId?: string;
  organizationId?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  status: EmailAcceptanceStatus;
  messageId?: string;
  provider: EmailProviderType;
  error?: string;
}

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type SESClientLike = { send(command: SendEmailCommand): Promise<{ MessageId?: string }> };
type SMTPTransportLike = {
  sendMail(options: Record<string, unknown>): Promise<{ messageId?: string }>;
};

export interface EmailEngineDependencies {
  fetchImpl?: FetchImplementation;
  createSESClient?: (config: SESv2ClientConfig) => SESClientLike;
  createSMTPTransport?: (options: Record<string, unknown>) => SMTPTransportLike;
}

type NormalizedPayload = EmailDispatchPayload & {
  to: string[];
  fromName: string;
  fromEmail: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_PROVIDERS = new Set<EmailProviderType>([
  "RESEND",
  "SENDGRID",
  "MAILGUN",
  "AMAZON_SES",
  "SMTP",
]);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the configured email provider`);
  return value;
}

function providerFromEnvironment(): EmailProviderType {
  const value = process.env.EMAIL_PROVIDER?.trim().toUpperCase();
  if (!value) throw new Error("EMAIL_PROVIDER is required");
  if (!SUPPORTED_PROVIDERS.has(value as EmailProviderType)) {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${value}`);
  }
  return value as EmailProviderType;
}

function validateHeaderValue(name: string, value: string): void {
  if (/[\r\n]/.test(value)) throw new Error(`${name} must not contain line breaks`);
}

function normalizePayload(payload: EmailDispatchPayload): NormalizedPayload {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map((email) => email?.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0) throw new Error("At least one recipient is required");
  if (recipients.length > 50) throw new Error("A single provider request supports at most 50 recipients");
  if (recipients.some((email) => !EMAIL_PATTERN.test(email))) {
    throw new Error("All recipient email addresses must be valid");
  }

  const subject = payload.subject?.trim();
  if (!subject) throw new Error("Email subject is required");
  if (subject.length > 998 || /[\r\n]/.test(subject)) {
    throw new Error("Email subject is invalid");
  }
  if (!payload.html?.trim()) throw new Error("Email HTML content is required");

  const fromEmail = (payload.fromEmail || process.env.FROM_EMAIL || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(fromEmail)) {
    throw new Error("A valid FROM_EMAIL or payload.fromEmail is required");
  }

  const fromName = (payload.fromName || process.env.FROM_NAME || "Signal Campaign").trim();
  if (!fromName || /[\r\n]/.test(fromName)) throw new Error("Email fromName is invalid");

  if (payload.replyTo && !EMAIL_PATTERN.test(payload.replyTo.trim().toLowerCase())) {
    throw new Error("replyTo must be a valid email address");
  }

  const listUnsubscribe = payload.headers?.["List-Unsubscribe"];
  const listUnsubscribePost = payload.headers?.["List-Unsubscribe-Post"];
  if (listUnsubscribe || listUnsubscribePost) {
    if (!listUnsubscribe || !listUnsubscribePost) {
      throw new Error("RFC 8058 requires both List-Unsubscribe headers");
    }
    validateHeaderValue("List-Unsubscribe", listUnsubscribe);
    validateHeaderValue("List-Unsubscribe-Post", listUnsubscribePost);
    if (!/<https:\/\/[^>\s]+>/i.test(listUnsubscribe)) {
      throw new Error("List-Unsubscribe must contain an HTTPS URI");
    }
    if (listUnsubscribePost !== "List-Unsubscribe=One-Click") {
      throw new Error("List-Unsubscribe-Post must equal List-Unsubscribe=One-Click");
    }
  }

  return {
    ...payload,
    to: recipients,
    subject,
    fromEmail,
    fromName,
    replyTo: payload.replyTo?.trim().toLowerCase(),
  };
}

function customHeaders(payload: NormalizedPayload): Record<string, string> | undefined {
  if (!payload.headers) return undefined;
  return Object.fromEntries(
    Object.entries(payload.headers).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

export class ServerEmailEngine {
  private readonly fetchImpl: FetchImplementation;
  private readonly createSESClient: NonNullable<EmailEngineDependencies["createSESClient"]>;
  private readonly createSMTPTransport: NonNullable<EmailEngineDependencies["createSMTPTransport"]>;

  constructor(dependencies: EmailEngineDependencies = {}) {
    this.fetchImpl = dependencies.fetchImpl || globalThis.fetch.bind(globalThis);
    this.createSESClient =
      dependencies.createSESClient || ((config) => new SESv2Client(config) as SESClientLike);
    this.createSMTPTransport =
      dependencies.createSMTPTransport ||
      ((options) => nodemailer.createTransport(options) as unknown as SMTPTransportLike);
  }

  /**
   * Sends a message to a provider. A successful response means only that the
   * provider accepted the message; delivery is recorded later from a verified webhook.
   */
  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    let provider: EmailProviderType = "RESEND";

    try {
      provider = providerFromEnvironment();
      const normalized = normalizePayload(payload);

      switch (provider) {
        case "AMAZON_SES":
          return await this.sendViaAmazonSES(normalized);
        case "SENDGRID":
          return await this.sendViaSendGrid(normalized);
        case "MAILGUN":
          return await this.sendViaMailgun(normalized);
        case "SMTP":
          return await this.sendViaSMTP(normalized);
        case "RESEND":
          return await this.sendViaResend(normalized);
      }
    } catch (err) {
      return {
        success: false,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        provider,
      };
    }
  }

  private accepted(provider: EmailProviderType, messageId: string | undefined): EmailDispatchResult {
    if (!messageId?.trim()) {
      throw new Error(`${provider} accepted the request without returning a message ID`);
    }
    return { success: true, status: "ACCEPTED", messageId, provider };
  }

  private async sendViaResend(payload: NormalizedPayload): Promise<EmailDispatchResult> {
    const apiKey = requiredEnv("RESEND_API_KEY");
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${payload.fromName} <${payload.fromEmail}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
        headers: customHeaders(payload),
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message || `Resend failed with HTTP ${res.status}`);
    return this.accepted("RESEND", data.id);
  }

  private async sendViaSendGrid(payload: NormalizedPayload): Promise<EmailDispatchResult> {
    const apiKey = requiredEnv("SENDGRID_API_KEY");
    const res = await this.fetchImpl("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: payload.to.map((email) => ({ email })),
            headers: customHeaders(payload),
          },
        ],
        from: { email: payload.fromEmail, name: payload.fromName },
        reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
        subject: payload.subject,
        content: [{ type: "text/html", value: payload.html }],
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `SendGrid failed with HTTP ${res.status}`);
    }
    return this.accepted("SENDGRID", res.headers.get("x-message-id") || undefined);
  }

  private async sendViaMailgun(payload: NormalizedPayload): Promise<EmailDispatchResult> {
    const apiKey = requiredEnv("MAILGUN_API_KEY");
    const domain = requiredEnv("MAILGUN_DOMAIN");
    const formData = new URLSearchParams();
    formData.append("from", `${payload.fromName} <${payload.fromEmail}>`);
    payload.to.forEach((recipient) => formData.append("to", recipient));
    formData.append("subject", payload.subject);
    formData.append("html", payload.html);
    if (payload.replyTo) formData.append("h:Reply-To", payload.replyTo);
    for (const [name, value] of Object.entries(customHeaders(payload) || {})) {
      formData.append(`h:${name}`, value);
    }

    const res = await this.fetchImpl(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message || `Mailgun failed with HTTP ${res.status}`);
    return this.accepted("MAILGUN", data.id);
  }

  private async sendViaAmazonSES(payload: NormalizedPayload): Promise<EmailDispatchResult> {
    const region = requiredEnv("AWS_REGION");
    const accessKeyId = requiredEnv("AWS_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("AWS_SECRET_ACCESS_KEY");
    const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
    const client = this.createSESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });

    const headers = Object.entries(customHeaders(payload) || {}).map(([Name, Value]) => ({
      Name,
      Value,
    }));
    const response = await client.send(
      new SendEmailCommand({
        FromEmailAddress: `${payload.fromName} <${payload.fromEmail}>`,
        Destination: { ToAddresses: payload.to },
        ReplyToAddresses: payload.replyTo ? [payload.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: payload.subject, Charset: "UTF-8" },
            Body: { Html: { Data: payload.html, Charset: "UTF-8" } },
            Headers: headers.length > 0 ? headers : undefined,
          },
        },
      })
    );
    return this.accepted("AMAZON_SES", response.MessageId);
  }

  private async sendViaSMTP(payload: NormalizedPayload): Promise<EmailDispatchResult> {
    const host = requiredEnv("SMTP_HOST");
    const portText = requiredEnv("SMTP_PORT");
    const user = requiredEnv("SMTP_USER");
    const pass = requiredEnv("SMTP_PASS");
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_PORT must be an integer between 1 and 65535");
    }

    const transport = this.createSMTPTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    });
    const response = await transport.sendMail({
      from: { name: payload.fromName, address: payload.fromEmail },
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      headers: customHeaders(payload),
    });
    return this.accepted("SMTP", response.messageId);
  }

}

export const serverEmailEngine = new ServerEmailEngine();
