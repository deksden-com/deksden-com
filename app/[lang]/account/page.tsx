import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { copyByLocale, isSiteLocale, type SiteLocale } from '@/lib/site-config'
import { AccountIdentitiesClient } from './identities-client'

export const dynamic = 'force-dynamic'

type AccountPageProps = Readonly<{
  params?: Promise<{
    lang?: string
  }>
}>

function isActivePremium(entitlements: Array<{ ends_at: string | null }> = []) {
  const now = Date.now()
  return entitlements.some(e => !e.ends_at || new Date(e.ends_at).getTime() > now)
}

export default async function AccountPage(props: AccountPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    redirect('/ru/login')
  }

  const localized = copyByLocale[lang]
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  const { data: identitiesData } = await supabase.auth.getUserIdentities()

  if (!data.user) {
    redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/account`)}`)
  }

  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('kind,ends_at')
    .eq('kind', 'premium')

  const premium = isActivePremium(entitlements || [])

  const connectedProviders = (identitiesData?.identities || []).map(i => i.provider)

  return (
    <main className="dd-content">
      <h1>{lang === 'ru' ? 'Личный кабинет' : 'Account'}</h1>

      <p className="dd-article-meta">
        {lang === 'ru' ? 'Email' : 'Email'}: {data.user.email || '—'}
      </p>

      <p className="dd-article-meta">
        {lang === 'ru' ? 'Тариф' : 'Plan'}: {premium ? 'premium' : 'free'}
      </p>

      <p className="dd-article-meta">
        {lang === 'ru' ? 'Способы входа' : 'Sign-in methods'}: {connectedProviders.join(', ') || '—'}
      </p>

      <AccountIdentitiesClient lang={lang} connectedProviders={connectedProviders} />

      <p>
        <Link href={`/${lang}/articles`}>{localized.articles}</Link>
      </p>

      <form action={`/auth/logout?next=${encodeURIComponent(`/${lang}`)}`} method="post">
        <button type="submit" className="dd-tag">
          {lang === 'ru' ? 'Выйти' : 'Sign out'}
        </button>
      </form>
    </main>
  )
}
