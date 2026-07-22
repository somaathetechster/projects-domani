import crypto from "crypto";
import bcrypt from "bcryptjs";

// ---- OTP ----
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit
}

export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, 12);
}

export async function verifyHash(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function otpExpiry(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ---- Session tokens ----
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(days = 7): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ---- Rate limiting guard (simple, extend with Redis for production) ----
export const MAX_OTP_ATTEMPTS = 5;
export const MAX_OTP_REQUESTS_PER_HOUR = 5;
