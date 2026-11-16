import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ServerEmailEngine,
  type EmailDispatchPayload,
} from "../../src/services/emailServer";

const basePayload: EmailDispatchPayload = {
  to: "Recipient@Example.com",
  subject: "Production contract",
  html: "<p>Hello</p>",
  fromName: "Signal",
  fromEmail: "sender@example.com",
  replyTo: "reply@example.com",
  headers: {
    "List-Unsubscribe": "<https://signal.example/unsubscribe/opaque-token>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
};

function response(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function setProvider(provider: string): void {
  vi.stubEnv("EMAIL_PROVIDER", provider);
  vi.stubEnv("FROM_EMAIL", "sender@example.com");
}

describe("ServerEmailEngine provider contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses SESv2 SendEmailCommand with credentials and RFC 8058 headers", async () => {
    setProvider("AMAZON_SES");
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "access-key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("AWS_SESSION_TOKEN", "session-token");

    let clientConfig: Record<string, unknown> | undefined;
    let command: SendEmailCommand | undefined;
    const engine = new ServerEmailEngine({
      createSESClient: (config) => {
        clientConfig = config as Record<string, unknown>;
        return {
          send: async (input) => {
            command = input;
            return { MessageId: "ses-message-id" };
          },
        };
      },
    });

    const result = await engine.send(basePayload);

    expect(result).toEqual({
      success: true,
      status: "ACCEPTED",
      provider: "AMAZON_SES",
      messageId: "ses-message-id",
    });
    expect(clientConfig).toMatchObject({
      region: "eu-central-1",
      credentials: {
        accessKeyId: "access-key",
        secretAccessKey: "secret-key",
        sessionToken: "session-token",
      },
    });
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command!.input).toMatchObject({
      FromEmailAddress: "Signal <sender@example.com>",
      Destination: { ToAddresses: ["recipient@example.com"] },
      ReplyToAddresses: ["reply@example.com"],
      Content: {
        Simple: {
          Subject: { Data: "Production contract", Charset: "UTF-8" },
          Body: { Html: { Data: "<p>Hello</p>", Charset: "UTF-8" } },
          Headers: [
            {
              Name: "List-Unsubscribe",
              Value: "<https://signal.example/unsubscribe/opaque-token>",
            },
            {
              Name: "List-Unsubscribe-Post",
              Value: "List-Unsubscribe=One-Click",
            },
          ],
        },
      },
    });
  });

  it("builds a TLS-enforced SMTP transport and returns the provider message ID", async () => {
    setProvider("SMTP");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "smtp-user");
    vi.stubEnv("SMTP_PASS", "smtp-pass");

    let transportConfig: Record<string, unknown> | undefined;
    let mailOptions: Record<string, unknown> | undefined;
    const engine = new ServerEmailEngine({
      createSMTPTransport: (config) => {
        transportConfig = config;
        return {
          sendMail: async (options) => {
            mailOptions = options;
            return { messageId: "smtp-message-id" };
          },
        };
      },
    });

    const result = await engine.send(basePayload);

    expect(result.status).toBe("ACCEPTED");
    expect(result.messageId).toBe("smtp-message-id");
    expect(transportConfig).toEqual({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "smtp-user", pass: "smtp-pass" },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    });
    expect(mailOptions).toMatchObject({
      from: { name: "Signal", address: "sender@example.com" },
      to: ["recipient@example.com"],
      replyTo: "reply@example.com",
      headers: basePayload.headers,
    });
  });

  it("captures SendGrid's real x-message-id and sends custom headers", async () => {
    setProvider("SENDGRID");
    vi.stubEnv("SENDGRID_API_KEY", "sendgrid-key");
    const fetchImpl = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      response(undefined, 202, { "x-message-id": "sendgrid-message-id" })
    );
    const engine = new ServerEmailEngine({ fetchImpl });

    const result = await engine.send(basePayload);

    expect(result).toMatchObject({
      success: true,
      status: "ACCEPTED",
      provider: "SENDGRID",
      messageId: "sendgrid-message-id",
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer sendgrid-key" });
    const body = JSON.parse(String(init?.body));
    expect(body.personalizations[0]).toMatchObject({
      to: [{ email: "recipient@example.com" }],
      headers: basePayload.headers,
    });
  });

  it("maps Resend's accepted ID and RFC 8058 headers", async () => {
    setProvider("RESEND");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        response({ id: "resend-message-id" })
    );
    const engine = new ServerEmailEngine({ fetchImpl });

    const result = await engine.send(basePayload);

    expect(result).toMatchObject({
      success: true,
      status: "ACCEPTED",
      provider: "RESEND",
      messageId: "resend-message-id",
    });
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      from: "Signal <sender@example.com>",
      to: ["recipient@example.com"],
      reply_to: "reply@example.com",
      headers: basePayload.headers,
    });
  });

  it("maps Mailgun custom headers to h: fields", async () => {
    setProvider("MAILGUN");
    vi.stubEnv("MAILGUN_API_KEY", "mailgun-key");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        response({ id: "mailgun-message-id" })
    );
    const engine = new ServerEmailEngine({ fetchImpl });

    const result = await engine.send(basePayload);

    expect(result).toMatchObject({
      success: true,
      status: "ACCEPTED",
      provider: "MAILGUN",
      messageId: "mailgun-message-id",
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
    const form = new URLSearchParams(String(init?.body));
    expect(form.get("h:List-Unsubscribe")).toBe(
      "<https://signal.example/unsubscribe/opaque-token>"
    );
    expect(form.get("h:List-Unsubscribe-Post")).toBe("List-Unsubscribe=One-Click");
    expect(form.get("h:Reply-To")).toBe("reply@example.com");
  });

  it("hard-fails missing provider credentials without calling the network", async () => {
    setProvider("RESEND");
    const fetchImpl = vi.fn();
    const engine = new ServerEmailEngine({ fetchImpl });

    const result = await engine.send(basePayload);

    expect(result).toMatchObject({
      success: false,
      status: "FAILED",
      provider: "RESEND",
      error: "RESEND_API_KEY is required for the configured email provider",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsupported providers and invalid recipient input", async () => {
    setProvider("UNKNOWN");
    const engine = new ServerEmailEngine({ fetchImpl: vi.fn() });
    expect(await engine.send(basePayload)).toMatchObject({
      success: false,
      status: "FAILED",
      error: "Unsupported EMAIL_PROVIDER: UNKNOWN",
    });

    setProvider("RESEND");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    expect(await engine.send({ ...basePayload, to: "not-an-email" })).toMatchObject({
      success: false,
      status: "FAILED",
      error: "All recipient email addresses must be valid",
    });
  });

  it("rejects incomplete or injectable RFC 8058 headers", async () => {
    setProvider("RESEND");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    const fetchImpl = vi.fn();
    const engine = new ServerEmailEngine({ fetchImpl });

    const incomplete = await engine.send({
      ...basePayload,
      headers: { "List-Unsubscribe": "<https://signal.example/u/token>" },
    });
    expect(incomplete).toMatchObject({
      success: false,
      error: "RFC 8058 requires both List-Unsubscribe headers",
    });

    const injected = await engine.send({
      ...basePayload,
      headers: {
        "List-Unsubscribe": "<https://signal.example/u/token>\r\nBcc: attacker@example.com",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    expect(injected).toMatchObject({
      success: false,
      error: "List-Unsubscribe must not contain line breaks",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails accepted responses that do not contain a provider message ID", async () => {
    setProvider("SENDGRID");
    vi.stubEnv("SENDGRID_API_KEY", "sendgrid-key");
    const engine = new ServerEmailEngine({
      fetchImpl: vi.fn(async () => response(undefined, 202)),
    });

    expect(await engine.send(basePayload)).toMatchObject({
      success: false,
      status: "FAILED",
      provider: "SENDGRID",
      error: "SENDGRID accepted the request without returning a message ID",
    });
  });
});
