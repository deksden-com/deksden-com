# SPEC-001: Content Platform v2 (dd-content + dd-admin + Supabase + Beta/Prod promotion)

This spec captures the agreed platform direction for `deksden.com` and provides an execution plan.

Status: DRAFT  
Owner: deksden  
Last updated: 2026-02-27  

## Context

Current state:

- `deksden-com` is a Next.js site deployed on Vercel.
- Articles currently live in-repo (Git-only) and are rendered as static/MDX content.
- Tags and multi-tag filtering are implemented on the site:
  - `/${locale}/articles?tags=tag1,tag2` (AND)
  - `/${locale}/tags`
  - `/${locale}/tags/${tag}` (aggregates content types; v1: articles)

Target direction:

- Content SSoT moves to a separate private repo `dd-content`.
- Publishing is done by a separate private CLI repo `dd-admin` (“content factory”).
- Runtime storage is Supabase:
  - Supabase Auth + Supabase Postgres (+ Storage for images).
- A paywall is required:
  - Anonymous users see catalogs/tags/search and previews.
  - Logged-in users on `free` plan can read `free` content.
  - Logged-in users on `premium` can read premium content.
- Payments will be via CloudPayments subscriptions (not implemented in v1, but architecture must allow it).
- v1 supports images. Video is deferred but should be extensible.

## Goals (v1 platform)

- Make premium content non-leakable:
  - premium full text must not be present in static build output or public client bundles.
- Implement deterministic and repeatable content processing:
  - process “changed since last publish” content from Git.
  - commit generated artifacts back to `dd-content`.
- Add beta/prod environments for both code and data, with promotion flows.
- Keep the system extensible for:
  - subscriptions + entitlements,
  - manual grants/promos,
  - future content types beyond “articles”.

## Non-goals (v1)

- Full payments integration (CloudPayments).
- Video hosting pipeline.
- Drafts workflow (explicitly not needed).
- Multiple paid tiers beyond `free` and `premium` (design should not block, but don’t implement).

## Definitions

- **SSoT**: single source of truth.
- **Target**: environment for publishing content and running the site (`beta` or `prod`).
- **Promotion**:
  - code promotion: `develop → main`
  - content promotion: publish the same `dd-content` git SHA to `prod` after validating it on `beta`.

## Repositories

### `deksden-com` (site)

Responsibilities:

- UI + routing + SEO.
- Read catalogs/search/tags/previews from Supabase (public).
- Read full article bodies from Supabase (protected by RLS + entitlements).
- Auth UI (Supabase Auth).
- Paywall behavior:
  - show preview to everyone
  - show full body only when entitled

### `dd-content` (content SSoT, private)

Responsibilities:

- Canonical RU articles and derived EN translations (files, committed).
- Images and image metadata (committed).
- Generated artifacts (committed):
  - `*.preview.md`
  - `*.toc.md`
  - `assets/*.meta.json` (alt text, “needs localization” flags, etc.)
- Publish pointers per target (committed):
  - `.dd-admin/state.json`

### `dd-admin` (content factory CLI, private)

Responsibilities:

- Deterministic batched operations on `dd-content`:
  - scan, validate, generate preview/toc, translate, image metadata, publish.
- Store run artifacts/logs/inputs for traceability (local by default; optionally commit only stable outputs).
- Publish to Supabase for a chosen target (`beta|prod`).
- Provide automation-friendly interface:
  - `--json` output
  - `plan/apply` split for reproducibility and previews

## Environments and “targets”

We use two targets:

- **prod**
  - Domain: `deksden.com` (apex)
  - Vercel project: prod
  - Git branch: `origin/main`
  - Supabase project: `dd-com`
- **beta**
  - Domain: `beta.deksden.com`
  - Vercel project: beta
  - Git branch: `origin/develop`
  - Supabase project: `dd-beta`

Promotion philosophy:

- Code:
  - beta always gets `develop` automatically.
  - prod gets `main` automatically.
  - promotion = PR `develop → main`.
- Content:
  - publish to beta first (`dd-admin publish --target beta`).
  - validate on beta.
  - publish the same content git SHA to prod (`dd-admin publish --target prod --sha <sha>`).

## Content model (conceptual)

We plan for multiple content types (future) but start with one type: `article`.

### Content visibility and entitlement

Rules:

- Anonymous:
  - can list/search/filter tags, and view article previews.
  - cannot read full bodies (even for free).
- Authenticated `free`:
  - can read full bodies of `free` articles.
- Authenticated `premium`:
  - can read all (free + premium).

We also want a manual “release” mechanism:

- Move content from `premium → free` via `dd-admin` (manual releases), not via “age-based” automation.

## `dd-content` file layout (proposed)

Directory structure (articles only, v1):

```txt
articles/
  <slug>/
    ru.md
    en.md
    ru.preview.md
    ru.toc.md
    en.preview.md
    en.toc.md
    assets/
      <file.ext>
      <file.ext>.meta.json
.dd-admin/
  state.json
```

Notes:

- RU is canonical: translations are generated from RU, but EN file is editable manually after generation.
- Artifacts are committed and treated as “derived but stable outputs”.
- Image metadata:
  - should include `alt` for RU/EN,
  - and a flag when the image likely contains text and needs localization review.

## `dd-admin` CLI (v1 shape)

Principle:

- Do not “drive the repo with an agent” per file.
- Instead: build deterministic work items, batch them, feed to agent provider once (or in bounded batches), then apply results deterministically.

Command families (initial):

- `dd-admin status` — show what changed since last publish per target.
- `dd-admin scan` — validate structure/frontmatter/tags/links and build an index.
- `dd-admin toc plan|apply` — deterministic TOC generation from headings.
- `dd-admin preview plan|apply` — preview generation:
  - prefer `<!--more-->` (if present),
  - otherwise LLM template-based preview + outline of remaining content.
- `dd-admin translate plan|apply --to en` — translate RU → EN (LLM).
- `dd-admin images meta plan|apply` — generate per-image metadata:
  - alt texts RU/EN,
  - `has_text` / `needs_localization` flags.
- `dd-admin publish plan|apply --target beta|prod [--sha <sha>]` — upload to Supabase (DB + Storage).
- `dd-admin release set-tier ...` — change content tier (free/premium) and republish.

Global behavior:

- All commands support:
  - `--changed` (since last published SHA of the target),
  - `--since <sha>`,
  - `--paths ...`,
  - `--json`,
  - `--concurrency N`.

## State and promotion pointers

`.dd-admin/state.json` lives in `dd-content` and is committed.

Purpose:

- deterministic “what changed since last publish” (Git-based),
- explicit audit pointer: what content SHA is currently published per target.

Shape (v1):

```json
{
  "schemaVersion": 1,
  "targets": {
    "beta": { "lastPublishedSha": "<git sha>", "publishedAt": "2026-02-27T00:00:00Z" },
    "prod": { "lastPublishedSha": "<git sha>", "publishedAt": "2026-02-27T00:00:00Z" }
  }
}
```

## Supabase (conceptual responsibilities)

We will use:

- Supabase Auth (GitHub, Google, email/password).
- Postgres for:
  - public article metadata + previews (anonymous read),
  - private article bodies (RLS-protected),
  - user profiles,
  - entitlements (free/premium).
- Supabase Storage for images.

Paywall constraint:

- Premium bodies must never be shipped inside `deksden-com` repo/build.
- Full bodies are fetched server-side (or from protected endpoints) only when entitled.

## CloudPayments (future integration constraints)

We will sell subscriptions.

Requirements to keep in mind now:

- Payments provider is CloudPayments.
- We will need webhooks to maintain subscription state.
- We will map CloudPayments `AccountId` to our user id.
- We will store subscription state and derive entitlements.

Implementation is deferred in v1, but DB/API boundaries should not block it.

## Observability and traceability (v1)

We want “why is this published” answers to be easy.

- `dd-admin` stores run artifacts locally under:
  - `.dd-admin/runs/<run-id>/...` (not committed by default).
- Committed stable outputs live next to content:
  - `*.preview.md`, `*.toc.md`, `assets/*.meta.json`
- Publishing log is stored in Supabase (operational record), but the publish pointer remains Git-based.

## Security notes (v1)

- No secret keys in Git.
- `dd-admin` uses:
  - Supabase service role key for publishing (local env/CI secret).
  - LLM provider keys (local env/CI secret).
- Supabase RLS must enforce:
  - anonymous can’t read bodies,
  - free users can read free bodies,
  - premium can read premium bodies,
  - admin/service role can publish.

## Work plan (phased)

### Phase 0 — Lock the platform spec (this doc)

- Keep this spec updated as decisions change.
- Add follow-up SPECs when implementation begins:
  - DB schema + RLS spec
  - dd-content format spec (frontmatter + assets)
  - dd-admin CLI contract spec

### Phase 1 — Bootstrap repos (foundation)

`dd-content`:

- Create initial directory layout for one example article with images.
- Add `.dd-admin/state.json` with `beta/prod` targets.
- Add templates/checklists for authoring (RU canonical).

`dd-admin`:

- Implement CLI skeleton with `--json` and subcommands.
- Implement `state show/set`, `status`, and `scan` (no Supabase yet).
- Implement deterministic `toc apply` (heading-based).
- Implement `preview apply` with `<!--more-->` support and LLM fallback.

### Phase 2 — Translation and image metadata

- Implement batched translation RU → EN:
  - writes `en.md`
  - keeps linkage fields stable (slug, translation key policy).
- Implement image metadata generator:
  - alt RU/EN
  - `has_text` / `needs_localization` flags.

### Phase 3 — Supabase publish (beta first)

- Define minimal DB schema:
  - public metadata table (anonymous read),
  - protected bodies table,
  - entitlements.
- Implement `publish --target beta`:
  - upload images to Storage,
  - upsert metadata + previews,
  - upsert bodies into protected storage/table,
  - update `.dd-admin/state.json`.

### Phase 4 — Site reads from Supabase (beta)

In `deksden-com`:

- Replace article source from in-repo MDX to DB-backed rendering for `/articles/*`.
- Keep catalogs/tags/search functional without auth.
- Add auth flows (Supabase Auth) and entitlement checks.
- Implement paywall (body-only).

### Phase 5 — Promotion and prod

- Add `dd-admin publish --target prod --sha <sha>`.
- Add “promotion discipline” checklist:
  - beta content SHA verified,
  - code PR `develop→main` verified,
  - migrations applied to prod,
  - content published to prod at same SHA.

### Phase 6 — Future (post-v1)

- CloudPayments subscriptions + webhook reconciliation.
- Promo codes / manual entitlement grants via `dd-admin`.
- Video embedding strategy and storage.
- Additional content types (notes/videos/projects) on `/${locale}/tags/${tag}` grouping.

## Open questions (to resolve before Phase 3)

- Exact frontmatter contract for `dd-content` (slug rules, translationKey policy, tier field).
- Where bodies are stored (table vs Storage) and how we render MD safely.
- Caching strategy in Next.js for public lists vs entitled bodies.
- Search strategy (Postgres full-text vs external search).

