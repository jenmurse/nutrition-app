/**
 * Shared helpers for signup-code generation. Used by the admin API route
 * (app/api/admin/codes) and the CLI script (scripts/make-signup-code.ts) so
 * the code alphabet and valid plans live in one place.
 */
export const SIGNUP_PLANS = ["comp", "free", "pro"] as const;
export type SignupPlan = (typeof SIGNUP_PLANS)[number];

// Unambiguous alphabet (no 0/o/1/l/i) for a readable, shareable code.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSignupCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
