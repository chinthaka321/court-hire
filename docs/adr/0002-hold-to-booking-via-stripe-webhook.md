# Booking is confirmed by Stripe webhook, not redirect

The booking flow is: create Hold → redirect to Stripe hosted checkout → `payment_succeeded` webhook converts Hold to Booking. The redirect-back URL only shows a "confirming…" polling page and never creates a Booking itself. The webhook is the sole source of truth for payment confirmation. This survives closed browser tabs, network drops, and users who navigate away — the booking still completes as long as Stripe fires the webhook.

## Consequences

The redirect-back page must poll or subscribe for booking confirmation rather than trusting query params. A `payment_succeeded` handler that is not idempotent will double-book — it must be guarded.
