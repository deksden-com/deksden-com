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

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') || '').includes('application/json')
}

async function resolveCanonicalArticleId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  articleId: string,
  translationKey: string
): Promise<string> {
  if (translationKey) {
    const { data, error } = await supabase
      .from('article_public')
      .select('id')
      .eq('lang', 'ru')
      .eq('translation_key', translationKey)
      .maybeSingle()

    if (!error && data?.id) {
      return String(data.id)
    }
  }

  return articleId
}

export async function POST(request: Request) {
  const json = wantsJson(request)

  const form = await request.formData()
  const lang = safeLang(form.get('lang')?.toString() || null)

  const articleId = (form.get('article_id')?.toString() || '').trim()
  const translationKey = (form.get('translation_key')?.toString() || '').trim()

  const fallbackNext = `/${lang}/account`
  const next = safeNext(form.get('next')?.toString() || null, fallbackNext)

  if (!translationKey && !uuidPattern.test(articleId)) {
    if (json) {
      return NextResponse.json({ error: 'invalid_article' }, { status: 400 })
    }
    return NextResponse.redirect(new URL(next, request.url), 303)
  }

  const supabase = await createSupabaseServerClient()
  const { data: userRes } = await supabase.auth.getUser()

  if (!userRes.user) {
    const loginUrl = new URL(`/${lang}/login`, request.url)
    loginUrl.searchParams.set('next', next)

    if (json) {
      return NextResponse.json({ error: 'unauthorized', login: loginUrl.pathname + loginUrl.search }, { status: 401 })
    }

    return NextResponse.redirect(loginUrl, 303)
  }

  const canonicalArticleId = await resolveCanonicalArticleId(
    supabase,
    articleId,
    translationKey
  )

  if (!uuidPattern.test(canonicalArticleId)) {
    if (json) {
      return NextResponse.json({ error: 'invalid_canonical_article' }, { status: 400 })
    }
    return NextResponse.redirect(new URL(next, request.url), 303)
  }

  const userId = userRes.user.id

  const { data: existing, error: existingError } = await supabase
    .from('bookmarks')
    .select('article_id')
    .eq('user_id', userId)
    .eq('article_id', canonicalArticleId)
    .maybeSingle()

  if (existingError) {
    if (json) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }
    return NextResponse.redirect(new URL(next, request.url), 303)
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', canonicalArticleId)

    if (deleteError) {
      if (json) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
      return NextResponse.redirect(new URL(next, request.url), 303)
    }

    if (json) {
      return NextResponse.json({ bookmarked: false })
    }

    return NextResponse.redirect(new URL(next, request.url), 303)
  }

  const { error: insertError } = await supabase.from('bookmarks').insert({
    user_id: userId,
    article_id: canonicalArticleId
  })

  if (insertError) {
    if (json) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    return NextResponse.redirect(new URL(next, request.url), 303)
  }

  if (json) {
    return NextResponse.json({ bookmarked: true })
  }

  return NextResponse.redirect(new URL(next, request.url), 303)
}
