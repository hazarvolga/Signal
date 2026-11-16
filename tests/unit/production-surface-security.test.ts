import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loggerRedactionPaths } from "../../src/services/logger";

const workspaceFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("production security surface", () => {
  it("does not retain session or credential debug logging", () => {
    const source = `${workspaceFile("server.ts")}\n${workspaceFile("src/routes/auth.ts")}`;

    expect(source).not.toContain("DEBUG: Session Cookie Config");
    expect(source).not.toContain("DEBUG: /api/auth/login");
    expect(source).not.toContain("DEBUG: /api/me");
    expect(workspaceFile("src/services/redisService.ts")).not.toContain("${process.env.REDIS_URL}");
  });

  it("redacts common credential and session fields", () => {
    expect(loggerRedactionPaths).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "*.password",
        "*.token",
        "*.sessionID",
      ])
    );
  });

  it("does not publish PostgreSQL from the default compose profile", () => {
    const compose = workspaceFile("docker-compose.yml");
    const dbService = compose.slice(compose.indexOf("\n  db:"), compose.indexOf("\n  redis:"));

    expect(dbService).not.toMatch(/^\s{4}ports:/m);
    expect(compose).toMatch(/backend:\s*\n\s+internal:\s+true/);
  });

  it("does not define the server-side Gemini key in the client build", () => {
    expect(workspaceFile("vite.config.ts")).not.toContain("GEMINI_API_KEY");
  });

  it("keeps brute-force limiting route-scoped and the general API ceiling configurable", () => {
    const server = workspaceFile("server.ts");
    const authRoutes = workspaceFile("src/routes/auth.ts");

    expect(server).not.toContain('app.use("/api/auth", authLimiter)');
    expect(server).not.toContain('app.use("/auth/sso", authLimiter)');
    expect(server).toContain("process.env.API_RATE_LIMIT_MAX || 200");
    expect(authRoutes).toContain('router.post("/api/auth/login", authLimiter');
    expect(authRoutes).toContain('router.post("/api/auth/change-password", authLimiter');
  });
});
