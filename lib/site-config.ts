export const siteConfig = {
  siteName: 'Deksden',
  domain: 'deksden.com',
  defaultLocale: 'ru',
  locales: ['ru', 'en'] as const
} as const

export type SiteLocale = (typeof siteConfig.locales)[number]

export function isSiteLocale(value: string): value is SiteLocale {
  return siteConfig.locales.includes(value as SiteLocale)
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || `https://${siteConfig.domain}`
}

export const copyByLocale: Record<
  SiteLocale,
  {
    home: string
    articles: string
    subtitle: string
    footer: string
    noArticles: string
    filteredBy: string
    read: string
    minutes: string
    backToAll: string
  }
> = {
  ru: {
    home: 'Главная',
    articles: 'Статьи',
    subtitle: 'Личный сайт и каталог статей.',
    footer: 'Контент публикуется через Git.',
    noArticles: 'Пока нет опубликованных статей.',
    filteredBy: 'Фильтр по тегу',
    read: 'Чтение',
    minutes: 'мин',
    backToAll: 'Показать все'
  },
  en: {
    home: 'Home',
    articles: 'Articles',
    subtitle: 'Personal site and article catalog.',
    footer: 'Content is published via Git.',
    noArticles: 'No published articles yet.',
    filteredBy: 'Filtered by tag',
    read: 'Read',
    minutes: 'min',
    backToAll: 'Show all'
  }
}
