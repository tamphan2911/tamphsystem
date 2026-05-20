import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts
     * - images
     */
    '/((?!api|_next/static|_next/image|favicon.ico|fonts|images).*)',
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Parse the subdomain
  let currentHost = hostname
    .replace(`.tamph.com`, '')
    .replace(`.localhost:3000`, '');

  // If the host is exactly tamph.com or localhost:3000, we do not rewrite (serves from /(main))
  if (hostname === 'tamph.com' || hostname === 'localhost:3000') {
    // We can also block access to /admin, /learn, /research from the root domain if we want
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/learn') || url.pathname.startsWith('/research')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Rewrite subdomain requests to their respective paths
  if (currentHost === 'admin') {
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
  }
  
  if (currentHost === 'learn') {
    return NextResponse.rewrite(new URL(`/learn${url.pathname}`, req.url));
  }
  
  if (currentHost === 'research') {
    return NextResponse.rewrite(new URL(`/research${url.pathname}`, req.url));
  }

  return NextResponse.next();
}
