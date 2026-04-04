import { MongoClient } from "mongodb";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "radcred-super-secret-key-2026"
);

// ── MongoDB ───────────────────────────────────────────────
let cachedClient = null;
async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getUsersCollection() {
  const client = await getClient();
  return client.db("leadprosper").collection("dashboard_users");
}

// ── Check email exists in leads collection (for register) ─
export async function isEmailInLeads(email) {
  try {
    const client = await getClient();
    const col = client.db("leadprosper").collection("leadprosper");
    const lead = await col.findOne({ email: email.toLowerCase() });
    return !!lead;
  } catch {
    return false;
  }
}

// ── JWT ───────────────────────────────────────────────────
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ── Password strength check ───────────────────────────────
export function checkPasswordStrength(password) {
  const checks = {
    length:    password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, strong: score === 5 };
}