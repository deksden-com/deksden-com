'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LocaleSwitch } from '@/app/_components/locale-switch'
import { ThemeModeSwitch } from '@/app/_components/theme-mode-switch'
import { type SiteLocale } from '@/lib/site-config'

type SiteHeaderProps = {
  locale: SiteLocale
}

type NavItem = {
  href: string
  label: string
}

type SocialItem = {
  href: string
  iconPath: string
  label: string
}

const socialLinks: SocialItem[] = [
  {
    href: 'https://t.me/deksden_notes',
    iconPath: '/icons/social/telegram.svg',
    label: 'Telegram'
  },
  {
    href: 'https://x.com/deksden',
    iconPath: '/icons/social/x.svg',
    label: 'X'
  },
  {
    href: 'https://github.com/deksden',
    iconPath: '/icons/social/github.svg',
    label: 'GitHub'
  }
]

export function SiteHeader({ locale }: SiteHeaderProps) {
  const pathname = usePathname()

  const navItems: NavItem[] =
    locale === 'ru'
      ? [
          { href: `/${locale}/articles`, label: 'Статьи' },
          { href: `/${locale}/about`, label: 'Обо мне' }
        ]
      : [
          { href: `/${locale}/articles`, label: 'Articles' },
          { href: `/${locale}/about`, label: 'About me' }
        ]

  return (
    <header className="dd-top-header">
      <div className="dd-top-header-container">
        <div className="dd-top-header-inner">
          <div className="dd-header-left">
            <Link href={`/${locale}`} className="dd-site-logo">
              deksDen.com
            </Link>
          </div>

          <nav aria-label="Main menu" className="dd-main-nav">
            {navItems.map(item => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? 'dd-nav-link active' : 'dd-nav-link'}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="dd-header-right">
            <Link href={`/${locale}/account`} className="dd-nav-link">
              {locale === 'ru' ? 'Аккаунт' : 'Account'}
            </Link>
            <LocaleSwitch locale={locale} />
            <ThemeModeSwitch locale={locale} />
          </div>
        </div>

        <div className="dd-social-row">
          {socialLinks.map(item => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={item.label}
              className="dd-social-link"
            >
              <img
                src={item.iconPath}
                alt={item.label}
                className="dd-social-icon"
              />
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}
