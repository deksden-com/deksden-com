# Deployment and Distribution (Vercel)

## Distribution model

- Source of truth: Git repository (`main` branch).
- Production: Vercel production deployment from `main`.
- Preview: automatic preview deployment for each PR/branch.
- Runtime: Next.js app router on Vercel.
- Content delivery: static pages where possible, on-demand server rendering for dynamic routes.

## Branching and releases

- `main` -> production.
- Feature branches -> preview URLs.
- Optional release discipline:
  - short-lived branches
  - PR review before merge
  - merge commit triggers production deployment

## Vercel CLI setup

1. Install CLI:

```bash
pnpm i -g vercel
# or: npm i -g vercel
```

2. Authenticate:

```bash
vercel login
```

3. Initial production deploy (also links the directory and creates `.vercel`):

```bash
vercel --prod
```

4. If you need explicit linking or relinking:

```bash
vercel link --yes --project deksden-com
```

5. Connect Git provider repo for automatic deployments on push:

```bash
# required once per team scope:
# install Vercel GitHub App -> https://github.com/apps/vercel
vercel git connect
# or explicitly:
vercel git connect https://github.com/deksden-com/deksden-com.git
```

6. Add environment variables:

```bash
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL preview
```

Recommended values:

- Production: `https://deksden.com`
- Preview: preview deployment URL (Vercel provides it).

7. Pull env locally (optional, for local development):

```bash
vercel env pull .env.local
```

## Domain setup

- Add domain via CLI:

```bash
vercel domains add deksden.com
vercel domains add www.deksden.com
```

- Configure redirect (apex <-> www) in project Domain settings.
- Configure DNS records exactly as shown by Vercel.
- Verify HTTPS certificate is issued.

## Deploy commands (daily use)

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

For staged production rollout:

```bash
vercel --prod --skip-domain
vercel promote <deployment-url-or-id>
```

## Post-deploy checks

- Locale routing works: `/ru`, `/en`.
- Cookie language preference (`NEXT_LOCALE`) persists.
- Theme switch works for `light`, `dark`, `system`.
- `sitemap.xml` and `robots.txt` are reachable.
- OG images render from `/api/og`.
