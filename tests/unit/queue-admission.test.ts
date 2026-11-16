import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertCampaignQueueCapacity,
  enqueueRecipientDeliveryBatch,
} from "../../src/services/email/deliveryQueue";

function queueWithCounts(counts: Record<string, number>) {
  return { getJobCounts: vi.fn().mockResolvedValue(counts) };
}

describe("campaign queue admission", () => {
  afterEach(() => {
    delete process.env.EMAIL_QUEUE_MAX_WAITING;
    delete process.env.EMAIL_QUEUE_MAX_TOTAL;
  });

  it("admits a bounded batch below both high-watermarks", async () => {
    process.env.EMAIL_QUEUE_MAX_WAITING = "1000";
    process.env.EMAIL_QUEUE_MAX_TOTAL = "1200";
    const queue = queueWithCounts({ waiting: 400, active: 20, delayed: 10, prioritized: 0 });

    const snapshot = await assertCampaignQueueCapacity(queue as never, 500);

    expect(snapshot.total).toBe(430);
    expect(snapshot.incoming).toBe(500);
  });

  it("rejects before incoming jobs exceed the waiting high-watermark", async () => {
    process.env.EMAIL_QUEUE_MAX_WAITING = "1000";
    process.env.EMAIL_QUEUE_MAX_TOTAL = "2000";
    const queue = queueWithCounts({ waiting: 800, active: 10, delayed: 0, prioritized: 0 });

    await expect(assertCampaignQueueCapacity(queue as never, 250)).rejects.toMatchObject({
      name: "QueueCapacityExceededError",
      reason: "waiting",
    });
  });

  it("rejects before incoming jobs exceed total queue capacity", async () => {
    process.env.EMAIL_QUEUE_MAX_WAITING = "1500";
    process.env.EMAIL_QUEUE_MAX_TOTAL = "1600";
    const queue = queueWithCounts({ waiting: 1000, active: 400, delayed: 150, prioritized: 0 });

    await expect(assertCampaignQueueCapacity(queue as never, 100)).rejects.toMatchObject({
      name: "QueueCapacityExceededError",
      reason: "total",
    });
  });

  it("rejects atomically when Redis memory reaches the configured threshold", async () => {
    const addBulk = vi.fn();
    const client = {
      set: vi.fn().mockResolvedValue("OK"),
      info: vi.fn().mockResolvedValue("used_memory:850\nmaxmemory:1000"),
      eval: vi.fn().mockResolvedValue(1),
    };
    const queue = {
      client: Promise.resolve(client),
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        prioritized: 0,
      }),
      addBulk,
    };

    await expect(
      enqueueRecipientDeliveryBatch(queue as never, [
        { name: "deliver-recipient", data: { deliveryId: "delivery-1" } },
      ])
    ).rejects.toMatchObject({
      name: "QueueCapacityExceededError",
      reason: "redis_memory",
    });
    expect(addBulk).not.toHaveBeenCalled();
    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it("rejects concurrent admission while another producer holds the lock", async () => {
    const addBulk = vi.fn();
    const queue = {
      client: Promise.resolve({
        set: vi.fn().mockResolvedValue(null),
        info: vi.fn(),
        eval: vi.fn(),
      }),
      getJobCounts: vi.fn(),
      addBulk,
    };

    await expect(
      enqueueRecipientDeliveryBatch(queue as never, [
        { name: "deliver-recipient", data: { deliveryId: "delivery-1" } },
      ])
    ).rejects.toMatchObject({
      name: "QueueCapacityExceededError",
      reason: "concurrent",
    });
    expect(queue.getJobCounts).not.toHaveBeenCalled();
    expect(addBulk).not.toHaveBeenCalled();
  });
});
