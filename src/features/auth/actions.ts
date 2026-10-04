"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validation/auth";
import { fail, type ActionResponse } from "@/types/response";

/**
 * Login via Server Action: validasi server-side -> verifikasi
 * kredensial (Auth.js) -> redirect ke /dashboard bila sukses.
 * Pesan error selalu generik; detail teknis hanya di server log.
 */
export async function loginAction(
  input: unknown,
): Promise<ActionResponse<{ username: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors);
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    // signIn melempar NEXT_REDIRECT saat sukses sehingga baris ini
    // tidak tercapai; return di bawah hanya untuk type-safety.
    return {
      success: true,
      data: { username: parsed.data.username },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("[auth] login gagal:", error.type);
      return fail(
        "INVALID_CREDENTIALS",
        "Username atau password tidak valid.",
      );
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
