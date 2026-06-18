# Single cancellation window with full refund only

There is one admin-configured cancellation window (e.g. 24h before slot start). Cancellations inside the window receive a full Stripe refund. Cancellations outside receive nothing. There are no partial refunds, no credits, and no store-balance system. Admins can override the window check to force a refund regardless. This was chosen over a tiered refund schedule to keep the refund logic trivially simple and auditable.
