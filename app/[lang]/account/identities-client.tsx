'use client'

import { useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { type SiteLocale } from '@/lib/site-config'

type AccountIdentitiesClientProps = Readonly<{
  lang: SiteLocale
  connectedProviders: string[]
}>

export function AccountIdentitiesClient({ lang, connectedProviders }: AccountIdentitiesClientProps) {
  const t = copy(lang)
  const connected = useMemo(() => new Set(connectedProviders), [connectedProviders])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link(provider: 'github' | 'google') {
    setError(null)
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()

      const isSecure = window.location.protocol === 'https:'
      const cookieParts = [
        `dd_auth_next=${encodeURIComponent(`/${lang}/account`)}`,
        'Path=/',
        'Max-Age=300',
        'SameSite=Lax'
      ]
      if (isSecure) cookieParts.push('Secure')
      document.cookie = cookieParts.join('; ')

      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo }
      })

      if (error) {
        setError(error.message)
        return
      }

      if (!data?.url) {
        setError(t.noUrl)
        return
      }

      window.location.assign(data.url)
    } finally {
      setBusy(false)
    }
  }

  const githubConnected = connected.has('github')
  const googleConnected = connected.has('google')

  return (
    <section aria-label={t.title}>
      <h2>{t.title}</h2>

      <div className="dd-tags" aria-label={t.actions}>
        <button
          type="button"
          className={githubConnected ? 'dd-tag selected' : 'dd-tag'}
          disabled={busy || githubConnected}
          onClick={() => link('github')}
          title={githubConnected ? t.alreadyLinked : t.linkGithub}
        >
          {githubConnected ? t.githubLinked : t.linkGithub}
        </button>

        <button
          type="button"
          className={googleConnected ? 'dd-tag selected' : 'dd-tag'}
          disabled={busy || googleConnected}
          onClick={() => link('google')}
          title={googleConnected ? t.alreadyLinked : t.linkGoogle}
        >
          {googleConnected ? t.googleLinked : t.linkGoogle}
        </button>
      </div>

      {error ? <p className="dd-article-meta">{error}</p> : null}
    </section>
  )
}

function copy(lang: SiteLocale) {
  if (lang === 'en') {
    return {
      title: 'Connected accounts',
      actions: 'Actions',
      linkGithub: 'Link GitHub',
      linkGoogle: 'Link Google',
      githubLinked: 'GitHub linked',
      googleLinked: 'Google linked',
      alreadyLinked: 'Already linked',
      noUrl: 'Auth redirect URL is missing.'
    }
  }

  return {
    title: 'Привязанные аккаунты',
    actions: 'Действия',
    linkGithub: 'Привязать GitHub',
    linkGoogle: 'Привязать Google',
    githubLinked: 'GitHub привязан',
    googleLinked: 'Google привязан',
    alreadyLinked: 'Уже привязано',
    noUrl: 'Не удалось получить ссылку для авторизации.'
  }
}
