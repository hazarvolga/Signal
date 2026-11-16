import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

function encryptionKey(): Buffer {
  const raw = process.env.DATA_EXPORT_ENCRYPTION_KEY?.trim();
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error("DATA_EXPORT_ENCRYPTION_KEY must be a 64-character hexadecimal secret");
  }
  return Buffer.from(raw, "hex");
}

export function exportDirectory(): string {
  return path.resolve(process.env.DATA_EXPORT_DIR || "/data/exports");
}

export async function writeEncryptedExport(requestId: string, payload: unknown): Promise<string> {
  const directory = exportDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const artifact = JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
  const finalPath = path.join(directory, `${requestId}.json.enc`);
  const temporaryPath = `${finalPath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, artifact, { mode: 0o600, flag: "wx" });
  await fs.rename(temporaryPath, finalPath);
  return finalPath;
}

export async function readEncryptedExport(requestId: string): Promise<Buffer> {
  const artifact = JSON.parse(
    await fs.readFile(path.join(exportDirectory(), `${requestId}.json.enc`), "utf8")
  ) as { version: number; iv: string; tag: string; ciphertext: string };
  if (artifact.version !== 1) throw new Error("Unsupported export artifact version");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(artifact.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(artifact.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(artifact.ciphertext, "base64")),
    decipher.final(),
  ]);
}

