'use client'

import { usePathname, useRouter } from 'next/navigation'
import { siteConfig, type SiteLocale } from '@/lib/site-config'

type LocaleSwitchProps = {
  locale: SiteLocale
}

function replaceLocaleInPath(pathname: string, nextLocale: SiteLocale): string {
  const segments = pathname.split('/')
  const currentLocale = segments[1]
  if (siteConfig.locales.includes(currentLocale as SiteLocale)) {
    segments[1] = nextLocale
  } else {
    segments.splice(1, 0, nextLocale)
  }
  return segments.join('/') || `/${nextLocale}`
}

export function LocaleSwitch({ locale }: LocaleSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div aria-label="Language switcher" className="dd-locale-switch">
      {siteConfig.locales.map(item => {
        const isActive = item === locale
        return (
          <button
            key={item}
            type="button"
            className={isActive ? 'active' : ''}
            onClick={() => {
              if (isActive) {
                return
              }
              document.cookie = `NEXT_LOCALE=${item}; path=/; max-age=31536000; samesite=lax`
              router.push(replaceLocaleInPath(pathname, item))
            }}
          >
            {item.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
