import { NextResponse, type NextRequest } from 'next/server'
import { proxy as nextraLocalesProxy } from 'nextra/locales'

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (host === 'www.deksden.com') {
    const nextUrl = request.nextUrl.clone()
    nextUrl.host = 'deksden.com'
    return NextResponse.redirect(nextUrl, 308)
  }
  return nextraLocalesProxy(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest|_pagefind|.*\\..*).*)'
  ]
}
