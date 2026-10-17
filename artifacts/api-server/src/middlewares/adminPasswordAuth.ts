import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { eq } from "drizzle-orm";
import { db, adminCredentialsTable } from "@workspace/db";

const SESSION_COOKIE = "book_bundle_admin_session";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SCRYPT_COST = 1 << 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 256;

type AdminCredential = typeof adminCredentialsTable.$inferSelect;
type SessionPayload = {
  version: number;
  expiresAt: number;
};

declare global {
  namespace Express {
    interface Request {
      adminUserId?: string;
    }
  }
}

function passwordLength(value: string): number {
  return Array.from(value).length;
}

function hasValidPasswordLength(value: string): boolean {
  const length = passwordLength(value);
  return length >= MIN_PASSWORD_LENGTH && length <= MAX_PASSWORD_LENGTH;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    String(SCRYPT_COST),
    String(SCRYPT_BLOCK_SIZE),
    String(SCRYPT_PARALLELIZATION),
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltText, keyText, extra] =
    encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION ||
    !saltText ||
    !keyText ||
    extra !== undefined
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expectedKey = Buffer.from(keyText, "base64url");
    if (salt.length !== 16 || expectedKey.length !== SCRYPT_KEY_LENGTH) {
      return false;
    }
    const actualKey = await deriveKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}

export async function getAdminCredential(): Promise<AdminCredential | null> {
  const [credential] = await db
    .select()
    .from(adminCredentialsTable)
    .where(eq(adminCredentialsTable.id, 1))
    .limit(1);
  return credential ?? null;
}

export async function ensureAdminCredential(): Promise<AdminCredential | null> {
  const existing = await getAdminCredential();
  if (existing) return existing;

  const initialPassword = process.env.ADMIN_PASSWORD;
  if (!initialPassword || !hasValidPasswordLength(initialPassword)) {
    return null;
  }

  const passwordHash = await hashAdminPassword(initialPassword);
  await db
    .insert(adminCredentialsTable)
    .values({ id: 1, passwordHash })
    .onConflictDoNothing({ target: adminCredentialsTable.id });
  return getAdminCredential();
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signSessionPayload(payload: string): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(sessionVersion: number): string | null {
  const payload = Buffer.from(
    JSON.stringify({
      version: sessionVersion,
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    }),
  ).toString("base64url");
  const signature = signSessionPayload(payload);
  return signature ? `${payload}.${signature}` : null;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) return null;

  const expectedSignature = signSessionPayload(encodedPayload);
  if (!expectedSignature) return null;

  const actualBytes = Buffer.from(encodedSignature, "base64url");
  const expectedBytes = Buffer.from(expectedSignature, "base64url");
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      !Number.isInteger(payload.version) ||
      !Number.isFinite(payload.expiresAt) ||
      (payload.expiresAt ?? 0) <= Date.now()
    ) {
      return null;
    }
    return {
      version: payload.version as number,
      expiresAt: payload.expiresAt as number,
    };
  } catch {
    return null;
  }
}

export async function readAdminSession(
  req: Request,
  credential?: AdminCredential | null,
): Promise<SessionPayload | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string") return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const account = credential === undefined ? await getAdminCredential() : credential;
  if (!account || account.sessionVersion !== payload.version) return null;
  return payload;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/admin",
};

export function setAdminSessionCookie(
  res: Response,
  sessionVersion: number,
): boolean {
  const token = createAdminSessionToken(sessionVersion);
  if (!token) return false;
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_MS,
  });
  return true;
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export function isSameOriginRequest(req: Request): boolean {
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") return true;
  if (fetchSite === "cross-site") return false;

  const origin = req.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = (forwardedHost || req.get("host") || "").toLowerCase();
    return !!requestHost && originHost === requestHost;
  } catch {
    return false;
  }
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const credential = await ensureAdminCredential();
    if (!credential) {
      res.status(503).json({ error: "Administrator password is not configured" });
      return;
    }

    const session = await readAdminSession(req, credential);
    if (!session) {
      res.status(401).json({ error: "Administrator password required" });
      return;
    }

    req.adminUserId = "single-admin";
    next();
  } catch (error) {
    next(error);
  }
};
