import crypto from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface OutboundWebhookEvent {
  topic: string;
  organizationId: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Dispatches an event to all active tenant webhooks registered for the event topic.
 * Signs the payload using HMAC-SHA256 with the webhook's secret or default tenant secret.
 */
export async function dispatchOutboundWebhooks(event: OutboundWebhookEvent): Promise<number> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId: event.organizationId,
        isActive: true,
      },
    });

    if (webhooks.length === 0) return 0;

    const normalizedTopic = event.topic.toLowerCase().trim();
    const matchingWebhooks = webhooks.filter((hook) => {
      try {
        const events = typeof hook.events === "string" ? JSON.parse(hook.events) : hook.events;
        if (!Array.isArray(events)) return false;
        return (
          events.includes("*") ||
          events.some((e) => typeof e === "string" && e.toLowerCase().trim() === normalizedTopic)
        );
      } catch {
        return false;
      }
    });

    if (matchingWebhooks.length === 0) return 0;

    const timestamp = event.timestamp || new Date().toISOString();
    const payload = JSON.stringify({
      id: `evt_${crypto.randomUUID()}`,
      event: event.topic,
      organizationId: event.organizationId,
      timestamp,
      data: event.data,
    });

    await Promise.allSettled(
      matchingWebhooks.map(async (hook) => {
        const signingSecret =
          hook.secret || process.env.WEBHOOK_SIGNING_SECRET || "signal_whsec_default";
        const signature = crypto
          .createHmac("sha256", signingSecret)
          .update(`${timestamp}.${payload}`)
          .digest("hex");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        let success = false;
        let statusCode = 0;
        let errorMessage: string | undefined;

        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Signal-Webhook-Delivery/1.0",
              "X-Signal-Event": event.topic,
              "X-Signal-Timestamp": timestamp,
              "X-Signal-Signature-256": `t=${timestamp},v1=${signature}`,
            },
            body: payload,
            signal: controller.signal,
          });

          statusCode = res.status;
          success = res.ok;
          if (!res.ok) {
            errorMessage = `HTTP status ${res.status}`;
          }
        } catch (err: any) {
          errorMessage =
            err.name === "AbortError" ? "Timeout after 6s" : err.message || "Network error";
        } finally {
          clearTimeout(timeoutId);
        }

        // Record dispatch attempt in WebhookLog
        try {
          await prisma.webhookLog.create({
            data: {
              source: "OUTBOUND",
              topic: event.topic,
              payload: JSON.stringify({
                targetUrl: hook.url,
                webhookId: hook.id,
                statusCode,
                success,
                error: errorMessage,
                payloadSummary: {
                  event: event.topic,
                  dataKeys: Object.keys(event.data || {}),
                },
              }),
              processed: success,
              organizationId: event.organizationId,
            },
          });
        } catch (logErr) {
          logger.warn({ logErr, webhookId: hook.id }, "Failed to record outbound webhook log");
        }
      })
    );

    return matchingWebhooks.length;
  } catch (error) {
    logger.error({ error, event }, "Unexpected error in outbound webhook dispatcher");
    return 0;
  }
}
