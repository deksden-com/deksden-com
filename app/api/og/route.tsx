import { ImageResponse } from 'next/og'
import {
  copyByLocale,
  isSiteLocale,
  siteConfig,
  type SiteLocale
} from '@/lib/site-config'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const localeValue = searchParams.get('locale') || siteConfig.defaultLocale
  const locale: SiteLocale = isSiteLocale(localeValue)
    ? localeValue
    : siteConfig.defaultLocale
  const title = searchParams.get('title') || siteConfig.siteName
  const subtitle = copyByLocale[locale].subtitle

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#f8f8f8',
          color: '#050505',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '64px',
          width: '100%',
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          border: '8px solid #050505'
        }}
      >
        <div style={{ fontSize: 20, letterSpacing: 1.2 }}>{siteConfig.domain}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <pre style={{ fontSize: 24, margin: 0 }}>{`+----------------------+
|  deksden.com         |
|  minimal notes       |
+----------------------+`}</pre>
          <div style={{ fontSize: 58, lineHeight: 1.08, fontWeight: 700, maxWidth: 1020 }}>
            {title}
          </div>
          <div style={{ fontSize: 24 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 18 }}>
          {locale.toUpperCase()} · {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  )
}
