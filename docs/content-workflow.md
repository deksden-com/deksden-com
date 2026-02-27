# Content Workflow (Git-only)

## Directory layout

```txt
content/
  ru/
    articles/
      <slug>.mdx
  en/
    articles/
      <slug>.mdx
docs/
  templates/
    article.ru.template.mdx
    article.en.template.mdx
```

## Add new article

1. Copy template:
   - `docs/templates/article.ru.template.mdx` or
   - `docs/templates/article.en.template.mdx`
2. Rename file to `<slug>.mdx`.
3. Fill required frontmatter.
4. Write content in MDX body.
5. Commit and push to `main` (or merge PR to `main`).

Notes:

- `slug` must match filename.
- Slug format: ASCII lower-case kebab-case.
- Keep tags in ASCII kebab-case as well (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

## Drafts and publish

- Use `draft: true` while writing.
- Set `draft: false` to publish.
- Catalog/sitemap must ignore drafts.

## Translation flow

- If article exists in one language only, publish normally.
- If a translation exists, set the same `translationKey` in both files.
- Keep `slug` independent per locale.

## Frontmatter checklist

- Required:
  - `title`
  - `description`
  - `date`
  - `slug`
  - `lang`
  - `tags`
  - `draft`
- Optional:
  - `translationKey`
  - `updatedAt`
  - `cover`
  - `canonical`
