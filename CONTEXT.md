# Tennis Court Booking

Single-tenant, single-complex tennis court booking system. Courts are booked by users in time slots; payment is required to confirm a booking.

## Language

### Scheduling

**Court**:
A physical tennis court that can be booked. Has opening hours, a slot length, a day/night boundary, and an active flag.
_Avoid_: facility, resource, lane

**Slot**:
A fixed-length time window on a specific court that a user can book. Slots are computed at read time from opening hours divided by slot length — they are never stored.
_Avoid_: reservation, time block, appointment

**Slot start**:
The exact datetime marking the beginning of a slot. Used as the primary identifier of a slot alongside `court_id`.
_Avoid_: start time, slot time

**Slot length**:
The duration of each slot on a court, in minutes. Defaults to 60 min. Admin-configurable per court.
_Avoid_: duration, block size

**Availability grid**:
The computed set of bookable slots for a court on a given day: full time grid minus booked, held, and blacked-out intervals.
_Avoid_: calendar, schedule, open slots

**Blackout**:
An admin-defined interval during which a court is unavailable. Subtracted from the availability grid at read time.
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

**Stale hold**:
A Hold whose TTL has passed but has not yet been swept. The stale-hold sweeper deletes these on a schedule.
_Avoid_: expired hold, abandoned hold

**Booking**:
A confirmed, paid reservation. Only exists after a `payment_succeeded` Stripe webhook. Stores `amount_charged` immutably.
_Avoid_: reservation, appointment, confirmed slot

**Booking state**:
The lifecycle state of a Booking: `completed`, `cancelled`, or `no_show`.
_Avoid_: status, booking status

**Cancellation window**:
The admin-configured period before a slot start within which a user may cancel for a full refund. Outside this window, no refund is issued.
_Avoid_: refund window, cancellation period

### Pricing

**Rate table**:
A 2×2 grid of prices per court: `(day_type, band) → price`. Admin edits this directly; there is no rule engine.
_Avoid_: pricing rules, price list, tariff

**Captured price**:
The price written onto a Hold at creation time, taken from the live rate table. This is the amount charged to Stripe and stored immutably on the Booking.
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
