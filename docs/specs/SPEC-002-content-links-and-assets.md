# SPEC-002: Content Link + Asset Rewriting (dd-admin publish)

Status: DRAFT  
Owner: deksden  
Last updated: 2026-02-28  

## Problem

We will store article bodies in Supabase (not in the site repo), but authoring full URLs in Markdown is inconvenient.

We also want images/files (“assets”) to be usable from **any location** inside `dd-content`, not only from a fixed `assets/` folder.

We need a deterministic publish-time pipeline that:

- finds and validates internal links and local asset references,
- uploads required assets to Supabase Storage,
- rewrites Markdown so runtime rendering on `deksden-com` does not need any special resolvers.

## Goals

- Authoring convenience:
  - allow short article links in Markdown.
  - allow local file references for images.
- Deterministic publishing:
  - same input → same output.
  - no runtime “magic” required on the site.
- Avoid content leaks:
  - premium bodies and private assets must never be shipped in the `deksden-com` build.

## Non-goals (v1)

- Video pipeline.
- OCR / automatic localization of images with text.
- Rich CMS editing UI.

## Definitions

- **Canonical article id**: stable, language-independent id used to link RU/EN versions.
- **Published markdown**: rewritten Markdown that is stored in Supabase and rendered by the site.

## Proposed contracts

### Article identity

Each article has a stable id shared across locales.

- In `dd-content` frontmatter we add `id` (short string) OR reuse `translationKey`.
- In Supabase we store this value in `article_public.translation_key`.

Rules:

- One id per conceptual article.
- RU + EN variants share the same id.

### Short internal links

Authoring format:

- Markdown link href: `dd:<id>`
- Optional: `dd:<id>#anchor`
- Optional: `dd:<id>@ru` or `dd:<id>@en` (force locale)

Examples:

- `[Аннотированные ссылки](dd:mb-47)`
- `[Same article in RU](dd:mb-47@ru)`

Publish-time rewrite:

- `dd:<id>` resolves to an internal site link `/${lang}/articles/${slug}`.
- If a locale is missing, fallback to RU.

Resolution source of truth:

- prefer `dd-content` index (so publish is fully deterministic).
- allow optional DB validation (warn if DB disagrees).

### Asset references

Assets can be referenced from anywhere via **relative paths**.

We detect assets in:

- Markdown images: `![alt](path)`
- HTML tags: `<img src="path">`
- (optional) link-to-file: `[text](path)` where path is a local file extension (png/jpg/svg/pdf/etc)

We ignore:

- `http(s)://...` (external)
- `data:`

Path resolution:

- relative paths are resolved from the markdown file directory.

## Publishing pipeline (dd-admin)

### Step 1 — Parse markdown and build a reference graph

For each article file:

- parse markdown AST,
- extract:
  - internal links (`dd:`)
  - local asset paths

Output artifacts (committed in `dd-content`):

- `<lang>.assets.json` (asset list with abs paths + hashes)
- `<lang>.links.json` (resolved article links)

### Step 2 — Upload assets to Supabase Storage

Bucket:

- `dd-content` (existing bucket)

Storage key strategy:

- content-addressed keys for deduplication:
  - `assets/<sha256>.<ext>`

Metadata:

- store original filename and mime type in the manifest.

### Step 3 — Rewrite markdown to published form

Create published markdown:

- `<lang>.published.md` (committed in `dd-content`)

Rewrite rules:

- local asset references → public Storage URLs (or site-level proxy URLs)
- `dd:` links → internal site links

### Step 4 — Publish to Supabase

- `article_public.preview_md` and `article_body.body_md` should use the rewritten published markdown.

## Operational notes

### Backward compatibility

- Until `id` is adopted, we can continue using `translationKey` as the conceptual id.
- For articles without id/translationKey, link rewrite cannot resolve; treat as error.

### Determinism and safety

- No network calls are required to resolve links (dd-content index is enough).
- Asset uploads are idempotent via content-addressed keys.

## Implementation plan (incremental)

1) Add markdown parsing + extraction in `dd-admin`.
2) Add asset upload from extracted list (remove dependency on fixed `assets/` folder).
3) Add markdown rewrite to published artifacts.
4) Publish using rewritten markdown.
5) Add validation + warnings for missing ids / broken refs.
