"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

/**
 * Form login (Client Component).
 * Validasi instan di browser via react-hook-form + zod,
 * validasi & verifikasi final selalu di server (loginAction).
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const { isSubmitting, errors } = form.formState;

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = await loginAction(values);
    // Saat sukses, loginAction melempar redirect ke /dashboard
    // sehingga kode di bawah hanya berjalan bila login gagal.
    if (!result.success) {
      setFormError(result.message);
      if (result.fieldErrors?.username) {
        form.setError("username", {
          message: result.fieldErrors.username[0],
        });
      }
      if (result.fieldErrors?.password) {
        form.setError("password", {
          message: result.fieldErrors.password[0],
        });
      }
    }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-card p-6 shadow-[0_1px_2px_0_rgb(15_23_42/0.05)] sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
          Selamat datang kembali
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Masuk untuk mengelola operasional konveksi hari ini.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError ? (
          <Alert variant="destructive" role="alert" className="rounded-xl">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-sm font-medium text-slate-700">
            Username
          </Label>
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            placeholder="cth. admin"
            disabled={isSubmitting}
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            className={cn(errors.username && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20")}
            {...form.register("username")}
          />
          {errors.username ? (
            <p id="username-error" className="text-[13px] text-red-600" role="alert">
              {errors.username.message}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Gunakan username yang diberikan admin.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <LockKeyhole className="size-3" aria-hidden />
              Terenkripsi
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={cn(
                "pr-11",
                errors.password && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
              )}
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 size-8 -translate-y-1/2 rounded-lg text-slate-400 hover:text-slate-700"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          {errors.password ? (
            <p id="password-error" className="text-[13px] text-red-600" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="h-10 w-full rounded-lg text-[15px]" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Memeriksa…
            </>
          ) : (
            "Masuk ke Dashboard"
          )}
        </Button>

        {process.env.NODE_ENV === "development" ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2.5 text-center text-xs text-slate-600">
            Mode development — user: <strong className="text-slate-700">admin</strong> / password:{" "}
            <strong className="text-slate-700">Admin123!</strong>
          </p>
        ) : null}
      </form>
    </div>
  );
}
