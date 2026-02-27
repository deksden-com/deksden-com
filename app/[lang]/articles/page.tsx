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

const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ArticlesPageProps = Readonly<{
  params?: Promise<{
    lang?: string
  }>
  searchParams: Promise<{
    tags?: string
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

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseSelectedTags(input: { tags?: string; tag?: string }): string[] {
  const raw = (input.tags || input.tag || '').trim()
  if (!raw) {
    return []
  }

  const decoded = safeDecode(raw)
  const parts = decoded.split(',').map(value => value.trim()).filter(Boolean)
  const unique = new Set<string>()

  for (const part of parts) {
    if (tagPattern.test(part)) {
      unique.add(part)
    }
  }

  return [...unique].sort((a, b) => a.localeCompare(b))
}

function encodeTagsQuery(tags: string[]): string {
  return tags.map(value => encodeURIComponent(value)).join(',')
}

function buildArticlesHref(lang: SiteLocale, selectedTags: string[]): string {
  if (selectedTags.length === 0) {
    return `/${lang}/articles`
  }
  return `/${lang}/articles?tags=${encodeTagsQuery(selectedTags)}`
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
  const selectedTags = parseSelectedTags(await props.searchParams)
  const [articles, allTags] = await Promise.all([
    getArticles(lang),
    getTagCounts(lang)
  ])

  const visibleArticles =
    selectedTags.length > 0
      ? articles.filter(article =>
          selectedTags.every(tag => article.tags.includes(tag))
        )
      : articles

  const tagCountsByTag = new Map<string, number>()
  for (const entry of allTags) {
    tagCountsByTag.set(entry.tag, 0)
  }
  for (const article of visibleArticles) {
    for (const tag of article.tags) {
      tagCountsByTag.set(tag, (tagCountsByTag.get(tag) || 0) + 1)
    }
  }

  const visibleTagEntries = allTags.filter(entry => {
    const count = tagCountsByTag.get(entry.tag) || 0
    const isSelected = selectedTags.includes(entry.tag)
    return isSelected || count > 0
  })

  return (
    <main className="dd-content">
      <h1>{localized.articles}</h1>
      <p>{localized.subtitle}</p>

      <p>
        <Link href={`/${lang}/tags`}>{localized.tags}:</Link>
      </p>

      <div className="dd-tags" aria-label={localized.tags}>
        {visibleTagEntries.map(entry => {
          const isSelected = selectedTags.includes(entry.tag)
          const nextSelected = isSelected
            ? selectedTags.filter(tag => tag !== entry.tag)
            : [...selectedTags, entry.tag].sort((a, b) => a.localeCompare(b))
          const count = tagCountsByTag.get(entry.tag) || 0
          return (
            <Link
              key={entry.tag}
              href={buildArticlesHref(lang, nextSelected)}
              className={isSelected ? 'dd-tag selected' : 'dd-tag'}
            >
              {entry.tag} ({count})
            </Link>
          )
        })}
      </div>

      {selectedTags.length > 0 ? (
        <section aria-label={localized.filteredBy}>
          <p>
            {localized.filteredBy}: <strong>{selectedTags.join(', ')}</strong>
          </p>
          <div className="dd-tags">
            {selectedTags.map(tag => (
              <Link
                key={`selected-${tag}`}
                href={buildArticlesHref(
                  lang,
                  selectedTags.filter(item => item !== tag)
                )}
                className="dd-tag selected"
                title={`${localized.filteredBy}: ${selectedTags.join(', ')}`}
              >
                #{tag} ×
              </Link>
            ))}
            {selectedTags.length >= 2 ? (
              <Link href={`/${lang}/articles`} className="dd-tag">
                {localized.backToAll}
              </Link>
            ) : null}
          </div>
        </section>
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
                      href={buildArticlesHref(lang, [tag])}
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
