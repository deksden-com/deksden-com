'use client'

import { useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { type SiteLocale } from '@/lib/site-config'

type IdentityRef = Readonly<{ provider: string; identity_id: string }>

type AccountIdentitiesClientProps = Readonly<{
  lang: SiteLocale
  identities: IdentityRef[]
  connectedProviders: string[]
}>

export function AccountIdentitiesClient({ lang, identities, connectedProviders }: AccountIdentitiesClientProps) {
  const t = copy(lang)
  const connected = useMemo(() => new Set(connectedProviders), [connectedProviders])
  const identityByProvider = useMemo(() => {
    const map = new Map<string, IdentityRef>()
    for (const identity of identities) {
      if (!map.has(identity.provider)) map.set(identity.provider, identity)
    }
    return map
  }, [identities])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setNextCookie() {
    const isSecure = window.location.protocol === 'https:'
    const cookieParts = [
      `dd_auth_next=${encodeURIComponent(`/${lang}/account`)}`,
      'Path=/',
      'Max-Age=300',
      'SameSite=Lax'
    ]
    if (isSecure) cookieParts.push('Secure')
    document.cookie = cookieParts.join('; ')
  }

  async function link(provider: 'github' | 'google') {
    setError(null)
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()
      setNextCookie()

      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo }
      })

      if (error) {
        const hint = error.message.toLowerCase().includes('manual')
          ? ` ${t.manualLinkingHint}`
          : ''
        setError(`${error.message}${hint}`)
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

  async function unlink(provider: 'github' | 'google') {
    setError(null)

    const identity = identityByProvider.get(provider)
    if (!identity?.identity_id) {
      setError(t.noIdentity)
      return
    }

    if (identities.length <= 1) {
      setError(t.lastMethod)
      return
    }

    const ok = window.confirm(t.confirmUnlink(provider))
    if (!ok) return

    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.unlinkIdentity({
        provider,
        identity_id: identity.identity_id
      } as any)

      if (error) {
        const hint = error.message.toLowerCase().includes('manual')
          ? ` ${t.manualLinkingHint}`
          : ''
        setError(`${error.message}${hint}`)
        return
      }

      window.location.reload()
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
        {githubConnected ? (
          <span className="dd-tag selected dd-identity">
            <span>{t.githubLinked}</span>
            <button
              type="button"
              className="dd-identity-remove"
              disabled={busy}
              onClick={() => unlink('github')}
              title={t.unlink}
              aria-label={t.unlink}
            >
              ×
            </button>
          </span>
        ) : (
          <button type="button" className="dd-tag" disabled={busy} onClick={() => link('github')}>
            {t.linkGithub}
          </button>
        )}

        {googleConnected ? (
          <span className="dd-tag selected dd-identity">
            <span>{t.googleLinked}</span>
            <button
              type="button"
              className="dd-identity-remove"
              disabled={busy}
              onClick={() => unlink('google')}
              title={t.unlink}
              aria-label={t.unlink}
            >
              ×
            </button>
          </span>
        ) : (
          <button type="button" className="dd-tag" disabled={busy} onClick={() => link('google')}>
            {t.linkGoogle}
          </button>
        )}
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
      unlink: 'Unlink',
      noUrl: 'Auth redirect URL is missing.',
      noIdentity: 'Identity is missing.',
      lastMethod: 'Cannot unlink the last sign-in method.',
      manualLinkingHint: 'Enable Manual Linking in Supabase Auth settings.',
      confirmUnlink: (provider: 'github' | 'google') =>
        `Unlink ${provider}? You may lose access if you don't have another sign-in method.`
    }
  }

  return {
    title: 'Привязанные аккаунты',
    actions: 'Действия',
    linkGithub: 'Привязать GitHub',
    linkGoogle: 'Привязать Google',
    githubLinked: 'GitHub привязан',
    googleLinked: 'Google привязан',
    unlink: 'Отвязать',
    noUrl: 'Не удалось получить ссылку для авторизации.',
    noIdentity: 'Не удалось найти identity для провайдера.',
    lastMethod: 'Нельзя отвязать последний способ входа.',
    manualLinkingHint: 'Включите Manual Linking в настройках Supabase Auth.',
    confirmUnlink: (provider: 'github' | 'google') =>
      `Отвязать ${provider}? Если не будет другого способа входа, можно потерять доступ.`
  }
}
