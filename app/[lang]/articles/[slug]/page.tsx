import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  copyByLocale,
  getSiteUrl,
  isSiteLocale,
  type SiteLocale
} from '@/lib/site-config'
import { BookmarkToggle } from './bookmark-toggle'

export const dynamic = 'force-dynamic'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ArticlePageProps = Readonly<{
  params?: Promise<{
    lang?: string
    slug?: string
  }>
}>

function formatDate(locale: SiteLocale, value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(
    locale === 'ru' ? 'ru-RU' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  )
}

async function loadArticle(params: { lang: SiteLocale; slug: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: userRes } = await supabase.auth.getUser()

  const { data: article, error: articleError } = await supabase
    .from('article_public')
    .select(
      'id,slug,lang,title,description,date,updated_at,tags,tier,translation_key,preview_md,toc_md'
    )
    .eq('lang', params.lang)
    .eq('slug', params.slug)
    .maybeSingle()

  if (articleError) {
    throw new Error(`Failed to load article: ${articleError.message}`)
  }

  if (!article) {
    return { user: userRes.user, article: null, bodyMd: null as string | null }
  }

  if (!userRes.user) {
    return { user: null, article, bodyMd: null as string | null }
  }

  const { data: bodyRow, error: bodyError } = await supabase
    .from('article_body')
    .select('body_md')
    .eq('article_id', String(article.id))
    .maybeSingle()

  if (bodyError) {
    throw new Error(`Failed to load article body: ${bodyError.message}`)
  }

  return { user: userRes.user, article, bodyMd: bodyRow?.body_md ?? null }
}

export async function generateMetadata(props: ArticlePageProps): Promise<Metadata> {
  const params = await props.params
  const lang = params?.lang
  const slug = params?.slug

  if (!lang || !isSiteLocale(lang) || !slug || !slugPattern.test(slug)) {
    return {}
  }

  const { article } = await loadArticle({ lang, slug })
  if (!article) {
    return {}
  }

  const canonical = `/${lang}/articles/${encodeURIComponent(slug)}`

  return {
    title: String(article.title || ''),
    description: String(article.description || ''),
    metadataBase: new URL(getSiteUrl()),
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: String(article.title || ''),
      description: String(article.description || ''),
      images: [
        `/api/og?locale=${lang}&title=${encodeURIComponent(
          String(article.title || '')
        )}`
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: String(article.title || ''),
      description: String(article.description || ''),
      images: [
        `/api/og?locale=${lang}&title=${encodeURIComponent(
          String(article.title || '')
        )}`
      ]
    }
  }
}

export default async function ArticlePage(props: ArticlePageProps) {
  const params = await props.params
  const lang = params?.lang
  const slug = params?.slug

  if (!lang || !isSiteLocale(lang) || !slug || !slugPattern.test(slug)) {
    notFound()
  }

  const localized = copyByLocale[lang]
  const { user, article, bodyMd } = await loadArticle({ lang, slug })

  if (!article) {
    notFound()
  }

  const tags: string[] = Array.isArray(article.tags)
    ? article.tags.map(value => String(value).trim()).filter(Boolean)
    : []

  const tier = String(article.tier || 'free')
  const hasFullBody = Boolean(bodyMd)

  const loginHref = `/${lang}/login?next=${encodeURIComponent(
    `/${lang}/articles/${slug}`
  )}`

  const translationKey = String((article as any).translation_key || '').trim()
  const supabaseForBookmarks = user || translationKey ? await createSupabaseServerClient() : null

  let canonicalArticleId = String(article.id)
  if (translationKey && supabaseForBookmarks) {
    const { data: canonicalRow, error: canonicalError } = await supabaseForBookmarks
      .from('article_public')
      .select('id')
      .eq('lang', 'ru')
      .eq('translation_key', translationKey)
      .maybeSingle()

    if (!canonicalError && canonicalRow?.id) {
      canonicalArticleId = String(canonicalRow.id)
    }
  }

  let isBookmarked = false
  if (user && supabaseForBookmarks) {
    const { data: bookmarkRow, error: bookmarkError } = await supabaseForBookmarks
      .from('bookmarks')
      .select('article_id')
      .eq('user_id', user.id)
      .eq('article_id', canonicalArticleId)
      .maybeSingle()

    if (!bookmarkError && bookmarkRow) {
      isBookmarked = true
    }
  }

  return (
    <main className="dd-content">
      <p>
        <Link href={`/${lang}/articles`}>{localized.articles}</Link>
      </p>

      <h1>{String(article.title || '')}</h1>
      <p>{String(article.description || '')}</p>

      <p className="dd-article-meta">
        {formatDate(lang, String(article.date || ''))}
        {article.updated_at
          ? ` · updated ${formatDate(lang, String(article.updated_at))}`
          : ''}
        {tier === 'premium' ? ' · premium' : ''}
      </p>

      <BookmarkToggle
        lang={lang}
        loggedIn={Boolean(user)}
        loginHref={loginHref}
        articleId={canonicalArticleId}
        translationKey={translationKey}
        next={`/${lang}/articles/${slug}`}
        initialBookmarked={isBookmarked}
      />

      {tags.length > 0 ? (
        <div className="dd-tags" aria-label={localized.tags}>
          {tags.map(tag => (
            <Link
              key={`${slug}-${tag}`}
              href={`/${lang}/articles?tags=${encodeURIComponent(tag)}`}
              className="dd-tag"
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      <section aria-label="Article">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {hasFullBody ? String(bodyMd) : String(article.preview_md || '')}
        </ReactMarkdown>
      </section>

      {!hasFullBody ? (
        <p className="dd-article-meta">
          {!user ? (
            <>
              {lang === 'ru'
                ? 'Войдите, чтобы читать полный текст.'
                : 'Sign in to read the full article.'}{' '}
              <Link href={loginHref}>{lang === 'ru' ? 'Войти' : 'Sign in'}</Link>
            </>
          ) : tier === 'premium' ? (
            lang === 'ru'
              ? 'Это premium-статья. Подписка будет добавлена позже.'
              : 'This is a premium article. Subscription is coming soon.'
          ) : (
            lang === 'ru'
              ? 'Требуется авторизация.'
              : 'Authentication required.'
          )}
        </p>
      ) : null}
    </main>
  )
}
