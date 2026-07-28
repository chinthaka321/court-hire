# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack & Project Status

- **Backend**: ASP.NET Core 8 Web API (`server/`) with Entity Framework Core, PostgreSQL, Hangfire, MailKit, Clerk JWT Auth, and Stripe Payment SDK.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Clerk React SDK, Lucide Icons (`client/`).
- **Tests**: xUnit unit test project (`server.Tests/TennisBooking.Tests.csproj`). Run tests with `dotnet test server.Tests/TennisBooking.Tests.csproj`.
- **Build Commands**:
  - Client build: `npm --prefix client run build`
  - Backend test: `dotnet test server.Tests/TennisBooking.Tests.csproj`

## Architecture & Interface Seams

1. **`IPricingCalculator` & `PricingCalculator`**: Encapsulates 2×2 rate grid lookup (`DayType` × `PriceBand`), day/night boundary comparison against `Court.DayNightBoundary`, multi-slot price accumulation, and rate fallbacks.
2. **`ICourtGridEngine` & `CourtGridEngine`**: Pure domain engine for computing slot grids, session spans, horizon limits, blackout subtractions, and grid alignment.
3. **`IPaymentGateway` & `StripePaymentAdapter`**: Abstraction seam hiding Stripe SDK checkout session creation, webhook verification, and refund processing.

## Domain Model

**Single-tenant, single-complex** tennis court booking. No `complex_id` or tenant scoping anywhere — adding it later is an accepted future cost.

Core entities (virtual-slot model — there is **no slot table**):

- **Court** — `opening_hours`, `slot_length` (30 min base), `day_night_boundary`, `active`
- **PriceRate** — `(court_id, day_type∈{weekday,weekend}, band∈{day,night}) → price` — 2×2 grid per court
- **Hold** — `(court_id, slot_start, user_id, captured_price, expires_at)` — soft reservation during Stripe checkout
- **Booking** — `(court_id, slot_start[], user_id, amount_charged immutable, state∈{completed,cancelled,no_show})` — only exists after payment
- **Blackout** — `(court_id, start, end)` — subtracted from the computed availability grid
- **User** — `(provider_id, name, email, phone, skill_level∈{beginner,intermediate,advanced}, role∈{user,admin})`

Critical constraint: `UNIQUE(court_id, slot_start)` must span both Hold and Booking rows — this is the double-booking backstop.

## Core Architectural Decisions

### Availability is computed, not stored
Slots are never pre-generated. At read time: generate the full time grid from `(court opening hours ÷ slot_length)`, then subtract booked/held/blacked-out intervals. Admin config changes (hours, slot length, blackouts) are free — no regeneration job needed.

### Booking flow: hold → Stripe → webhook → booking
1. User selects a slot → create **Hold** (captures price from rate table at this moment, sets TTL ~7 min)
2. Redirect to Stripe hosted checkout
3. `payment_succeeded` webhook → convert Hold to Booking
4. Redirect-back page only polls/shows "confirming…" — **never** trust the redirect to confirm payment

Stripe webhook is the **source of truth**, not the redirect URL. This survives closed browser tabs.

### Price is captured at hold creation and never recomputed
Price written onto the Hold comes from the live rate table at that moment. Stripe is charged exactly that amount. The booking stores `amount_charged` immutably. Refunds use that stored value. This prevents price-change races mid-checkout.

### Reschedule = same-price atomic swap only
Cancel old slot + claim new slot in one transaction, no money movement. Different-price reschedule is not supported as a swap — user cancels (refund per window) and rebooks.

### Single cancellation window, full refund only
Admin configures one window (e.g., 24h before slot). Inside window → full Stripe refund. Outside → no refund. No partial refunds, no credits. Admin can override and bypass the window check.

### Auth: managed provider + role flag
Provider (Clerk/Auth0/Supabase Auth) owns authentication. Our DB owns `role` and profile, keyed to provider's user ID. Admin access = `role = admin` on the users table. No second auth stack.

## Launch-Critical Items (easy to forget)

1. **Stale-hold sweeper** — scheduled job that expires abandoned Holds whose TTL has passed. Without it, abandoned checkouts silently lock slots forever.
2. **Reminder email scheduler** — time-triggered job sending reminders before slot start. Both jobs run under Hangfire background job engine.

## Pricing Logic

Flat rate-table lookup via `IPricingCalculator`:
```
price = lookup(court_id, day_type, band)
  day_type  = weekday | weekend   (from slot date)
  band      = day | night         (from slot time vs court's day_night_boundary)
```

Admin edits a 2×2 grid per court.

## Admin-Configurable Knobs (never hardcode these)

| Knob | Default |
|---|---|
| Hold TTL | ~7 min |
| Cancellation window | 24h before slot |
| Booking horizon | 14 days |
| Per-court opening hours | — |
| Per-court slot length | 30 min |
| Per-court day/night boundary | — |
| Rate-table values (2×2 per court) | — |

## UI Structure

- **Day View**: single court × 30-min time slots grid for a selected day
- **7-Day Week View**: 7-day multi-column calendar view with week pagination controls
- Cell tap → create Hold → booking confirmation (duration/price) → Stripe checkout
- Date picker navigates between days/weeks

## V1 Boundaries

**In scope:** availability calendar, slot booking with payment, email auth, booking management (cancel/reschedule), Stripe pay-at-booking, time-based pricing, email notifications (confirmation/cancellation/reminder), admin panel, 7-day week view.

**Explicitly deferred to V2:** memberships, no-show strikes, matchmaking, group/doubles bookings, coach booking, tournaments, equipment rental, lighting surcharge, QR check-in, waitlist, SMS/push notifications, phone-OTP login, profile photos, analytics dashboards, multi-complex/multi-tenant.

---

## Agent Skills & Guidelines

- **Issue tracker**: GitHub Issues via `gh` CLI (`docs/agents/issue-tracker.md`).
- **Domain docs**: Single-context glossary in `CONTEXT.md` + `docs/adr/`.
