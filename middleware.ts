import { NextRequest } from 'next/server';
import { proxy } from './proxy';

// Next.js middleware must be exported as default with name 'middleware'
export default async function middleware(request: NextRequest) {
  // Add immediate logging to verify middleware is running
  // Use both console.log and console.error to ensure visibility
  const pathname = request.nextUrl.pathname;
  console.error('[MIDDLEWARE] ========== MIDDLEWARE CALLED ==========');
  console.error('[MIDDLEWARE] Pathname:', pathname);
  console.error('[MIDDLEWARE] URL:', request.url);
  console.error('[MIDDLEWARE] Method:', request.method);
  
  // Log cookies to verify they're being passed
  const cookies = request.headers.get('cookie');
  console.error('[MIDDLEWARE] Cookies present:', !!cookies);
  if (cookies) {
    const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]);
    console.error('[MIDDLEWARE] Cookie names:', cookieNames.join(', '));
  }
  
  return proxy(request);
}

// Middleware config - must be defined directly, not re-exported
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: API routes are included to handle token refresh
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

