import crypto from "crypto";

/**
 * Hash password using scrypt + salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify password against stored hash using timing-safe comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;

  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);

  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}
