import pino from "pino";

export const loggerRedactionPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
  "password",
  "currentPassword",
  "newPassword",
  "temporaryPassword",
  "token",
  "*.password",
  "*.currentPassword",
  "*.newPassword",
  "*.temporaryPassword",
  "*.token",
  "*.sessionID",
] as const;

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [...loggerRedactionPaths],
    censor: "[REDACTED]",
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.socket?.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
