# Bookmarks

Signed-in users can save articles to bookmarks.

## Data model

- Table: `public.bookmarks`
  - `user_id` (FK → `auth.users.id`)
  - `article_id` (FK → `public.article_public.id`)
  - `created_at`

RLS:

- select/insert/delete allowed only for `auth.uid() = user_id`.

### Cross-language behavior

Bookmarks are **shared across languages**.

Implementation detail: we store the bookmark as the **canonical RU** `article_public.id`.

- When a user bookmarks an EN article, the server resolves the canonical RU row by `translation_key` and saves that RU `id`.
- When rendering the bookmarks list, we show the current locale version (if it exists) by matching the saved canonical row’s `translation_key`.

## UI

- Article page: shows a bookmark state label (`"В закладках!"`) and a button to remove/add.
- Account page: list of bookmarked articles + remove action.
