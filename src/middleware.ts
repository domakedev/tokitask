import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware simplificado - la autenticación se maneja en el client-side
  // Esto permite logging o futuras funcionalidades server-side

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};