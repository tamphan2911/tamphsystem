import { NextResponse } from 'next/server';
import { auth } from './auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|fonts|images).*)'],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.roles?.[0]; // Assuming roles array

  let currentHost = hostname
    .replace(`.tamph.com`, '')
    .replace(`.localhost:3000`, '');

  // 1. Shared Global Routes (do not prefix with subdomains)
  if (url.pathname.startsWith('/login')) {
    if (isLoggedIn) {
      // If already logged in, go to admin if they are ADMIN, else home
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('https://admin.tamph.com', req.url));
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 2. Root Domain Routing
  if (hostname === 'tamph.com' || hostname === 'localhost:3000') {
    // Block direct access to subdomains from the root URL path
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/learn') || url.pathname.startsWith('/research')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 3. Subdomain Route Protection & Rewriting
  if (currentHost === 'admin') {
    // Protect Admin Subdomain
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const roles = (req.auth?.user as any)?.roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('MODERATOR')) {
      // If logged in but not an admin/moderator, send them to unauthorized page
      return NextResponse.redirect(new URL('https://tamph.com/401', req.url));
    }
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
  }
  
  if (currentHost === 'learn') {
    // Protect LMS
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const roles = (req.auth?.user as any)?.roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('LECTURER') && !roles.includes('STUDENT')) {
      return NextResponse.redirect(new URL('https://tamph.com/401', req.url));
    }
    return NextResponse.rewrite(new URL(`/learn${url.pathname}`, req.url));
  }
  
  if (currentHost === 'research') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const roles = (req.auth?.user as any).roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('CHIEF_ASSISTANT') && !roles.includes('ASSISTANT')) {
      return NextResponse.redirect(new URL('https://tamph.com/401', req.url));
    }
    return NextResponse.rewrite(new URL(`/research${url.pathname}`, req.url));
  }

  return NextResponse.next();
});
