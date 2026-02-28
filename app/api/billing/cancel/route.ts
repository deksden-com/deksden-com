import { NextResponse } from 'next/server'

const allowedLangs = new Set(['ru', 'en'])

function safeLang(value: string | null): 'ru' | 'en' {
  return allowedLangs.has(value || '') ? (value as 'ru' | 'en') : 'ru'
}

export async function POST(request: Request) {
  const form = await request.formData()
  const lang = safeLang(form.get('lang')?.toString() || null)

  const url = new URL(`/${lang}/billing`, request.url)
  url.searchParams.set('action', 'cancel')

  return NextResponse.redirect(url, 303)
}
