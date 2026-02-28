import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

function safeNext(value: string | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//')) return '/'
  return raw
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  const cookieStore = await cookies()
  const nextCookie = cookieStore.get('dd_auth_next')?.value
  const next = safeNext(nextCookie ? decodeURIComponent(nextCookie) : undefined)

  cookieStore.set('dd_auth_next', '', {
    path: '/',
    maxAge: 0
  })

  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin))
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options)
        }
      }
    }
  })

  await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL(next, url.origin))
}
