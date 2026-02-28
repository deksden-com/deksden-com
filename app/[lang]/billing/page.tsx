import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { copyByLocale, getSiteUrl, isSiteLocale, siteConfig, type SiteLocale } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

type BillingPageProps = Readonly<{
  params?: Promise<{ lang?: string }>
  searchParams?: Promise<{ action?: string; plan?: string }>
}>

function isActivePremium(entitlements: Array<{ ends_at: string | null }> = []) {
  const now = Date.now()
  return entitlements.some(e => !e.ends_at || new Date(e.ends_at).getTime() > now)
}

function mailto(locale: SiteLocale, email: string | null, action: string, plan: string) {
  const subject =
    locale === 'ru'
      ? `Deksden: ${action} (${plan})`
      : `Deksden: ${action} (${plan})`

  const bodyLines =
    locale === 'ru'
      ? [
          'Привет!',
          '',
          `Хочу: ${action}.`,
          `План: ${plan}.`,
          email ? `Мой email в аккаунте: ${email}` : 'Я еще не вошел(ла) на сайт.',
          '',
          'Пожалуйста, пришлите ссылку на оплату (CloudPayments) / подтвердите действие.'
        ]
      : [
          'Hi!',
          '',
          `I want: ${action}.`,
          `Plan: ${plan}.`,
          email ? `My account email: ${email}` : "I'm not signed in yet.",
          '',
          'Please send me a payment link (CloudPayments) / confirm the action.'
        ]

  const body = bodyLines.join('\n')
  const href = `mailto:deksden@deksden.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return href
}

export async function generateMetadata(props: BillingPageProps): Promise<Metadata> {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) return {}

  const title = lang === 'ru' ? 'Платежи' : 'Billing'

  return {
    title,
    description: copyByLocale[lang].subtitle,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: `/${lang}/billing`,
      languages: {
        ru: '/ru/billing',
        en: '/en/billing',
        'x-default': '/ru/billing'
      }
    },
    openGraph: {
      type: 'website',
      title: `${title} - ${siteConfig.siteName}`,
      description: copyByLocale[lang].subtitle,
      images: [`/api/og?locale=${lang}&title=${encodeURIComponent(title)}`]
    }
  }
}

export default async function BillingPage(props: BillingPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) notFound()

  const params = (await props.searchParams) || {}
  const action = (params.action || 'subscribe').trim()
  const plan = (params.plan || 'premium').trim()

  const localized = copyByLocale[lang]
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  const { data: entitlements } = data.user
    ? await supabase.from('entitlements').select('kind,ends_at').eq('kind', 'premium')
    : { data: null }

  const premium = isActivePremium((entitlements as any) || [])
  const currentPlan = data.user && premium ? 'premium' : 'free'

  const headline =
    lang === 'ru'
      ? 'Платежная система: скоро'
      : 'Payments: coming soon'

  const description =
    lang === 'ru'
      ? 'Premium продаётся вручную. Напишите на email — я пришлю ссылку на оплату (CloudPayments) или помогу с действием.'
      : 'Premium is sold manually for now. Email me and I will send a CloudPayments link or help with the action.'

  const actionLine =
    lang === 'ru'
      ? `Действие: ${action}. План: ${plan}. Текущий план: ${currentPlan}.`
      : `Action: ${action}. Plan: ${plan}. Current plan: ${currentPlan}.`

  const emailHref = mailto(lang, data.user?.email || null, action, plan)

  return (
    <main className="dd-content">
      <h1>{headline}</h1>
      <p className="dd-article-meta">{description}</p>
      <p className="dd-article-meta">{actionLine}</p>

      {!data.user ? (
        <p className="dd-article-meta">
          {lang === 'ru'
            ? 'Рекомендация: сначала войдите в аккаунт, чтобы подписку было проще привязать.'
            : 'Tip: sign in first so I can attach the subscription to your account.'}
        </p>
      ) : null}

      <div className="dd-tags" aria-label="Billing actions">
        {!data.user ? (
          <Link href={`/${lang}/login?next=${encodeURIComponent(`/${lang}/pricing`)}`} className="dd-tag">
            {lang === 'ru' ? 'Войти' : 'Sign in'}
          </Link>
        ) : null}

        <a className="dd-tag" href={emailHref}>
          {lang === 'ru' ? 'Написать на deksden@deksden.com' : 'Email deksden@deksden.com'}
        </a>

        <Link href={`/${lang}/pricing`} className="dd-tag">
          {lang === 'ru' ? 'Назад к ценам' : 'Back to pricing'}
        </Link>

        <Link href={`/${lang}/account`} className="dd-tag">
          {lang === 'ru' ? 'В аккаунт' : 'Account'}
        </Link>

        <Link href={`/${lang}/articles`} className="dd-tag">
          {localized.articles}
        </Link>
      </div>
    </main>
  )
}
