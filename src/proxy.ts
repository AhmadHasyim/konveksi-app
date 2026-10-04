import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Next.js 16: file `proxy.ts` menggantikan `middleware.ts` (deprecated).
 * Berjalan sebelum route dirender: melindungi area dashboard dan
 * menjauhkan user yang sudah login dari halaman login.
 *
 * Catatan keamanan: proxy HANYA gerbang UX. Otorisasi yang
 * sebenarnya tetap diperiksa di setiap server component/action
 * melalui helper requirePermission()/requireRole().
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isLoginPage = pathname === "/login";
  const isProtected =
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/penjualan") ||
    pathname.startsWith("/produksi") ||
    pathname.startsWith("/persediaan") ||
    pathname.startsWith("/hr") ||
    pathname.startsWith("/laporan") ||
    pathname.startsWith("/pengaturan");

  if (!isLoggedIn && isProtected && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
