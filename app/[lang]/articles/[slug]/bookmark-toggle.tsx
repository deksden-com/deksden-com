'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'

type BookmarkToggleProps = {
  lang: 'ru' | 'en'
  loggedIn: boolean
  loginHref: string
  articleId: string
  translationKey: string
  next: string
  initialBookmarked: boolean
}

export function BookmarkToggle(props: BookmarkToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [bookmarked, setBookmarked] = useState(props.initialBookmarked)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(() => {
    const form = new FormData()
    form.set('lang', props.lang)
    form.set('article_id', props.articleId)
    form.set('translation_key', props.translationKey)
    form.set('next', props.next)
    return form
  }, [props.lang, props.articleId, props.translationKey, props.next])

  const onToggle = useCallback(async () => {
    setError(null)

    try {
      const res = await fetch('/api/bookmarks/toggle', {
        method: 'POST',
        body: payload,
        headers: {
          accept: 'application/json'
        }
      })

      if (res.status === 401) {
        router.push(props.loginHref)
        return
      }

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Bookmark toggle failed')
        return
      }

      const json = (await res.json()) as { bookmarked?: boolean }
      if (typeof json.bookmarked === 'boolean') {
        setBookmarked(json.bookmarked)
      } else {
        setBookmarked(prev => !prev)
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (e) {
      setError(String(e))
    }
  }, [payload, props.loginHref, router, startTransition])

  if (!props.loggedIn) {
    return (
      <div className="dd-tags" aria-label="Bookmarks">
        <Link href={props.loginHref} className="dd-tag">
          {props.lang === 'ru'
            ? 'Войти, чтобы добавить в закладки'
            : 'Sign in to bookmark'}
        </Link>
      </div>
    )
  }

  return (
    <div className="dd-tags" aria-label="Bookmarks">
      {bookmarked ? (
        <span className="dd-tag selected">
          {props.lang === 'ru' ? 'В закладках!' : 'Bookmarked!'}
        </span>
      ) : null}

      <button type="button" className={bookmarked ? 'dd-tag' : 'dd-tag'} onClick={onToggle} disabled={isPending}>
        {props.lang === 'ru'
          ? bookmarked
            ? 'Убрать из закладок'
            : 'Добавить в закладки'
          : bookmarked
            ? 'Remove bookmark'
            : 'Add to bookmarks'}
      </button>

      {error ? (
        <span className="dd-article-meta">{props.lang === 'ru' ? `Ошибка: ${error}` : `Error: ${error}`}</span>
      ) : null}
    </div>
  )
}
