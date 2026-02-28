import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { copyByLocale, isSiteLocale } from '@/lib/site-config'
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


  if (!data.user) {
    redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/account`)}`)
  }

  const { data: identitiesData } = await supabase.auth.getUserIdentities()

  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('kind,ends_at')
    .eq('kind', 'premium')

  const premium = isActivePremium(entitlements || [])
  const currentPlan: 'free' | 'premium' = premium ? 'premium' : 'free'

  const { data: bookmarkRows, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('article_id,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const bookmarks = !bookmarksError && Array.isArray(bookmarkRows) ? bookmarkRows : []
  const bookmarkArticleIds = bookmarks.map(row => String((row as any).article_id)).filter(Boolean)

  const { data: bookmarkArticles, error: bookmarkArticlesError } =
    bookmarkArticleIds.length > 0
      ? await supabase
          .from('article_public')
          .select('id,slug,lang,title,description,date,updated_at,tier')
          .in('id', bookmarkArticleIds)
      : { data: [], error: null }

  const bookmarkArticlesById = new Map<string, any>()
  if (!bookmarkArticlesError && Array.isArray(bookmarkArticles)) {
    for (const article of bookmarkArticles) {
      bookmarkArticlesById.set(String((article as any).id), article)
    }
  }


  const connectedProviders = Array.from(
    new Set((identitiesData?.identities || []).map(i => i.provider))
  )

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

      <AccountIdentitiesClient
        lang={lang}
        identities={(identitiesData?.identities || []).map(i => ({ provider: i.provider, identity_id: i.identity_id }))}
        connectedProviders={connectedProviders}
      />

      <p>
        <Link href={`/${lang}/pricing`}>{localized.pricing}</Link>
        {' · '}
        <Link href={`/${lang}/articles`}>{localized.articles}</Link>
      </p>

      <section aria-label="Bookmarks">
        <h2>{lang === 'ru' ? 'Закладки' : 'Bookmarks'}</h2>

        {bookmarksError ? (
          <p className="dd-article-meta">
            {lang === 'ru'
              ? 'Закладки пока не настроены на сервере.'
              : 'Bookmarks are not enabled on the server yet.'}
          </p>
        ) : bookmarks.length === 0 ? (
          <p className="dd-article-meta">
            {lang === 'ru' ? 'Пока пусто.' : 'Nothing here yet.'}
          </p>
        ) : (
          <ul className="dd-article-list">
            {bookmarks
              .map(row => {
                const article = bookmarkArticlesById.get(String((row as any).article_id))
                if (!article) return null
                const articleLang = String((article as any).lang || lang)
                const articleSlug = String((article as any).slug || '')
                const href = `/${articleLang}/articles/${articleSlug}`
                return (
                  <li key={String((row as any).article_id)} className="dd-article-item">
                    <article>
                      <h3>
                        <Link href={href}>{String((article as any).title || '')}</Link>
                      </h3>
                      <p>{String((article as any).description || '')}</p>
                      <div className="dd-tags">
                        <form action="/api/bookmarks/toggle" method="post">
                          <input type="hidden" name="lang" value={lang} />
                          <input type="hidden" name="article_id" value={String((row as any).article_id)} />
                          <input type="hidden" name="next" value={`/${lang}/account`} />
                          <button type="submit" className="dd-tag">
                            {lang === 'ru' ? 'Убрать из закладок' : 'Remove'}
                          </button>
                        </form>
                      </div>
                    </article>
                  </li>
                )
              })
              .filter(Boolean)}
          </ul>
        )}
      </section>

      <section aria-label="Subscription">
        <h2>{lang === 'ru' ? 'Подписка' : 'Subscription'}</h2>
        {premium ? (
          <form action="/api/billing/cancel" method="post">
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className="dd-tag">
              {lang === 'ru' ? 'Отменить подписку' : 'Cancel subscription'}
            </button>
          </form>
        ) : (
          <form action="/api/billing/checkout" method="post">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="plan" value="premium" />
            <input type="hidden" name="action" value="subscribe" />
            <button type="submit" className="dd-tag">
              {lang === 'ru' ? 'Перейти на Premium' : 'Upgrade to Premium'}
            </button>
          </form>
        )}
      </section>

      <section aria-label="Account actions">
        <h2>{lang === 'ru' ? 'Аккаунт' : 'Account'}</h2>
        <form action="/api/account/delete" method="post">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="plan" value={currentPlan} />
          <button type="submit" className="dd-tag">
            {lang === 'ru' ? 'Удалить аккаунт' : 'Delete account'}
          </button>
        </form>
      </section>

      <form action={`/auth/logout?next=${encodeURIComponent(`/${lang}`)}`} method="post">
        <button type="submit" className="dd-tag">
          {lang === 'ru' ? 'Выйти' : 'Sign out'}
        </button>
      </form>
    </main>
  )
}
