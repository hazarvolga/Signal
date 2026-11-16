import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readEncryptedExport,
  writeEncryptedExport,
} from "../../src/services/compliance/exportCrypto";

describe("data export encryption", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "signal-export-test-"));
    process.env.DATA_EXPORT_DIR = directory;
    process.env.DATA_EXPORT_ENCRYPTION_KEY = "ab".repeat(32);
  });

  afterEach(async () => {
    delete process.env.DATA_EXPORT_DIR;
    delete process.env.DATA_EXPORT_ENCRYPTION_KEY;
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("writes no plaintext and decrypts the artifact", async () => {
    const payload = { email: "person@example.com", consent: false };
    await writeEncryptedExport("request-1", payload);
    const raw = await fs.readFile(path.join(directory, "request-1.json.enc"), "utf8");

    expect(raw).not.toContain("person@example.com");
    expect(JSON.parse((await readEncryptedExport("request-1")).toString("utf8"))).toEqual(payload);
  });

  it("fails closed without a valid encryption key", async () => {
    process.env.DATA_EXPORT_ENCRYPTION_KEY = "short";
    await expect(writeEncryptedExport("request-2", { ok: true })).rejects.toThrow(
      "64-character hexadecimal"
    );
  });
});

