import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTagCounts } from '@/lib/articles'
import { copyByLocale, getSiteUrl, isSiteLocale, type SiteLocale } from '@/lib/site-config'

type TagsIndexPageProps = Readonly<{
  params?: Promise<{
    lang?: string
  }>
}>

export async function generateMetadata(
  props: TagsIndexPageProps
): Promise<Metadata> {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    return {}
  }

  const localized = copyByLocale[lang]
  const title = localized.tags

  return {
    title,
    description: localized.subtitle,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: `/${lang}/tags`
    },
    openGraph: {
      type: 'website',
      title: `${title} - ${localized.articles}`,
      description: localized.subtitle,
      images: [`/api/og?locale=${lang}&title=${encodeURIComponent(title)}`]
    }
  }
}

export default async function TagsIndexPage(props: TagsIndexPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    notFound()
  }

  const localized = copyByLocale[lang]
  const tags = await getTagCounts(lang)

  return (
    <main className="dd-content">
      <h1>{localized.tags}</h1>
      <p>
        <Link href={`/${lang}/articles`}>{localized.articles}</Link>
      </p>

      {tags.length === 0 ? (
        <p>{localized.noArticles}</p>
      ) : (
        <div className="dd-tags" aria-label={localized.tags}>
          {tags.map(entry => (
            <Link
              key={entry.tag}
              href={`/${lang}/tags/${encodeURIComponent(entry.tag)}`}
              className="dd-tag"
            >
              {entry.tag} ({entry.count})
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

