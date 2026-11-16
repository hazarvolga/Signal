import { createHmac, timingSafeEqual } from "node:crypto";

export interface TenantCursorPayload {
  organizationId: string;
  createdAt: string;
  id: string;
}

export class InvalidPaginationCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "InvalidPaginationCursorError";
  }
}

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function encodeTenantCursor(payload: TenantCursorPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret).toString("base64url")}`;
}

export function decodeTenantCursor(
  cursor: string,
  organizationId: string,
  secret: string
): TenantCursorPayload {
  try {
    if (!cursor || cursor.length > 1024) throw new InvalidPaginationCursorError();
    const [encoded, signature, extra] = cursor.split(".");
    if (!encoded || !signature || extra) throw new InvalidPaginationCursorError();
    const supplied = Buffer.from(signature, "base64url");
    const expected = sign(encoded, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new InvalidPaginationCursorError();
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<TenantCursorPayload>;
    const createdAt = new Date(payload.createdAt || "");
    if (
      payload.organizationId !== organizationId ||
      typeof payload.id !== "string" ||
      payload.id.length === 0 ||
      Number.isNaN(createdAt.getTime())
    ) {
      throw new InvalidPaginationCursorError();
    }
    return {
      organizationId,
      id: payload.id,
      createdAt: createdAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof InvalidPaginationCursorError) throw error;
    throw new InvalidPaginationCursorError();
  }
}

export const encodeContactCursor = encodeTenantCursor;
export const decodeContactCursor = decodeTenantCursor;
