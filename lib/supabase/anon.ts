import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function requiredEnv(name: string, value: string | undefined): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return trimmed
}

export function getSupabaseUrl(): string {
  return requiredEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_DD_COM_URL
  )
}

export function getSupabaseAnonKey(): string {
  return requiredEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_DD_COM_PUBLISHABLE_APIKEY
  )
}

export function createSupabaseAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
