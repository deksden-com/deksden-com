import { NextResponse } from 'next/server'

const allowedLangs = new Set(['ru', 'en'])

function safeLang(value: string | null): 'ru' | 'en' {
  return allowedLangs.has(value || '') ? (value as 'ru' | 'en') : 'ru'
}

export async function POST(request: Request) {
  const form = await request.formData()
  const lang = safeLang(form.get('lang')?.toString() || null)
  const plan = (form.get('plan')?.toString() || 'free').trim()

  const url = new URL(`/${lang}/billing`, request.url)
  url.searchParams.set('action', 'delete_account')
  url.searchParams.set('plan', plan)

  return NextResponse.redirect(url, 303)
}
