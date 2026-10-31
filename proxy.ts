import type { NextFetchEvent } from 'next/server';
import { handleMobileApiRequest, isSharedBackendApiPath } from '@/lib/mobile-bridge';
import type { ChainedMiddleware } from '@/lib/mobile-bridge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cabeçalhos de segurança aplicados a todas as respostas (defesa em profundidade).
// NÃO inclui X-Frame-Options nem CSP frame-ancestors para não bloquear a
// pré-visualização em iframe.
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '0',
};

async function __appMiddleware(_req: NextRequest) {
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.headers.set(key, value);
  }
  return res;
}

// shared-backend bridge patch v2 -- added for shared-backend mobile support.
// The app's original middleware is preserved as __appMiddleware.
const __chainedMiddleware = __appMiddleware as unknown as ChainedMiddleware;

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // --- shared backend (mobile) ---------------------------------------------
  // Handles CORS + bearer-token auth for /api/* and then delegates to the
  // app's own middleware, so existing guards keep applying.
  if (isSharedBackendApiPath(req.nextUrl.pathname)) {
    return handleMobileApiRequest(req, event, __chainedMiddleware);
  }
  // ------------------------------------------------------------------------
  return __chainedMiddleware(req, event);
}


export const config = {
  // Aplica a todas as rotas exceto os internos do framework e ficheiros estáticos.
  matcher: ['/((?!_next/|favicon.ico).*)'],
};