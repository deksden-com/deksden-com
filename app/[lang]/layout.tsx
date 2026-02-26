import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { Footer, Layout } from 'nextra-theme-blog'
import { Head } from 'nextra/components'
import { SiteHeader } from '@/app/_components/site-header'
import { copyByLocale, getSiteUrl, isSiteLocale, siteConfig } from '@/lib/site-config'
import 'nextra-theme-blog/style.css'
import './styles.css'

const mono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500', '700']
})

type LayoutProps = Readonly<{
  children: React.ReactNode
  params?: Promise<{
    lang?: string
  }>
}>

export function generateStaticParams() {
  return siteConfig.locales.map(lang => ({ lang }))
}

export async function generateMetadata(props: LayoutProps): Promise<Metadata> {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    return {}
  }

  const localized = copyByLocale[lang]
  const siteUrl = getSiteUrl()

  return {
    title: {
      default: siteConfig.siteName,
      template: `%s - ${siteConfig.siteName}`
    },
    description: localized.subtitle,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ru: '/ru',
        en: '/en',
        'x-default': '/ru'
      }
    },
    openGraph: {
      type: 'website',
      locale: lang,
      title: siteConfig.siteName,
      description: localized.subtitle,
      siteName: siteConfig.siteName,
      images: [`/api/og?locale=${lang}&title=${encodeURIComponent(siteConfig.siteName)}`]
    },
    twitter: {
      card: 'summary_large_image'
    }
  }
}

export default async function RootLayout(props: LayoutProps) {
  const { children } = props
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    notFound()
  }

  const localized = copyByLocale[lang]

  return (
    <html lang={lang} className={mono.variable} suppressHydrationWarning>
      <Head
        backgroundColor={{ dark: '#050505', light: '#f9f9f9' }}
        color={{
          hue: { dark: 0, light: 0 },
          saturation: { dark: 0, light: 0 }
        }}
      />
      <body>
        <Layout>
          <SiteHeader locale={lang} />
          {children}
          <Footer>{localized.footer}</Footer>
        </Layout>
      </body>
    </html>
  )
}
