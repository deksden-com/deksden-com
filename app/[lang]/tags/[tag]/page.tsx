import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticles, getTagCounts } from '@/lib/articles'
import {
  copyByLocale,
  getSiteUrl,
  isSiteLocale,
  type SiteLocale
} from '@/lib/site-config'

export const dynamic = 'force-dynamic'
const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type TagPageProps = Readonly<{
  params?: Promise<{
    lang?: string
    tag?: string
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

function safeDecodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function generateMetadata(props: TagPageProps): Promise<Metadata> {
  const params = await props.params
  const lang = params?.lang
  if (!lang || !isSiteLocale(lang)) {
    return {}
  }

  const rawTag = params?.tag
  if (!rawTag) {
    return {}
  }

  const tag = safeDecodeSegment(rawTag).trim()
  if (!tag || !tagPattern.test(tag)) {
    return {}
  }
  const localized = copyByLocale[lang]
  const title = `${localized.filteredBy}: ${tag}`
  const canonical = `/${lang}/tags/${encodeURIComponent(tag)}`

  return {
    title,
    description: localized.subtitle,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical
    },
    openGraph: {
      type: 'website',
      title,
      description: localized.subtitle,
      images: [`/api/og?locale=${lang}&title=${encodeURIComponent(title)}`]
    }
  }
}

export default async function TagPage(props: TagPageProps) {
  const params = await props.params
  const lang = params?.lang
  if (!lang || !isSiteLocale(lang)) {
    notFound()
  }

  const rawTag = params?.tag
  if (!rawTag) {
    notFound()
  }

  const selectedTag = safeDecodeSegment(rawTag).trim()
  if (!selectedTag || !tagPattern.test(selectedTag)) {
    notFound()
  }

  const localized = copyByLocale[lang]
  const articles = await getArticles(lang)
  const visibleArticles = articles.filter(article =>
    article.tags.includes(selectedTag)
  )
  const previewArticles = visibleArticles.slice(0, 10)
  const viewAllHref = `/${lang}/articles?tags=${encodeURIComponent(selectedTag)}`

  return (
    <main className="dd-content">
      <p>
        <Link href={`/${lang}/tags`}>{localized.tags}</Link>
      </p>

      <h1>#{selectedTag}</h1>

      <section>
        <h2>
          <Link href={viewAllHref}>
            {localized.articles} ({visibleArticles.length})
          </Link>
        </h2>

        {visibleArticles.length === 0 ? (
          <p>{localized.noArticles}</p>
        ) : (
          <>
            <ul className="dd-article-list">
              {previewArticles.map(article => (
                <li key={article.slug} className="dd-article-item">
                  <article>
                    <h3>
                      <Link href={`/${lang}/articles/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p>{article.description}</p>
                    <p className="dd-article-meta">
                      {formatDate(lang, article.date)} · {localized.read}{' '}
                      {article.readingTimeMinutes} {localized.minutes}
                      {article.updatedAt
                        ? ` · updated ${formatDate(lang, article.updatedAt)}`
                        : ''}
                    </p>
                    <div className="dd-tags">
                      {article.tags.map(tag => (
                        <Link
                          key={`${article.slug}-${tag}`}
                          href={`/${lang}/tags/${encodeURIComponent(tag)}`}
                          className={
                            tag === selectedTag ? 'dd-tag selected' : 'dd-tag'
                          }
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            {visibleArticles.length > 10 ? (
              <p>
                <Link href={viewAllHref}>{localized.viewAll}</Link>
              </p>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
