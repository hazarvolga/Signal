import { prisma } from "../services/prisma";
import { SegmentRuleSchema } from "./schemas";
import { z } from "zod";

function parseTimeframe(timeframe: string): number {
  const num = parseInt(timeframe);
  const unit = timeframe.slice(-1);
  switch (unit) {
    case "h":
      return num * 60 * 60 * 1000;
    case "d":
      return num * 24 * 60 * 60 * 1000;
    case "w":
      return num * 7 * 24 * 60 * 60 * 1000;
    case "m":
      return num * 30 * 24 * 60 * 60 * 1000;
    default:
      return num * 24 * 60 * 60 * 1000;
  }
}

const StoredRulesSchema = z.union([
  z.array(SegmentRuleSchema),
  z.object({
    logic: z.enum(["AND", "OR"]),
    rules: z.array(SegmentRuleSchema).max(50),
  }),
]);

export async function refreshSegment(segmentId: string) {
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) return;

  try {
    const parsed = StoredRulesSchema.parse(JSON.parse(segment.rules));
    const rules = Array.isArray(parsed) ? parsed : parsed.rules;
    const logic = Array.isArray(parsed) ? "AND" : parsed.logic;
    const predicates: any[] = [];

    for (const rule of rules) {
      if (rule.type === "event") {
        const timeframeMs = parseTimeframe(rule.timeframe);
        predicates.push({ behavioralEvents: {
          some: {
            name: rule.eventName,
            timestamp: {
              gte: new Date(Date.now() - timeframeMs),
            },
          },
        } });
      } else if (rule.type === "attribute") {
        if (rule.field === "status") {
          if (!["equals", "not_equals"].includes(rule.operator)) {
            throw new Error("Status segment rules support only equals/not_equals");
          }
          predicates.push({
            status: rule.operator === "not_equals" ? { not: String(rule.value) } : String(rule.value),
          });
        } else if (rule.field === "emailConsent") {
          if (!["equals", "not_equals"].includes(rule.operator)) {
            throw new Error("Consent segment rules support only equals/not_equals");
          }
          const value = Boolean(rule.value);
          predicates.push({ emailConsent: rule.operator === "not_equals" ? !value : value });
        } else if (rule.field === "engagementScore") {
          const operator =
            rule.operator === "equals"
              ? "equals"
              : rule.operator === "not_equals"
                ? "not"
                : rule.operator;
          predicates.push({ engagementScore: { [operator]: Number(rule.value) } });
        }
      }
    }
    const where: any = {
      organizationId: segment.organizationId,
      ...(predicates.length > 0 ? { [logic]: predicates } : {}),
    };

    const matchedContacts = await prisma.contact.findMany({
      where,
      select: { id: true },
    });

    await prisma.segment.update({
      where: { id: segment.id },
      data: {
        contactCount: matchedContacts.length,
        contacts: {
          set: matchedContacts.map((c) => ({ id: c.id })),
        },
      },
    });

    return matchedContacts.length;
  } catch (err) {
    throw new Error(`Unable to refresh segment ${segment.id}`, { cause: err });
  }
}
