import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticles, getTagCounts } from '@/lib/articles'
import {
  copyByLocale,
  getSiteUrl,
  isSiteLocale,
  siteConfig,
  type SiteLocale
} from '@/lib/site-config'

type ArticlesPageProps = Readonly<{
  params?: Promise<{
    lang?: string
  }>
  searchParams: Promise<{
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

export async function generateMetadata(props: ArticlesPageProps): Promise<Metadata> {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    return {}
  }

  const localized = copyByLocale[lang]
  return {
    title: localized.articles,
    description: localized.subtitle,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: `/${lang}/articles`,
      languages: {
        ru: '/ru/articles',
        en: '/en/articles',
        'x-default': '/ru/articles'
      }
    },
    openGraph: {
      type: 'website',
      title: `${localized.articles} - ${siteConfig.siteName}`,
      description: localized.subtitle,
      images: [
        `/api/og?locale=${lang}&title=${encodeURIComponent(localized.articles)}`
      ]
    }
  }
}

export default async function ArticlesPage(props: ArticlesPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    notFound()
  }

  const localized = copyByLocale[lang]
  const { tag: selectedTag } = await props.searchParams
  const [articles, tags] = await Promise.all([
    getArticles(lang),
    getTagCounts(lang)
  ])

  const visibleArticles = selectedTag
    ? articles.filter(article => article.tags.includes(selectedTag))
    : articles

  return (
    <main className="dd-content">
      <h1>{localized.articles}</h1>
      <p>{localized.subtitle}</p>

      <div className="dd-tags">
        {tags.map(tag => (
          <Link
            key={tag.tag}
            href={`/${lang}/articles?tag=${encodeURIComponent(tag.tag)}`}
            className="dd-tag"
          >
            {tag.tag} ({tag.count})
          </Link>
        ))}
      </div>

      {selectedTag ? (
        <p>
          {localized.filteredBy}: <strong>{selectedTag}</strong>{' '}
          <Link href={`/${lang}/articles`}>{localized.backToAll}</Link>
        </p>
      ) : null}

      {visibleArticles.length === 0 ? (
        <p>{localized.noArticles}</p>
      ) : (
        <ul className="dd-article-list">
          {visibleArticles.map(article => (
            <li key={article.slug} className="dd-article-item">
              <article>
                <h2>
                  <Link href={`/${lang}/articles/${article.slug}`}>
                    {article.title}
                  </Link>
                </h2>
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
                      href={`/${lang}/articles?tag=${encodeURIComponent(tag)}`}
                      className="dd-tag"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
