import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { isSiteLocale, type SiteLocale } from '@/lib/site-config'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ArticleFrontmatter = {
  title: string
  description: string
  date: string
  slug: string
  lang: SiteLocale
  tags: string[]
  draft: boolean
  translationKey?: string
  updatedAt?: string
  cover?: string
  canonical?: string
}

export type ArticleCard = {
  title: string
  description: string
  date: string
  updatedAt: string | undefined
  slug: string
  lang: SiteLocale
  tags: string[]
  readingTimeMinutes: number
  translationKey: string | undefined
}

function parseArticleFrontmatter(
  data: Record<string, unknown>,
  locale: SiteLocale,
  fileSlug: string,
  filePath: string
): ArticleFrontmatter {
  const title = String(data.title || '').trim()
  const description = String(data.description || '').trim()
  const date = String(data.date || '').trim()
  const slug = String(data.slug || '').trim()
  const lang = String(data.lang || '').trim()
  const tags = Array.isArray(data.tags)
    ? data.tags.map(value => String(value).trim()).filter(Boolean)
    : []
  const draft = Boolean(data.draft)
  const updatedAt = String(data.updatedAt || '').trim() || undefined
  const translationKey = String(data.translationKey || '').trim() || undefined
  const cover = String(data.cover || '').trim() || undefined
  const canonical = String(data.canonical || '').trim() || undefined

  if (!title || !description || !date || !slug) {
    throw new Error(`Missing required frontmatter in ${filePath}`)
  }
  if (!isSiteLocale(lang) || lang !== locale) {
    throw new Error(`Invalid lang frontmatter in ${filePath}`)
  }
  if (!slugPattern.test(slug) || !slugPattern.test(fileSlug)) {
    throw new Error(`Invalid slug format in ${filePath}`)
  }
  if (slug !== fileSlug) {
    throw new Error(`Frontmatter slug must match filename in ${filePath}`)
  }

  return {
    title,
    description,
    date,
    slug,
    lang,
    tags,
    draft,
    updatedAt,
    translationKey,
    cover,
    canonical
  }
}

export async function getArticles(locale: SiteLocale): Promise<ArticleCard[]> {
  const articlesDir = path.join(process.cwd(), 'content', locale, 'articles')
  let entries: string[] = []

  try {
    entries = await fs.readdir(articlesDir)
  } catch {
    return []
  }

  const mdxFiles = entries.filter(
    fileName => fileName.endsWith('.mdx') && !fileName.startsWith('_')
  )

  const cards = await Promise.all(
    mdxFiles.map(async fileName => {
      const filePath = path.join(articlesDir, fileName)
      const raw = await fs.readFile(filePath, 'utf8')
      const parsed = matter(raw)
      const fileSlug = fileName.replace(/\.mdx$/, '')
      const frontmatter = parseArticleFrontmatter(
        parsed.data as Record<string, unknown>,
        locale,
        fileSlug,
        filePath
      )

      if (frontmatter.draft) {
        return null
      }

      return {
        title: frontmatter.title,
        description: frontmatter.description,
        date: frontmatter.date,
        updatedAt: frontmatter.updatedAt,
        slug: frontmatter.slug,
        lang: frontmatter.lang,
        tags: frontmatter.tags,
        readingTimeMinutes: Math.max(
          1,
          Math.round(readingTime(parsed.content).minutes)
        ),
        translationKey: frontmatter.translationKey
      } satisfies ArticleCard
    })
  )

  const publishedCards = cards.filter(
    (card): card is ArticleCard => card !== null
  )

  return publishedCards.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getTagCounts(locale: SiteLocale): Promise<
  Array<{
    tag: string
    count: number
  }>
> {
  const articles = await getArticles(locale)
  const counts = new Map<string, number>()

  for (const article of articles) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}
