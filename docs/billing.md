# Billing

## Plans

- `free` — default plan. Anonymous users can browse catalog/search/tags and read previews. Signed-in users can read `free` articles in full.
- `premium` — 1495₽/month. Signed-in users can read `premium` articles in full.

## Current MVP behavior

Payments are **manual** for now.

- Pricing page: `/{lang}/pricing`
- Payment instruction page (placeholder): `/{lang}/billing`

When a user clicks **Subscribe / Upgrade / Cancel**, the site redirects to `/{lang}/billing?...` where we show instructions to email `deksden@deksden.com` and we send a CloudPayments link.

The account page also routes **Delete account** to the same manual flow (action `delete_account`).

## Future CloudPayments integration (design)

We already route actions through server endpoints so we can later plug CloudPayments without changing the UI:

- `POST /api/billing/checkout` → create subscription checkout + redirect (or render widget)
- `POST /api/billing/cancel` → start cancel flow

Later we will add a webhook endpoint (e.g. `POST /api/billing/webhook/cloudpayments`) to update entitlements.

## Entitlements

Premium access is enforced by Supabase RLS. The app checks current plan via `entitlements` and treats an entitlement as active if `ends_at` is NULL or in the future.
