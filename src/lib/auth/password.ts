import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Hash a password with a per-user random salt (scrypt, no extra dependency). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/** Constant-time verification of a stored scrypt hash. */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  try {
    const expected = Buffer.from(digest, "hex");
    const candidate = scryptSync(password, salt, KEY_LENGTH);
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  } catch {
    return false;
  }
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password kam az kam 8 characters ka hona chahiye.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password mein kam az kam aik letter aur aik number hona chahiye.";
  }
  return null;
}

/** Readable random password for the "generate" button in the team panel. */
export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `${body}${(bytes[0] % 9) + 1}`;
}
