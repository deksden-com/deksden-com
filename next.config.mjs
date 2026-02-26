import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
  readingTime: true,
  contentDirBasePath: '/'
})

export default withNextra({
  reactStrictMode: true,
  turbopack: {
    root: process.cwd()
  },
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru'
  }
})
