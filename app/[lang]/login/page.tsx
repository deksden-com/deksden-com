import { notFound } from 'next/navigation'
import { LoginClient } from './login-client'
import { isSiteLocale } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

type LoginPageProps = Readonly<{
  params?: Promise<{
    lang?: string
  }>
  searchParams?: Promise<{
    next?: string
  }>
}>

export default async function LoginPage(props: LoginPageProps) {
  const lang = (await props.params)?.lang
  if (!lang || !isSiteLocale(lang)) {
    notFound()
  }

  const next = (await props.searchParams)?.next || `/${lang}`

  return <LoginClient lang={lang} next={next} />
}
