function checkEnv(key: string, required: boolean): string | null {
  if (process.env[key]) return null;
  if (required) return `${key} is required but not set`;
  return null;
}

function checkEnvOptional(key: string, label: string): string | null {
  if (process.env[key]) return null;
  return `${label} (${key}) is not set — some features may be unavailable`;
}

export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !["development", "test", "production"].includes(nodeEnv)) {
    errors.push("NODE_ENV must be one of development, test or production");
  }

  const dbError = checkEnv("DATABASE_URL", true);
  if (dbError) errors.push(dbError);

  const isProduction = nodeEnv === "production";
  const sessionError = checkEnv("SESSION_SECRET", isProduction);
  if (sessionError) errors.push(sessionError);
  if (isProduction && (process.env.SESSION_SECRET?.length || 0) < 64) {
    errors.push("SESSION_SECRET must contain at least 64 characters");
  }

  const appUrlError = checkEnv("APP_URL", isProduction);
  if (appUrlError) errors.push(appUrlError);
  if (isProduction && process.env.APP_URL && !process.env.APP_URL.startsWith("https://")) {
    errors.push("APP_URL must use HTTPS in production");
  }

  const redisError = checkEnv("REDIS_URL", isProduction);
  if (redisError) errors.push(redisError);
  if (!isProduction) {
    const redisWarning = checkEnvOptional("REDIS_URL", "Redis connection");
    if (redisWarning) warnings.push(redisWarning);
  }

  for (const key of ["METRICS_TOKEN", "DATA_EXPORT_ENCRYPTION_KEY", "CONSENT_TEXT_VERSION"]) {
    const error = checkEnv(key, isProduction);
    if (error) errors.push(error);
  }
  if (
    isProduction &&
    process.env.DATA_EXPORT_ENCRYPTION_KEY &&
    !/^[a-f0-9]{64}$/i.test(process.env.DATA_EXPORT_ENCRYPTION_KEY)
  ) {
    errors.push("DATA_EXPORT_ENCRYPTION_KEY must be 64 hexadecimal characters");
  }

  if (isProduction) {
    const provider = process.env.EMAIL_PROVIDER?.trim().toUpperCase();
    const providerRequirements: Record<string, string[]> = {
      AMAZON_SES: ["AWS_REGION", "FROM_EMAIL", "SES_SNS_TOPIC_ARNS"],
      SMTP: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "FROM_EMAIL"],
      SENDGRID: ["SENDGRID_API_KEY", "FROM_EMAIL"],
      MAILGUN: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "FROM_EMAIL"],
      RESEND: ["RESEND_API_KEY", "FROM_EMAIL"],
    };
    if (!provider || !providerRequirements[provider]) {
      errors.push("EMAIL_PROVIDER must be one of AMAZON_SES, SMTP, SENDGRID, MAILGUN or RESEND");
    } else {
      for (const key of providerRequirements[provider]) {
        const error = checkEnv(key, true);
        if (error) errors.push(error);
      }
    }
    for (const key of ["EMAIL_TRACKING_SECRET"]) {
      const error = checkEnv(key, true);
      if (error) errors.push(error);
    }
    if ((process.env.EMAIL_TRACKING_SECRET?.length || 0) < 32) {
      errors.push("EMAIL_TRACKING_SECRET must contain at least 32 characters");
    }
    const minSample = Number(process.env.AB_MIN_SAMPLE_PER_VARIATION || "50");
    if (!Number.isInteger(minSample) || minSample < 1) {
      errors.push("AB_MIN_SAMPLE_PER_VARIATION must be a positive integer");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
