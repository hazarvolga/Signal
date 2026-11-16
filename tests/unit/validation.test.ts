import { describe, it, expect } from "vitest";
import {
  LoginSchema,
  ContactCreateSchema,
  CampaignCreateSchema,
  AISubjectLinesSchema,
  AISpamScoreSchema,
  validateBody,
} from "../../src/lib/schemas";
import type { Request, Response, NextFunction } from "express";
import { vi } from "vitest";
import { ScoringEngine, type ValidationDetails } from "../../src/services/validation/scoring";

// ─── LoginSchema ──────────────────────────────────────────────────────────

describe("LoginSchema", () => {
  it("accepts valid credentials", () => {
    const result = LoginSchema.safeParse({ email: "admin@example.com", password: "SecurePass1!" });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = LoginSchema.safeParse({ password: "SecurePass1!" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = LoginSchema.safeParse({ email: "notanemail", password: "SecurePass1!" });
    expect(result.success).toBe(false);
  });

  it("rejects short password (< 8 chars)", () => {
    const result = LoginSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects password exceeding 128 chars", () => {
    const result = LoginSchema.safeParse({ email: "a@b.com", password: "a".repeat(129) });
    expect(result.success).toBe(false);
  });
});

// ─── ContactCreateSchema ─────────────────────────────────────────────────

describe("ContactCreateSchema", () => {
  it("accepts minimal valid contact", () => {
    const result = ContactCreateSchema.safeParse({ email: "contact@example.com" });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const result = ContactCreateSchema.safeParse({ email: "USER@EXAMPLE.COM" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = ContactCreateSchema.safeParse({ email: "bademail" });
    expect(result.success).toBe(false);
  });

  it("rejects firstName exceeding 100 chars", () => {
    const result = ContactCreateSchema.safeParse({ email: "a@b.com", firstName: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("defaults status to UNSUBSCRIBED when consent was not provided", () => {
    const result = ContactCreateSchema.safeParse({ email: "a@b.com" });
    if (result.success) {
      expect(result.data.status).toBe("UNSUBSCRIBED");
    }
  });

  it("trims, deduplicates and rejects empty tags", () => {
    const result = ContactCreateSchema.safeParse({
      email: "a@b.com",
      tags: [" customer ", "customer"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual(["customer"]);

    expect(
      ContactCreateSchema.safeParse({ email: "a@b.com", tags: ["   "] }).success
    ).toBe(false);
  });

  it("rejects more than 50 tags", () => {
    const tags = Array.from({ length: 51 }, (_, i) => `tag-${i}`);
    const result = ContactCreateSchema.safeParse({ email: "a@b.com", tags });
    expect(result.success).toBe(false);
  });
});

// ─── CampaignCreateSchema ─────────────────────────────────────────────────

describe("CampaignCreateSchema", () => {
  it("accepts a valid campaign", () => {
    const result = CampaignCreateSchema.safeParse({
      name: "Summer Sale",
      subject: "Hot deals inside",
      fromName: "Signal",
      fromEmail: "sender@example.com",
      content: "<p>Sale</p>",
      channel: "EMAIL",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = CampaignCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 200 chars", () => {
    const result = CampaignCreateSchema.safeParse({ name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("defaults channel to EMAIL", () => {
    const result = CampaignCreateSchema.safeParse({
      name: "Test",
      subject: "Subject",
      fromName: "Signal",
      fromEmail: "sender@example.com",
      content: "<p>Body</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channel).toBe("EMAIL");
    }
  });

  it("rejects invalid channel value", () => {
    const result = CampaignCreateSchema.safeParse({ name: "Test", channel: "TELEGRAM" });
    expect(result.success).toBe(false);
  });

  it("requires an explicit audience snapshot for scheduled delivery", () => {
    const campaign = {
      name: "Scheduled",
      subject: "Subject",
      fromName: "Signal",
      fromEmail: "sender@example.com",
      content: "<p>Body</p>",
      scheduledAt: "2026-08-01T10:00:00.000Z",
    };
    expect(CampaignCreateSchema.safeParse(campaign).success).toBe(false);
    expect(
      CampaignCreateSchema.safeParse({
        ...campaign,
        audienceContactIds: ["cm12345678901234567890123"],
      }).success
    ).toBe(true);
  });
});

describe("ScoringEngine truthfulness", () => {
  const details = (
    overrides: Partial<ValidationDetails>
  ): ValidationDetails => ({
    syntax: true,
    dns: true,
    smtp: false,
    smtpStatus: "not_checked",
    disposable: false,
    roleBased: false,
    catchAll: null,
    temporary: false,
    ...overrides,
  });

  it("reports temporary or unavailable SMTP probes as unknown", () => {
    expect(
      ScoringEngine.calculate(details({ smtpStatus: "temporary", temporary: true })).status
    ).toBe("unknown");
    expect(
      ScoringEngine.calculate(details({ smtpStatus: "unavailable" })).status
    ).toBe("unknown");
  });

  it("distinguishes a hard recipient rejection from an accepted probe", () => {
    const rejected = ScoringEngine.calculate(details({ smtpStatus: "rejected" }));
    expect(rejected.status).toBe("invalid");
    expect(rejected.score).toBeLessThanOrEqual(25);

    const accepted = ScoringEngine.calculate(
      details({ smtp: true, smtpStatus: "accepted", catchAll: false })
    );
    expect(accepted.status).toBe("valid");
  });
});

// ─── AISubjectLinesSchema ─────────────────────────────────────────────────

describe("AISubjectLinesSchema", () => {
  it("accepts a valid topic", () => {
    const result = AISubjectLinesSchema.safeParse({ topic: "Summer sale announcement" });
    expect(result.success).toBe(true);
  });

  it("rejects empty topic", () => {
    const result = AISubjectLinesSchema.safeParse({ topic: "" });
    expect(result.success).toBe(false);
  });

  it("rejects topic exceeding 500 chars", () => {
    const result = AISubjectLinesSchema.safeParse({ topic: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from topic", () => {
    const result = AISubjectLinesSchema.safeParse({ topic: "  hello world  " });
    if (result.success) {
      expect(result.data.topic).toBe("hello world");
    }
  });
});

// ─── validateBody middleware factory ─────────────────────────────────────

describe("validateBody()", () => {
  it("calls next() on valid body and attaches parsed data", () => {
    const middleware = validateBody(LoginSchema);
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const next = vi.fn();
    const req = { body: { email: "test@test.com", password: "password123" } } as Request;
    const res = { status, json } as unknown as Response;

    middleware(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body.email).toBe("test@test.com");
  });

  it("returns 400 with field errors on invalid body", () => {
    const middleware = validateBody(LoginSchema);
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const next = vi.fn();
    const req = { body: { email: "bad", password: "short" } } as Request;
    const res = { status, json } as unknown as Response;

    middleware(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: expect.any(Object),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
