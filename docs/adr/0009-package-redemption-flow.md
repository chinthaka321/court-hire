# Package redemption flow

A Package is a pre-paid bundle of court sessions purchased upfront via a single Stripe charge. Redemption converts a Package session into a Booking without a new Stripe transaction. The following decisions were made:

**Redemption preserves the Hold, skips Stripe checkout**: When a user redeems a Package session, the system creates a Hold (to lock the slot during confirmation) and then converts it directly to a Booking — bypassing Stripe checkout and the `payment_succeeded` webhook path. The Hold TTL still applies; an abandoned redemption releases the slot. This preserves the `UNIQUE(court_id, slot_start)` double-booking protection during the confirmation window without adding a new concurrency mechanism.

`remaining_sessions` decrements only at Booking confirmation, not at Hold creation. The Hold reserves the *slot*, not the *session* — if the Hold expires unconfirmed, the stale-hold sweeper just deletes it as usual and the Package balance was never touched. This avoids adding a "restore the session" path to the sweeper at the cost of not preventing a user from starting two simultaneous redemptions against the same session count (accepted: the slot-level UNIQUE constraint still prevents double-booking the court; at worst two Holds exist briefly against one session, and only one can confirm before the other's slot conflict or expiry resolves it).

**Package is any-court**: A Package type carries one flat price per session valid on all courts. The rate table is not consulted at redemption. This simplifies the catalogue (no per-court package variants) at the cost of not reflecting court-specific pricing. Accepted because the flat price is admin-set and the business controls the trade-off.

**Package session = default 60-min duration only**: A redemption always creates a single default-duration (60-min, 2-base-slot) Booking. Packages do not cover 90/120-min block bookings (ADR-0008) — a user wanting a longer session must pay for it individually via Stripe. This avoids needing to define a per-slot-count session price or metering fractional session consumption, at the cost of Package holders not being able to redeem toward longer sessions.

**Cancelled redeemed sessions return to the Package**: When a Booking created via Redemption is cancelled, the Package session is returned (`remaining_sessions += 1`); no Stripe refund is issued. This diverges from the standard cancellation-window-refund flow (ADR-0005) deliberately: the session was not charged individually to Stripe, so there is nothing to refund — the value lives in the Package balance.

**Soonest-expiry Package consumed first**: When a user holds multiple active Packages, the system automatically consumes the one with the earliest `expires_at`. No user choice at redemption time. This protects users from accidentally letting sessions expire while a newer pack is drawn down.

**Package cancellation retains a percentage**: Cancelling an unexpired Package triggers a Stripe partial refund of `remaining_sessions × flat_price_per_session × (1 − cancellation_fee_percentage)`. The percentage is admin-configurable per package type. Flat fees were considered but a percentage scales naturally with the remaining value and requires one fewer admin decision.

**Natural expiry forfeits remaining sessions, no refund**: When `expires_at` passes with `remaining_sessions > 0` and the user has not cancelled, the balance is simply lost — no Stripe refund, no scheduled job needed beyond marking the Package inactive. This is distinct from user-initiated cancellation (which does get a partial refund): expiry is the expected/accepted risk of a pre-paid bundle, consistent with the cancellation-window forfeiture pattern elsewhere in the domain (ADR-0005).

## Considered options

- **Skip Hold at redemption**: simpler path, but exposes a race condition where two users simultaneously redeem onto the same slot and both succeed until the DB constraint fires. Rejected to preserve ADR-0007.
- **Court-specific packages**: aligns with per-court rate table pricing, but creates a proliferating catalogue and restricts where users can redeem. Rejected in favour of any-court simplicity.
- **Cancelled redeemed sessions trigger Stripe refund**: consistent with the standard cancellation flow but wrong: the session was never charged individually. Rejected; session credit is the correct unit of account.
- **Flat package cancellation fee**: simpler to explain, but doesn't scale with remaining value. Rejected in favour of percentage.
- **Proportional session consumption for block bookings**: redeeming a 90/120-min session would consume 3/4 base-slot-units from the package. Rejected because it requires `remaining_sessions` to track base slots rather than bookings, and breaks the flat per-session price. Simpler to just exclude block bookings from redemption entirely.
