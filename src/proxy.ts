import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/env";

const LOGIN_PATH = "/admin/login";
const ADMIN_PATH = "/admin";

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

/** Copia las cookies renovadas al response de una redirección. */
function redirectWithCookies(url: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);

  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

/**
 * Refresco optimista de la sesión del panel. La autorización real vive en
 * `getAdminAccess()` y en las RPC; aquí solo se redirige para no mostrar el
 * panel a quien no tiene sesión.
 */
export async function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const isLoginPath = pathname === LOGIN_PATH;
  const env = getSupabaseEnv();

  if (!env) {
    // Sin configuración no puede haber sesión: el panel va al login.
    if (isLoginPath) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  if (user && isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_PATH;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
