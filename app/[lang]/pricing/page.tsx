import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { copyByLocale, getSiteUrl, isSiteLocale, siteConfig } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

type PricingPageProps = Readonly<{
  params?: Promise<{ lang?: string }>
}>

function isActivePremium(entitlements: Array<{ ends_at: string | null }> = []) {
  const now = Date.now()
  return entitlements.some(e => !e.ends_at || new Date(e.ends_at).getTime() > now)
}

export async function generateMetadata(props: PricingPageProps): Promise<Metadata> {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) return {}

  const localized = copyByLocale[lang]
  const title = localized.pricing

  return {
    title,
    description: localized.subtitle,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: `/${lang}/pricing`,
      languages: {
        ru: '/ru/pricing',
        en: '/en/pricing',
        'x-default': '/ru/pricing'
      }
    },
    openGraph: {
      type: 'website',
      title: `${title} - ${siteConfig.siteName}`,
      description: localized.subtitle,
      images: [`/api/og?locale=${lang}&title=${encodeURIComponent(title)}`]
    }
  }
}

export default async function PricingPage(props: PricingPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) notFound()

  const localized = copyByLocale[lang]
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  const { data: entitlements } = data.user
    ? await supabase.from('entitlements').select('kind,ends_at').eq('kind', 'premium')
    : { data: null }

  const premium = isActivePremium((entitlements as any) || [])
  const currentPlan: 'free' | 'premium' = data.user && premium ? 'premium' : 'free'

  return (
    <main className="dd-content">
      <h1>{localized.pricing}</h1>

      <p className="dd-article-meta">
        {lang === 'ru'
          ? 'Premium сейчас продаётся вручную: после клика мы покажем страницу с инструкцией.'
          : 'Premium is currently sold manually: after clicking we show instructions.'}
      </p>

      <div className="dd-plan-grid" aria-label={localized.pricing}>
        <section className={currentPlan === 'free' ? 'dd-plan current' : 'dd-plan'}>
          <h2>{lang === 'ru' ? 'Free' : 'Free'}</h2>
          <p className="dd-plan-price">0₽</p>
          <ul className="dd-plan-list">
            <li>{lang === 'ru' ? 'Каталог статей, теги, поиск, превью' : 'Catalog, tags, search, previews'}</li>
            <li>{lang === 'ru' ? 'После входа: доступ к free-контенту' : 'After sign-in: access to free content'}</li>
          </ul>

          {data.user ? (
            currentPlan === 'free' ? (
              <span className="dd-tag selected">{lang === 'ru' ? 'Текущий план' : 'Current plan'}</span>
            ) : (
              <form action="/api/billing/cancel" method="post">
                <input type="hidden" name="lang" value={lang} />
                <button type="submit" className="dd-tag">
                  {lang === 'ru' ? 'Перейти на Free' : 'Switch to Free'}
                </button>
              </form>
            )
          ) : (
            <span className="dd-tag selected">{lang === 'ru' ? 'Доступно всем' : 'Available to everyone'}</span>
          )}
        </section>

        <section className={currentPlan === 'premium' ? 'dd-plan current' : 'dd-plan'}>
          <h2>{lang === 'ru' ? 'Premium' : 'Premium'}</h2>
          <p className="dd-plan-price">1495₽ / {lang === 'ru' ? 'мес' : 'mo'}</p>
          <ul className="dd-plan-list">
            <li>{lang === 'ru' ? 'Весь free-контент' : 'All free content'}</li>
            <li>{lang === 'ru' ? 'Premium-контент' : 'Premium content'}</li>
            <li>{lang === 'ru' ? 'Поддержка проекта' : 'Supports the project'}</li>
          </ul>

          {currentPlan === 'premium' ? (
            <span className="dd-tag selected">{lang === 'ru' ? 'Текущий план' : 'Current plan'}</span>
          ) : (
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="plan" value="premium" />
              <input type="hidden" name="action" value="subscribe" />
              <button type="submit" className="dd-tag">
                {lang === 'ru' ? (data.user ? 'Перейти на Premium' : 'Подписаться') : data.user ? 'Switch to Premium' : 'Subscribe'}
              </button>
            </form>
          )}
        </section>
      </div>

      <p>
        <Link href={`/${lang}/account`}>{lang === 'ru' ? 'Личный кабинет' : 'Account'}</Link>
        {' · '}
        <Link href={`/${lang}/articles`}>{localized.articles}</Link>
      </p>
    </main>
  )
}
