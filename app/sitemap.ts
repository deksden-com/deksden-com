import type { MetadataRoute } from 'next'
import { getArticles, getTagCounts } from '@/lib/articles'
import { getSiteUrl, siteConfig } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()

  const basePages: MetadataRoute.Sitemap = siteConfig.locales.flatMap(locale => [
    {
      url: `${siteUrl}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${siteUrl}/${locale}/articles`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${siteUrl}/${locale}/tags`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6
    }
  ])

  const articlePages = (
    await Promise.all(
      siteConfig.locales.map(async locale => {
        const articles = await getArticles(locale)
        return articles.map(article => ({
          url: `${siteUrl}/${locale}/articles/${article.slug}`,
          lastModified: new Date(article.updatedAt || article.date),
          changeFrequency: 'monthly' as const,
          priority: 0.8
        }))
      })
    )
  ).flat()

  const tagPages = (
    await Promise.all(
      siteConfig.locales.map(async locale => {
        const tags = await getTagCounts(locale)
        return tags.map(tag => ({
          url: `${siteUrl}/${locale}/tags/${encodeURIComponent(tag.tag)}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.5
        }))
      })
    )
  ).flat()

  return [...basePages, ...articlePages, ...tagPages]
}
