# Site Invariants

This document locks base decisions for `deksden.com` so implementation stays consistent.

## Product scope (v1)

- Main pages:
  - `/[locale]` - short "about me" home page.
  - `/[locale]/articles` - article catalog.
  - `/[locale]/articles/[slug]` - article page.
- Locales: `ru`, `en`.
- Theme modes: `light`, `dark`, `system`.
- Community/auth area: deferred; route can exist as placeholder.

## Localization policy

- Single-language articles are allowed (`RU-only` or `EN-only`).
- If translation exists, both articles are independent pages.
- A translation pair is linked by `translationKey` (same value in both files).

## Slug rules (chosen default)

- `slug` is always ASCII, lower-case, hyphen-separated.
- Allowed pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Slugs are unique within locale (`/ru/articles/*`, `/en/articles/*`).
- RU titles should use manual transliteration for slug creation.
- Slug does not need to match between locales; linkage is done via `translationKey`.
- Filename must match `slug` exactly (`content/<locale>/articles/<slug>.mdx`).

Why this approach:

- Stable URLs without encoding edge cases.
- Easy to type/share.
- No forced translation dependency.

## Taxonomy

- Only `tags`.
- `categories` are not used in v1.
- Tag vocabulary is free-form (no controlled dictionary in v1).

## Metadata contract

Required frontmatter:

- `title`
- `description`
- `date` (`YYYY-MM-DD`)
- `slug`
- `lang` (`ru` or `en`)
- `tags` (array of strings)
- `draft` (`true` or `false`)

Optional frontmatter:

- `translationKey` - links RU/EN versions when both exist.
- `updatedAt` (`YYYY-MM-DD`) - explicit "last updated" for materially revised articles.
- `cover` - article card/social preview image override.
- `canonical` - canonical URL when content is republished/syndicated.

`readingTime` decision:

- Do not store manually in frontmatter.
- Compute automatically at build time from article body.

Why optional fields are useful:

- `cover`: better click-through in catalog and social sharing; fallback exists if absent.
- `canonical`: prevents duplicate-content ambiguity in search index.
- `updatedAt`: communicates freshness and can improve trust for evolving content.
- `readingTime` (auto): improves scanability with zero author overhead.

## Catalog behavior (v1)

- No pagination in first release.
- Render full filtered list on one page (several dozen posts is safe).
- If article count grows beyond ~120, introduce pagination or cursor-based "load more".

Why:

- Faster implementation, cleaner UX, fewer navigation jumps.
- For current expected scale, performance remains acceptable with static generation.

## SEO baseline

- `{Name}` value in templates: `Deksden`.
- Title template:
  - Home: `Deksden - Personal Site`
  - Articles list: `Articles - Deksden`
  - Article page: `{Article Title} - Deksden`
- Description:
  - Per-page explicit `description`.
- Open Graph:
  - Per-article OG image endpoint with `cover` override support.
  - Default OG style: monochrome card, monospaced typography, ASCII block, no gradients.
  - Layout: title (primary), short subtitle (secondary), locale and date footer.
- Sitemap:
  - Include both locales.
  - Include only published articles (`draft: false`).
- `hreflang`:
  - `ru`, `en`, and `x-default` entries on localized pages.

## Editorial process

- Content is Git-only.
- Authoring happens in `content/**` using MDX files.
- Publish flow: branch -> PR (optional) -> merge to `main` -> Vercel deploy.

## `updatedAt` rule

Set `updatedAt` only when update is material, for example:

- Meaningfully changed conclusions or recommendations.
- Added/removed major section(s) or >15% of text changed.
- Fixed factual errors that affect reader decisions.
- Updated code snippets that alter behavior.

Do not set `updatedAt` for typo, grammar, formatting, or link-only fixes.
