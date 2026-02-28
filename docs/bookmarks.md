# Bookmarks

Signed-in users can save articles to bookmarks.

## Data model

- Table: `public.bookmarks`
  - `user_id` (FK → `auth.users.id`)
  - `article_id` (FK → `public.article_public.id`)
  - `created_at`

RLS:

- select/insert/delete allowed only for `auth.uid() = user_id`.

## UI

- Article page: bookmark toggle button.
- Account page: list of bookmarked articles + remove action.
