# Tags

This document describes how tags work on `deksden.com`: routes, URL format, and filtering rules.

## Routes

- Tags index:
  - `/${locale}/tags`
- Tag page:
  - `/${locale}/tags/${tag}`
- Articles list (supports tag filters):
  - `/${locale}/articles`

## Tag format

- Tags are ASCII kebab-case.
- Allowed pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`

## Articles filtering

- URL format:
  - `/${locale}/articles?tags=tag1,tag2`
- Behavior:
  - AND filter: an article must contain all selected tags.
  - Selecting/removing tags updates the URL so filters are shareable.

## Tag pages (content types)

- `/${locale}/tags/${tag}` is an aggregation page. It groups content by type.
- v1 content types:
  - Articles: shows a small preview list and links to `/${locale}/articles?tags=${tag}` to view the full list.
