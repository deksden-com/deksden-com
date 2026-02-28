# SPEC-003: dd-admin agent runs (server + CLI client)

Status: DRAFT  
Owner: deksden  
Last updated: 2026-02-28  

## Summary

We need `dd-admin` to run long-lived, agent-backed operations (translation, asset metadata, preview/toc generation) using the same architecture pattern as `dd-review`:

- A local server orchestrates runs and persists artifacts.
- The CLI is a client (typed API) that starts runs, tails progress, and cancels.
- By default the CLI starts an **embedded server** (`listen: false`) and calls it via an in-process `fetchImpl`.
- Optionally we can start a listening daemon (`dd-admin serve`) for debugging/integration.

Agent runs must spawn **external CLI agents** (not HTTP providers). Default: `gemini` CLI with model `flash-3-preview`.

Runs should only process files changed since the last publish pointer (`.dd-admin/state.json`) unless explicitly overridden.

## Decisions (locked)

1) Run storage location: `~/.dd-admin/runs/...` (like `dd-review`), not inside `dd-content`.
2) Translation staleness tracking: write `sourceRuSha256` (or equivalent) into `en.md` frontmatter and re-run when RU changes.
3) Provider model: external CLI providers (dd-review-style). Default provider: `gemini_cli`, default model: `flash-3-preview`.
4) Scope by default: only affected/changed slugs; never reprocess everything unless asked.
5) Asset alt/meta strategy:
   - store generated metadata in sidecar JSON files,
   - embed alt text into the **published markdown** during rewrite so the site does not need runtime resolvers.

## Current state (dd-admin)

Today `dd-admin` already supports deterministic operations:

- `scan` (validate repo structure + frontmatter)
- `toc apply` → `ru.toc.md` / `en.toc.md`
- `preview apply` → `ru.preview.md` / `en.preview.md`
- `publish plan|apply` (Supabase upserts + uploads assets from a fixed `articles/<slug>/assets/` folder)

Missing:

- local server + typed client
- run lifecycle (status, artifacts, cancel)
- agent-backed translate / asset meta
- asset scan/rewrite from markdown AST (SPEC-002)
- command help/docs at “product” quality

## Goals

- Allow author-friendly content authoring in `dd-content` while keeping publishing deterministic.
- Support long-running agent runs with:
  - stage-by-stage progress,
  - stored artifacts (prompts, transcripts, structured outputs),
  - cancel semantics.
- Keep `deksden-com` runtime simple: publish-time rewriting produces final markdown.

## Non-goals (v1)

- Rich CMS UI.
- OCR / automatic image localization.
- Video pipeline.

## Architecture

### Components

- **dd-admin CLI** (client): user entrypoint.
- **dd-admin server** (local): HTTP API + SSE; orchestrates runs.
- **dd-admin typed client**: used by CLI and automation.
- **Provider adapters**: spawn external agent CLIs; stream events; support resume/cancel.

### Server start modes

- Embedded (default):
  - `startDdAdminServer({ port: 0, hostname: '127.0.0.1', listen: false })`
  - `HttpDdAdminClient({ baseUrl: 'http://dd-admin.local', fetchImpl: started.fetch })`

- Listening daemon (optional):
  - `dd-admin serve --port 3392 --host 127.0.0.1 --root <dd-content>`

### Run store

- Base: `~/.dd-admin/runs/<run-id>/`

Files (minimal):

- `run.json` (snapshot: kind, status, stage, params, timestamps)
- `events.jsonl` (append-only event stream)
- `transcript.md` (human-readable feed)
- `artifacts/`:
  - `*.prompt.inputs.json`
  - `*.prompt.rendered.txt`
  - `*.output.json`
  - `*.schema.errors.json` (if structured output validation fails)
  - optional diffs/patches

### Cancel semantics

- Server keeps `AbortController` per run.
- Provider layer registers spawned processes (PID + session id) and can:
  - `SIGTERM` then grace window then `SIGKILL`.

## Provider layer (dd-review-style)

### Default provider

- Provider id: `gemini_cli`
- Default model: `flash-3-preview`

### Requirements

- Spawn external CLI via `execa`.
- Stream events into server event bus (JSONL + transcript).
- Support:
  - schema-repair loop for structured outputs (optional, but recommended),
  - resume by provider session id (where supported),
  - bounded concurrency (future).

### Code reuse

Short term options (pick one in implementation):

- (A) Vendor/copy minimal provider adapters from `dd-flow` (`dd-review-providers`) into `dd-admin`.
- (B) Extract/publish shared packages and consume them from `dd-admin`.

v1 can start with (A) for speed, and migrate to (B) later.

## Agent runs (kinds)

### 1) `translate`

Purpose: generate/update `en.md` from `ru.md` (RU canonical).

Inputs:

- `articles/<slug>/ru.md`
- optional existing `articles/<slug>/en.md`

Outputs (committed to `dd-content`):

- `articles/<slug>/en.md` (created/updated)
- `ru.toc.md`, `en.toc.md` (for affected slugs)
- `ru.preview.md`, `en.preview.md` (for affected slugs)

Staleness rule:

- `en.md` frontmatter stores `sourceRuSha256`.
- If current RU hash differs → EN is considered stale and should be regenerated.

Stages:

1) Plan/scan:
   - resolve slugs via `--changed --target beta|prod` using `.dd-admin/state.json`.
   - compute RU hash.
   - decide which slugs need translation (missing EN or stale).

2) Deterministic pre-step:
   - ensure `ru.toc.md` and `ru.preview.md` are generated for affected slugs.

3) Agent step:
   - call provider to produce structured output:
     - `title`, `description`, `body_md` (and optionally `tags` suggestions as non-authoritative)
   - preserve invariants:
     - `id/translationKey` (conceptual id), `tier`, `date`, `slug`, `canonical`, etc.

4) Write:
   - write `en.md` with stable frontmatter ordering.
   - set `sourceRuSha256`.

5) Deterministic post-step:
   - generate/update `en.toc.md` and `en.preview.md`.

### 2) `assets-meta`

Purpose: generate metadata for assets referenced by markdown (alt RU/EN + flags).

Inputs:

- all markdown files for affected slugs

Outputs (committed to `dd-content`):

- sidecar metadata per asset (see “Asset metadata storage”)

Stages:

1) Deterministic scan (SPEC-002):
   - parse markdown AST
   - find local asset references (images + img tags)
   - resolve paths relative to article file
   - compute `sha256(bytes)`
   - write `<lang>.assets.json` manifests for affected slugs

2) Agent step:
   - for each asset (batched):
     - generate `alt_ru`, `alt_en`
     - generate flags: `has_text`, `needs_localization`
     - optional `description`

3) Write:
   - write `*.meta.json` files deterministically.

### 3) Optional: `preview-toc` (deterministic run)

Even though preview/toc are deterministic today, running them under the same run framework provides:

- consistent artifacts/logging
- a unified UX (`dd-admin run ...`)

We can implement:

- `dd-admin run preview-toc --changed --target beta` as a non-agent run.

## Asset metadata storage (decision 5)

We want:

- agent outputs to be reviewable and editable,
- published markdown to include real alt text without runtime lookups.

Proposed approach:

- Store sidecar metadata next to the asset file:
  - `<file>.meta.json`

Example:

```json
{
  "schema": 1,
  "sha256": "...",
  "alt": { "ru": "...", "en": "..." },
  "flags": { "has_text": false, "needs_localization": false },
  "generatedAt": "...",
  "generator": { "provider": "gemini_cli", "model": "flash-3-preview" }
}
```

- Publish-time markdown rewrite (SPEC-002) uses precedence:
  1) author-provided alt in markdown
  2) `*.meta.json` alt for the locale
  3) fallback (filename)

Then it writes `<lang>.published.md` where:

- local asset URLs are rewritten to Storage URLs
- alt text is finalized

## CLI/UX plan (with high-quality help)

### User-facing command groups

- `dd-admin serve` — start HTTP server (optional)
- `dd-admin agent run translate ...`
- `dd-admin agent run assets-meta ...`
- `dd-admin run preview-toc ...` (deterministic)

Run inspection:

- `dd-admin runs ls [--project <root>]`
- `dd-admin runs show <run-id>`
- `dd-admin runs feed <run-id> [--watch]`
- `dd-admin runs cancel <run-id>`
- `dd-admin runs artifacts <run-id>`

### Help quality requirements

- Every command must include:
  - description,
  - at least 2 `.example(...)` blocks,
  - common troubleshooting notes.

Docs to add in dd-admin repo:

- `docs/cli.md` (index + examples)
- `docs/agent-runs.md` (how translate/assets-meta works + artifacts)
- `docs/providers.md` (gemini cli setup + model config)

Additionally:

- `dd-admin --help` should be a usable quickstart.

## Implementation roadmap

### Phase A — Transport + run store

- Add server module (Hono) + `startDdAdminServer` with `listen:false` support.
- Add typed client with `fetchImpl` injection.
- Add `dd-admin serve`.
- Add run store + event writer.

### Phase B — Provider adapters (gemini_cli first)

- Implement gemini_cli adapter by porting dd-review provider code.
- Implement process registry + cancel behavior.
- Add structured-output helpers (optional, recommended).

### Phase C — Translate run

- Add hash tracking (`sourceRuSha256`) to EN frontmatter.
- Implement translate stages + artifacts.
- Ensure preview/toc are part of the run for affected slugs.

### Phase D — Assets-meta run

- Implement markdown AST scan + manifests.
- Implement agent meta generation + `*.meta.json` writing.

### Phase E — Integrate with SPEC-002 rewrite + publish

- Implement published markdown generation (`<lang>.published.md`).
- Update publish to use published markdown.
- Update asset upload to use scanned manifests (not fixed `assets/`).

## Acceptance criteria

- `dd-admin agent run translate --changed --target beta`:
  - generates/updates `en.md` only when RU changed,
  - updates `*.toc.md` and `*.preview.md` for affected slugs,
  - stores full artifacts under `~/.dd-admin/runs/<id>`.

- `dd-admin agent run assets-meta --changed --target beta`:
  - discovers assets referenced anywhere,
  - writes deterministic `*.meta.json` sidecars,
  - stores artifacts under `~/.dd-admin/runs/<id>`.

- Cancelling a run stops spawned agent processes.

- Command help is readable and includes examples.
