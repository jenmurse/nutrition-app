// Generates the Apple client secret JWT required by Supabase for Sign in with Apple.
// Run: node scripts/generate-apple-secret.mjs
// Valid for 6 months — regenerate before it expires.

import { createSign } from "crypto";
import { readFileSync } from "fs";

const TEAM_ID = "V95AGCD2P7";
const KEY_ID = "J63X338X2Q";
const CLIENT_ID = "com.withgoodmeasure.app";
const KEY_PATH = process.argv[2]; // pass path to .p8 file as argument

if (!KEY_PATH) {
  console.error("Usage: node scripts/generate-apple-secret.mjs /path/to/AuthKey_J63X338X2Q.p8");
  process.exit(1);
}

const privateKey = readFileSync(KEY_PATH, "utf8");
const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 6 months

const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID })).toString("base64url");
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: "https://appleid.apple.com",
  sub: CLIENT_ID,
})).toString("base64url");

const signingInput = `${header}.${payload}`;
const sign = createSign("SHA256");
sign.update(signingInput);
const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");

const jwt = `${signingInput}.${signature}`;
console.log("\nApple client secret JWT (paste into Supabase):\n");
console.log(jwt);
console.log(`\nExpires: ${new Date(exp * 1000).toLocaleDateString()} — set a calendar reminder to regenerate.\n`);
