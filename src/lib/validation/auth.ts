import { z } from "zod";

/**
 * Skema login (dipakai di client via react-hook-form
 * DAN divalidasi ulang di server sebelum verifikasi kredensial).
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi.")
    .max(100, "Username terlalu panjang."),
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(200, "Password terlalu panjang."),
});

export type LoginInput = z.infer<typeof loginSchema>;
