import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { proxy as nextraLocalesProxy } from 'nextra/locales'

function requiredEnv(name: string, value: string | undefined): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return trimmed
}

function getSupabaseUrl(): string {
  return requiredEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_DD_COM_URL
  )
}

function getSupabaseAnonKey(): string {
  return requiredEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_DD_COM_PUBLISHABLE_APIKEY
  )
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  const response =
    host === 'www.deksden.com'
      ? (() => {
          const nextUrl = request.nextUrl.clone()
          nextUrl.host = 'deksden.com'
          return NextResponse.redirect(nextUrl, 308)
        })()
      : pathname === '/auth' || pathname.startsWith('/auth/')
        ? NextResponse.next({ request })
        : nextraLocalesProxy(request) || NextResponse.next({ request })

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options)
        }
      }
    }
  })

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest|_pagefind|.*\\..*).*)'
  ]
}
