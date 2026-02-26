'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { type SiteLocale } from '@/lib/site-config'

type ThemeModeSwitchProps = {
  locale: SiteLocale
}

const modeOrder = ['system', 'light', 'dark'] as const

type ThemeMode = (typeof modeOrder)[number]

const titleByLocale: Record<SiteLocale, Record<ThemeMode, string>> = {
  ru: {
    system: 'Системная тема',
    light: 'Светлая тема',
    dark: 'Темная тема'
  },
  en: {
    system: 'System theme',
    light: 'Light theme',
    dark: 'Dark theme'
  }
}

function getNextMode(currentMode: ThemeMode): ThemeMode {
  const index = modeOrder.indexOf(currentMode)
  return modeOrder[(index + 1) % modeOrder.length]
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.8v2.4m0 13.6v2.4M21.2 12h-2.4M5.2 12H2.8m15.2-6.4-1.7 1.7M7.7 16.3 6 18m12 0-1.7-1.7M7.7 7.7 6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.4 14.4a8.2 8.2 0 1 1-9.8-9.8 7.5 7.5 0 1 0 9.8 9.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="11.5"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 20h6m-4.2-3.5h2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

export function ThemeModeSwitch({ locale }: ThemeModeSwitchProps) {
  const { setTheme, theme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const mode = useMemo<ThemeMode>(() => {
    if (!isMounted) {
      return 'system'
    }
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme
    }
    return 'system'
  }, [isMounted, theme])

  const title = titleByLocale[locale][mode]

  return (
    <button
      type="button"
      className="dd-mode-icon-button"
      aria-label={title}
      title={title}
      onClick={() => setTheme(getNextMode(mode))}
    >
      {mode === 'light' ? <SunIcon /> : mode === 'dark' ? <MoonIcon /> : <SystemIcon />}
    </button>
  )
}
