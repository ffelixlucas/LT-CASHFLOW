import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  if (isApiRequest) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const signInUrl = new URL("/entrar", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/assistant/:path*", "/api/reconciliacao/:path*"],
};
