import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { csrfProtectionMiddleware, generateToken } from "../../src/middleware/csrf";

function createCsrfApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "test-session-secret-that-is-long-enough",
      resave: false,
      saveUninitialized: false,
    })
  );
  app.get("/api/csrf-token", (req, res) => {
    (req.session as any).csrfInitialized = true;
    res.json({ csrfToken: generateToken(req, res) });
  });
  app.use(csrfProtectionMiddleware);
  app.post("/api/protected", (_req, res) => res.json({ success: true }));
  app.post("/api/webhooks", (_req, res) => res.json({ success: true }));
  app.post("/api/webhooks/shopify/simulate", (_req, res) => res.json({ success: true }));
  app.post("/api/webhooks/shopify", (_req, res) => res.json({ success: true }));
  app.post("/api/webhooks/ses", (_req, res) => res.json({ success: true }));
  app.post("/api/unsubscribe/:token", (_req, res) => res.json({ success: true }));
  app.use(
    (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error.status || error.statusCode || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  );
  return app;
}

describe("CSRF middleware", () => {
  it("rejects a session mutation without the double-submit token", async () => {
    const agent = request.agent(createCsrfApp());
    const tokenResponse = await agent.get("/api/csrf-token");
    expect(tokenResponse.status, JSON.stringify(tokenResponse.body)).toBe(200);

    await agent.post("/api/protected").send({ value: 1 }).expect(403);
  });

  it("accepts a session mutation with a valid session-bound token", async () => {
    const agent = request.agent(createCsrfApp());
    const tokenResponse = await agent.get("/api/csrf-token");
    expect(tokenResponse.status, JSON.stringify(tokenResponse.body)).toBe(200);

    const response = await agent
      .post("/api/protected")
      .set("x-csrf-token", tokenResponse.body.csrfToken)
      .send({ value: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("exempts only RFC 8058 POST unsubscribe requests from CSRF", async () => {
    const app = createCsrfApp();

    await request(app).post("/api/unsubscribe/signed-token").expect(200);
    await request(app).get("/api/unsubscribe/signed-token").expect(404);
  });

  it("exempts only signed provider webhook endpoints, not webhook configuration or simulation", async () => {
    const app = createCsrfApp();

    await request(app).post("/api/webhooks/shopify").expect(200);
    await request(app).post("/api/webhooks/ses").expect(200);
    await request(app).post("/api/webhooks").expect(403);
    await request(app).post("/api/webhooks/shopify/simulate").expect(403);
  });
});
