import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;

/**
 * Returns the independent 32-byte AES-256 encryption key.
 * Strictly decoupled from JWT_SECRET to guarantee cryptographic key isolation.
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const rawKey = process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: ENCRYPTION_KEY must be set in production as an independent 64-character hex string (32 bytes)."
      );
    }
    // Deterministic dev fallback key only for local development
    console.warn("[SECURITY NOTICE] Using local dev encryption key. Set ENCRYPTION_KEY in production.");
    cachedKey = crypto.createHash("sha256").update("builder_ai_independent_dev_aes_key_v1").digest();
    return cachedKey;
  }

  // If 64 hex characters (32 bytes hex-encoded)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    cachedKey = Buffer.from(rawKey, "hex");
  } else {
    // Hash the raw key independently to ensure exact 32-byte length
    cachedKey = crypto.createHash("sha256").update(rawKey).digest();
  }

  return cachedKey;
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Output format: enc_v1:ivHex:authTagHex:encryptedHex
 */
export function encryptText(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Avoid double encryption
  if (trimmed.startsWith("enc_v1:")) return trimmed;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc_v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Encryption Error]:", errorMsg);
    return "";
  }
}

/**
 * Decrypts AES-256-GCM encrypted string.
 * Supports backward compatibility for unencrypted legacy keys.
 */
export function decryptText(encryptedText?: string | null): string {
  if (!encryptedText || typeof encryptedText !== "string") return "";
  const trimmed = encryptedText.trim();
  if (!trimmed) return "";

  let payload = trimmed;
  if (payload.startsWith("enc_v1:")) {
    payload = payload.slice(7);
  }

  // Check if format matches iv:authTag:encryptedHex
  const parts = payload.split(":");
  if (parts.length !== 3) {
    // Return raw text if unencrypted key
    return trimmed;
  }

  try {
    const [ivHex, authTagHex, cipherHex] = parts;
    if (!ivHex || !authTagHex || !cipherHex) return "";

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Decryption Error]:", errorMsg);
    return "";
  }
}
