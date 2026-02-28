import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const allowedLangs = new Set(['ru', 'en'])

function safeLang(value: string | null): 'ru' | 'en' {
  return allowedLangs.has(value || '') ? (value as 'ru' | 'en') : 'ru'
}

function safeNext(value: string | null, fallback: string): string {
  const raw = (value || '').trim()
  if (raw.startsWith('/')) {
    return raw
  }
  return fallback
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const form = await request.formData()
  const lang = safeLang(form.get('lang')?.toString() || null)
  const articleId = (form.get('article_id')?.toString() || '').trim()

  const fallbackNext = `/${lang}/account`
  const next = safeNext(form.get('next')?.toString() || null, fallbackNext)

  if (!uuidPattern.test(articleId)) {
    const url = new URL(next, request.url)
    return NextResponse.redirect(url, 303)
  }

  const supabase = await createSupabaseServerClient()
  const { data: userRes } = await supabase.auth.getUser()

  if (!userRes.user) {
    const loginUrl = new URL(`/${lang}/login`, request.url)
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl, 303)
  }

  const { data: existing, error: selectError } = await supabase
    .from('bookmarks')
    .select('article_id')
    .eq('user_id', userRes.user.id)
    .eq('article_id', articleId)
    .maybeSingle()

  if (!selectError && existing) {
    await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userRes.user.id)
      .eq('article_id', articleId)
  } else {
    await supabase.from('bookmarks').insert({
      user_id: userRes.user.id,
      article_id: articleId
    })
  }

  const url = new URL(next, request.url)
  return NextResponse.redirect(url, 303)
}
