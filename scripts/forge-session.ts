/**
 * Forge cookie session Auth.js v5 lokal (HANYA untuk test 403/200 di dev).
 * Pakai: npx tsx scripts/forge-session.ts <csv-permissions>  → cetak token JWT.
 */
import { encode } from "next-auth/jwt";
import { readFileSync, writeFileSync } from "node:fs";

// env aktual menang: Next.js TIDAK menimpa process.env dari .env.local —
// server pakai AUTH_SECRET dari environment bila ada, jadi ikuti itu.
const secret = (
  process.env.AUTH_SECRET ||
  (readFileSync(".env.local", "utf8").match(/^AUTH_SECRET=(.+)$/m)?.[1] ?? "")
).trim();
if (!secret) {
  console.error("AUTH_SECRET tidak ditemukan di .env.local");
  process.exit(1);
}

export async function forge(permissions: string[], username = "tester", roles: string[] = []): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: {
      sub: "forge-user",
      id: "forge-user",
      username,
      roles,
      permissions,
      iat: now,
      exp: now + 86_400,
    },
    secret,
    salt: "authjs.session-token",
  });
}

if (require.main === module) {
  const perms = (process.argv[2] ?? "DASHBOARD_VIEW").split(",");
  forge(perms).then((t) => {
    // simpan ke file — token panjang bisa terpotong bila lewat stdout
    writeFileSync("Temp/session-token.txt", t);
    console.log("token disimpan (" + t.length + " chars)");
  });
}
