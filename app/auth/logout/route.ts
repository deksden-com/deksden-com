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

async function signOutAndRedirect(request: Request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get('next') || undefined)

  const cookieStore = await cookies()
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

  await supabase.auth.signOut()

  // Important: for POST logout flows we must redirect with 303 so the browser follows with GET.
  return NextResponse.redirect(new URL(next, url.origin), 303)
}

export async function GET(request: Request) {
  return signOutAndRedirect(request)
}

export async function POST(request: Request) {
  return signOutAndRedirect(request)
}
