'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { type SiteLocale } from '@/lib/site-config'

type LoginClientProps = Readonly<{
  lang: SiteLocale
  next: string
}>

export function LoginClient({ lang, next }: LoginClientProps) {
  const router = useRouter()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const t = copy(lang)

  async function signInWithOAuth(provider: 'github' | 'google') {
    setError(null)
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const isSecure = window.location.protocol === 'https:'
      const cookieParts = [
        `dd_auth_next=${encodeURIComponent(next)}`,
        'Path=/',
        'Max-Age=300',
        'SameSite=Lax'
      ]
      if (isSecure) cookieParts.push('Secure')
      document.cookie = cookieParts.join('; ')
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      })
      if (error) setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(error.message)
          return
        }
        router.push(next)
        router.refresh()
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }

      router.push(next)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="dd-content">
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>

      <div className="dd-tags" aria-label="Login mode">
        <button
          type="button"
          className={mode === 'signin' ? 'dd-tag selected' : 'dd-tag'}
          onClick={() => setMode('signin')}
          disabled={busy}
        >
          {t.signIn}
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'dd-tag selected' : 'dd-tag'}
          onClick={() => setMode('signup')}
          disabled={busy}
        >
          {t.signUp}
        </button>
      </div>

      <div className="dd-tags" aria-label="OAuth">
        <button
          type="button"
          className="dd-tag"
          onClick={() => signInWithOAuth('github')}
          disabled={busy}
        >
          {t.github}
        </button>
        <button
          type="button"
          className="dd-tag"
          onClick={() => signInWithOAuth('google')}
          disabled={busy}
        >
          {t.google}
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <p>
          <label>
            {t.email}
            <br />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
        </p>
        <p>
          <label>
            {t.password}
            <br />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </label>
        </p>

        <p>
          <button type="submit" className="dd-tag" disabled={busy}>
            {busy ? t.working : mode === 'signup' ? t.createAccount : t.signIn}
          </button>
        </p>

        {error ? <p className="dd-article-meta">{error}</p> : null}
      </form>
    </main>
  )
}

function copy(lang: SiteLocale) {
  if (lang === 'en') {
    return {
      title: 'Account',
      subtitle: 'Sign in to access free and premium content.',
      signIn: 'Sign in',
      signUp: 'Sign up',
      github: 'Continue with GitHub',
      google: 'Continue with Google',
      email: 'Email',
      password: 'Password',
      createAccount: 'Create account',
      working: 'Working…'
    }
  }

  return {
    title: 'Аккаунт',
    subtitle: 'Войдите, чтобы читать статьи.',
    signIn: 'Вход',
    signUp: 'Регистрация',
    github: 'Войти через GitHub',
    google: 'Войти через Google',
    email: 'Email',
    password: 'Пароль',
    createAccount: 'Создать аккаунт',
    working: 'Подождите…'
  }
}
