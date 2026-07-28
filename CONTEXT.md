# Tennis Court Booking

Single-tenant, single-complex tennis court booking system. Courts are booked by users in time slots; payment is required to confirm a booking.

## Language

### Scheduling

**Court**:
A physical tennis court that can be booked. Has opening hours, a slot length, a day/night boundary, and an active flag. The only lifecycle state that matters is `active`/`inactive` — "deleting" a court is not a domain concept, just an admin utility for removing a court created by mistake before it has any Bookings or Holds. A court with any booking history can never be deleted, only deactivated.
_Avoid_: facility, resource, lane

**Slot**:
A fixed-length time window on a specific court that a user can book. Slots are computed at read time from opening hours divided by slot length — they are never stored.
_Avoid_: reservation, time block, appointment

**Slot start**:
The exact datetime marking the beginning of a slot. Used as the primary identifier of a slot alongside `court_id`.
_Avoid_: start time, slot time

**Slot length**:
The base time unit of the availability grid — fixed at 30 minutes system-wide. Not admin-configurable. Customers choose a session duration (a multiple of the slot length) at booking time.
_Avoid_: duration, block size

**Session duration**:
The length of a booking as chosen by the customer: 60, 90, or 120 minutes. Always a multiple of the slot length. Determines how many consecutive slots a booking covers.
_Avoid_: booking duration, slot duration, session length

**Availability grid**:
The computed set of bookable slots for a court on a given day: full time grid minus booked, held, and blacked-out intervals.
_Avoid_: calendar, schedule, open slots

**Court Grid Engine**:
The pure domain engine responsible for computing slot start times from court opening hours, grouping slots into session spans, and validating slot availability against booking horizons, blackouts, and past slot boundaries.
_Avoid_: slot generator, calendar builder

**7-Day Week View**:
A multi-day calendar view displaying real-time open slots and prices across 7 consecutive days for a selected court, complete with week navigation controls.
_Avoid_: week calendar, full week schedule

**Blackout**:
An admin-defined interval during which a court is unavailable. Subtracted from the availability grid at read time. A Blackout does not cancel or touch existing Bookings inside its window — it can overlap paid Bookings, which then simply stop appearing in the availability grid (shown as blacked-out) while the Booking itself is untouched. The admin is warned about such conflicts at creation time but may proceed anyway (see ADR-0012).
_Avoid_: block, closure, maintenance window

**Day/night boundary**:
The time of day that separates the "day" band from the "night" band on a court. Admin-configurable per court.
_Avoid_: peak/off-peak boundary, shift boundary

**Band**:
One of two pricing bands: `day` or `night`. Determined by comparing a slot's start time against the court's day/night boundary.
_Avoid_: period, tier, zone

**Day type**:
Whether a slot's date falls on a `weekday` or `weekend`. Used alongside band to look up a price from the rate table.
_Avoid_: day category, week type

### Reservation flow

**Hold**:
A soft reservation created when a user selects a slot. Captures the price from the live rate table at that moment, and expires after the Hold TTL (~7 min). Exists only during Stripe checkout.
_Avoid_: reservation, pending booking, cart

**Hold TTL**:
The time-to-live for a Hold. After it expires, the slot is released back to the availability grid. Admin-configurable.
_Avoid_: hold expiry, timeout

**Hold group**:
A set of Hold rows sharing a `HoldGroupId` (Guid), created atomically in one transaction to reserve a multi-slot block. The frontend interacts only with the group ID. All holds in a group share the same TTL and are swept or confirmed together.
_Avoid_: multi-hold, hold set, hold batch

**Stale hold**:
A Hold whose TTL has passed but has not yet been swept. The stale-hold sweeper deletes these on a schedule.
_Avoid_: expired hold, abandoned hold

**Block booking**:
A booking that covers 2 or more consecutive slots on the same court on the same day. Created from a Hold group. `SlotStarts[]` contains every slot in the block. `AmountCharged` is the sum of the captured prices of all constituent slots.
_Avoid_: multi-slot booking, session booking, extended booking

**Booking**:
A confirmed reservation. Exists only after payment is settled — either a `payment_succeeded` Stripe webhook (cash checkout) or a Package redemption (no new Stripe charge). Stores `amount_charged` immutably.
_Avoid_: reservation, appointment, confirmed slot

**Booking state**:
The lifecycle state of a Booking: `completed`, `cancelled`, or `no_show`. Despite the name, `completed` means "payment confirmed," not "the match was played" — it's set at creation and covers a Booking's entire active lifetime, past or future, until cancelled. `no_show` is a reserved placeholder: no code path sets it in V1 (no-show strikes are deferred to V2 per `CLAUDE.md`).
_Avoid_: status, booking status

**Cancellation window**:
The admin-configured period before a slot start within which a user may cancel for a full refund. Outside this window, no refund is issued.
_Avoid_: refund window, cancellation period

**Reschedule**:
Moving a Booking to a new start time as an atomic slot swap: same court (permanent constraint, not a V1 gap — cross-court reschedule is not planned), same slot count, and the new span's total price must exactly equal the original `amount_charged`. No money moves. If the new time's price differs, the user must cancel (per the Cancellation window) and rebook instead. See ADR-0004.
_Avoid_: rebook, move booking, change time

**Payment Gateway Seam**:
The domain interface abstracting third-party payment infrastructure (Stripe Checkout sessions, webhook verification, and refund processing).
_Avoid_: payment wrapper, stripe client

### Packages

**Package**:
A pre-paid bundle of court sessions purchased upfront via a single Stripe charge, at a flat price per session valid on any court. Tracks `remaining_sessions` and `expires_at`. A User may hold multiple active Packages at once.
_Avoid_: bundle, credit pack, punch card

**Package session / redemption**:
One unit of a Package, consumed to create a Booking without a new Stripe charge. Always corresponds to a single default-duration (60-min, 2-slot) booking — Packages do not cover 90/120-min block bookings, which must be paid individually via Stripe.
_Avoid_: credit, redemption unit, session slot

### Pricing

**Rate table**:
A 2×2 grid of prices per court: `(day_type, band) → price`. Admin edits this directly; there is no rule engine.
_Avoid_: pricing rules, price list, tariff

**Pricing Calculator**:
The domain module that looks up prices in the rate table based on day type (`weekday`/`weekend`) and band (`day`/`night`), and accumulates total prices for multi-slot sessions.
_Avoid_: price engine, tariff evaluator

**Preview price**:
The price shown to a user on the booking confirmation screen, taken from the availability grid at the time the slot was tapped. Not authoritative — may differ from the captured price if an admin changes the rate table before the user clicks Pay.
_Avoid_: displayed price, estimated price

**Captured price**:
The price written onto a Hold at creation time, taken from the live rate table. This is the amount charged to Stripe and stored immutably on the Booking. The authoritative price — not the preview price.
_Avoid_: price, slot price, checkout price

### People

**User**:
An authenticated person who books courts. Has a skill level (`beginner`, `intermediate`, `advanced`) and a role (`user` or `admin`). Identity is owned by the auth provider; profile and role are owned by this system.
_Avoid_: customer, member, player

**Admin**:
A User with `role = admin`. Can configure courts, rate tables, blackouts, and override cancellation rules.
_Avoid_: manager, operator, staff

**Provider ID**:
The user identifier issued by the external auth provider (Clerk/Auth0/Supabase Auth). The primary key linking our User record to the auth identity.
_Avoid_: auth ID, external ID, OAuth subject
