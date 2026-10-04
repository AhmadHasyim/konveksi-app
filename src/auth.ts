import type { SessionUser } from "@/types/auth";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { findDummyUser, verifyDummyPassword } from "@/lib/mock/store";
import { loginSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/db/prisma";

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    roles?: SessionUser["roles"];
    permissions?: SessionUser["permissions"];
  }
}

/**
 * Coba login dari tabel `User` (hasil CRUD modul Administrasi).
 * Kontrak session sama dengan mock — kalau DB gagal/tidak cocok,
 * authorize jatuh ke mock store (akun dev lama tetap bisa login).
 */
async function authorizeFromDb(
  username: string,
  password: string,
): Promise<(SessionUser & { name?: string | null }) | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user || !user.isActive) return null;
    if (!(await compare(password, user.passwordHash))) return null;
    return {
      id: user.id,
      name: user.username,
      email: user.email,
      username: user.username,
      roles: user.roles.map((ur) => ({ code: ur.role.code, name: ur.role.name })) as SessionUser["roles"],
      permissions: [
        ...new Set(
          user.roles.flatMap((ur) =>
            ur.role.permissions.map((p) => p.permission.code),
          ),
        ),
      ] as SessionUser["permissions"],
    };
  } catch (err) {
    console.error("[auth:db]", err);
    return null;
  }
}

/**
 * Auth.js v5 (NextAuth) — Credentials provider.
 * Prioritas: tabel User (PostgreSQL/Prisma) → fallback mock store.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Kredensial",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const fromDb = await authorizeFromDb(
          parsed.data.username,
          parsed.data.password,
        );
        if (fromDb) return fromDb;

        const user = findDummyUser(parsed.data.username);
        if (!user || !user.isActive) return null;

        const valid = await verifyDummyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        // Jangan pernah kembalikan passwordHash ke session/JWT.
        return {
          id: user.id,
          name: user.username,
          email: user.email,
          username: user.username,
          roles: user.roles,
          permissions: user.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as SessionUser & { name?: string | null };
        token.id = u.id;
        token.username = u.username ?? (u.name as string | undefined);
        token.roles = u.roles;
        token.permissions = u.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = (token.id as string) ?? "";
      session.user.username = (token.username as string) ?? "";
      session.user.roles = token.roles ?? [];
      session.user.permissions = token.permissions ?? [];
      return session;
    },
  },
});
