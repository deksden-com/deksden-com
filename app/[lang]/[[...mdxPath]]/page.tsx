import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import type { ComponentType, ReactNode } from 'react'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'
import { getSiteUrl, isSiteLocale } from '@/lib/site-config'

type PageProps = Readonly<{
  params?: Promise<{
    lang?: string
    mdxPath?: string[]
  }>
}>

export const generateStaticParams = generateStaticParamsFor('mdxPath', 'lang')

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  if (!params?.lang || !isSiteLocale(params.lang)) {
    return {}
  }

  const page = await importPage(params.mdxPath, params.lang)
  const metadata = page.metadata as Record<string, unknown>
  const title = String(metadata.title || '')
  const description = String(metadata.description || '')
  const canonical = String(metadata.canonical || '').trim()
  const cover = String(metadata.cover || '').trim()
  const path = `/${params.lang}/${(params.mdxPath || []).join('/')}`.replace(/\/$/, '')
  const canonicalPath = canonical || path || `/${params.lang}`
  const ogImage =
    cover ||
    `/api/og?locale=${params.lang}&title=${encodeURIComponent(
      title || 'Article'
    )}`

  return {
    title: title || undefined,
    description: description || undefined,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      type: 'article',
      url: canonicalPath,
      title: title || undefined,
      description: description || undefined,
      images: [ogImage]
    },
    twitter: {
      card: 'summary_large_image',
      title: title || undefined,
      description: description || undefined,
      images: [ogImage]
    },
    metadataBase: new URL(getSiteUrl())
  }
}

const WrapperComponent = (
  getMDXComponents() as {
    wrapper?: ComponentType<{
      children: ReactNode
      toc: unknown
      metadata: unknown
      sourceCode: string
    }>
  }
).wrapper

export default async function MdxPage(props: PageProps) {
  const params = await props.params
  if (!params?.lang || !isSiteLocale(params.lang)) {
    notFound()
  }

  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(
    params.mdxPath,
    params.lang
  )

  if (WrapperComponent) {
    return (
      <WrapperComponent toc={toc} metadata={metadata} sourceCode={sourceCode}>
        <MDXContent {...props} params={params} />
      </WrapperComponent>
    )
  }

  return <MDXContent {...props} params={params} />
}
