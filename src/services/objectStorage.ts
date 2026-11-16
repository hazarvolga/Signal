import { randomUUID, createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface ValidatedAssetBinary {
  bytes: Buffer;
  mimeType: keyof typeof MIME_EXTENSIONS;
  sizeBytes: number;
  checksum: string;
  scanStatus: "VALIDATED" | "PENDING";
}

export class InvalidAssetBinaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAssetBinaryError";
  }
}

function configuredMaxAssetBytes(): number {
  const parsed = Number.parseInt(process.env.ASSET_MAX_BYTES || "5242880", 10);
  return Number.isFinite(parsed)
    ? Math.min(10 * 1024 * 1024, Math.max(1024, parsed))
    : 5 * 1024 * 1024;
}

function hasExpectedMagic(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }
  if (mimeType === "image/jpeg") {
    return bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  }
  if (mimeType === "image/gif") {
    const header = bytes.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return false;
}

export function decodeAndValidateAssetDataUrl(dataUrl: string): ValidatedAssetBinary {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new InvalidAssetBinaryError("Asset must be a valid Base64 data URL");
  const mimeType = match[1] as keyof typeof MIME_EXTENSIONS;
  if (!MIME_EXTENSIONS[mimeType]) {
    throw new InvalidAssetBinaryError("Asset MIME type is not allowed");
  }
  if (match[2].length % 4 !== 0) {
    throw new InvalidAssetBinaryError("Asset Base64 payload is malformed");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > configuredMaxAssetBytes()) {
    throw new InvalidAssetBinaryError("Asset exceeds the allowed byte size");
  }
  if (!hasExpectedMagic(bytes, mimeType)) {
    throw new InvalidAssetBinaryError("Asset content does not match its MIME type");
  }
  return {
    bytes,
    mimeType,
    sizeBytes: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    scanStatus: mimeType === "application/pdf" ? "PENDING" : "VALIDATED",
  };
}

function storageConfig() {
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const region = process.env.OBJECT_STORAGE_REGION;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Object storage is not configured");
  }
  return {
    bucket,
    client: new S3Client({
      region,
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
      forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function storeAssetObject(
  organizationId: string,
  asset: ValidatedAssetBinary
): Promise<string> {
  const { bucket, client } = storageConfig();
  const extension = MIME_EXTENSIONS[asset.mimeType];
  const safeOrganizationId = organizationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `${safeOrganizationId}/assets/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: asset.bytes,
      ContentType: asset.mimeType,
      ContentLength: asset.sizeBytes,
      ServerSideEncryption: "AES256",
      Metadata: {
        organization: safeOrganizationId,
        checksum: asset.checksum,
      },
    })
  );
  return key;
}

export async function signedAssetUrl(storageKey: string): Promise<string> {
  const { bucket, client } = storageConfig();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), {
    expiresIn: 300,
  });
}

export async function deleteAssetObject(storageKey: string): Promise<void> {
  const { bucket, client } = storageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
}
