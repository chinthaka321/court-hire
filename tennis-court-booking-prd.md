# Tennis Court Booking — Product Requirements Document

> **Status:** Living document. V1 is the buildable scope; V2 captures deferred decisions so this PRD carries forward.
> **Guiding principles:** Simple, minimalistic, modern, AI-friendly. Every V1 decision traces back to these.
> **Last updated:** 2026-06-03

---

## 1. Overview

A web-based tennis court booking application for a **single complex**, open to the public. Anyone can register, browse court availability, and pay per slot up front. Membership, social features, and multi-location support are explicitly deferred to V2.

| Attribute | Decision |
|---|---|
| Scope | Single complex, single-tenant (no tenant scoping anywhere) |
| Customer model | Open — anyone registers and books |
| Primary platform | Responsive web (no native app in V1) |
| Payment posture | Pay-at-booking, charged up front |
| Design ethos | Simple, minimalistic, modern, AI-friendly |

---

## 2. V1 Scope

### 2.1 In Scope

- Availability calendar (day view + week view)
- Slot booking with up-front payment
- User accounts (email login via managed provider)
- Booking management — cancel and reschedule
- Pay-per-slot payment via Stripe hosted checkout
- Time-based pricing (rate-table lookup)
- Email notifications (confirmation, cancellation, reminder)
- Admin panel (courts, pricing, blackouts, bookings, override cancel/refund)

### 2.2 Out of Scope (see Section 9 — V2)

Membership tiers, no-show strikes/penalties, matchmaking, open invites, group/doubles bookings, coach booking, tournaments/leagues, equipment rental, lighting surcharge, QR/PIN check-in, waitlist, weather integration, stats & history, loyalty/referral, reviews & ratings, mobile/native app, SMS & push notifications, phone-OTP login, profile photo, multi-complex.

---

## 3. Booking Engine (the core)

### 3.1 Slot model — fixed grid, virtual slots

- Courts are scheduled on a **fixed time grid**. A booking is **one or more contiguous slots**; longer durations (e.g., 90/120 min) are achieved by booking adjacent slots.
- **Slot length is per-court**, configured once at court setup. Default **60 min**.
- **Virtual slots**: the system stores only **bookings, holds, and blackouts**. It does **not** pre-generate empty slot rows.
- Availability is **computed at read time**: generate the grid from `(court opening hours + slot length)`, then subtract booked / held / blacked-out slots.
- **Rationale:** No generation job, no rolling-horizon maintenance, no sea of empty rows. Admin config changes (slot length, hours, blackouts) just alter the computed grid with no regeneration.

### 3.2 Concurrency — soft reservation + unique constraint

The booking flow is slow because payment happens inside it (Stripe call), so we reserve before paying:

1. User taps a free slot → system creates a **hold** with a TTL (admin-configurable, default ~7 min).
2. While held, the slot shows as **unavailable** to everyone else.
3. Payment success → hold converts to a **booking**.
4. TTL expiry or payment failure → hold released, slot free again.

- **Backstop:** a **unique constraint on `(court_id, slot_start)`** spanning bookings + holds. Even if hold logic has a bug, the database physically cannot double-book.
- **Stale-hold sweeper:** a scheduled job expires abandoned holds. *Without it, abandoned checkouts lock slots forever.* This is a launch-critical, easy-to-forget piece.

### 3.3 Booking lifecycle

Because payment is up front, a booking only exists if payment succeeded. Three terminal states:

| State | Meaning | Money |
|---|---|---|
| Completed | Slot played | Already paid, retained |
| Cancelled (refund) | Cancelled inside the window | Full refund |
| No-show | Did not show | Forfeit (no refund) |

No "unpaid booking" limbo state. No collections. No-show is disincentivized by construction (money already taken).

---

## 4. Payments

| Aspect | Decision |
|---|---|
| Provider | **Stripe**, hosted Checkout / Payment Element (never handle raw card data) |
| Source of truth | **Webhook**, not the redirect-back page |
| Confirmation flow | Hold → redirect to Stripe → `payment_succeeded` webhook → convert hold to booking. Redirect-back page just polls/says "confirming…" |
| PCI posture | Hosted checkout keeps card data off our servers, minimizing PCI scope |

### 4.1 Refunds & cancellation

- **Single cancellation window**, admin-configurable (e.g., 24h before slot start).
- Inside the window → **full refund** (Stripe refund of the stored amount). Outside → **no refund**.
- **No tiered/partial refunds. No credits/wallet** in V1.
- **Admin override:** staff can cancel + refund **ignoring** the window. Cancellation logic carries an actor check — `if admin, skip window check`.

### 4.2 Reschedule

- Reschedule = **cancel + rebook, atomic**.
- **Same-price swap only**: release old slot, claim new slot, **no money movement**.
- Price-different reschedule is **not** supported as a swap — the user simply cancels (refund per window) and books again.
- **Rationale:** keeps partial charge/refund complexity entirely out of V1.

---

## 5. Pricing

### 5.1 Rate-table lookup (not a rules engine)

Price is a flat lookup keyed on three dimensions:

```
price = lookup(court, day_type, band)
  day_type ∈ { weekday, weekend }
  band     ∈ { day, night }
```

- A **2×2 grid of prices per court** (weekday-day, weekday-night, weekend-day, weekend-night).
- The **day/night band boundary** (the time that splits day from night) is a **per-court admin knob**.
- **No precedence, no rule stacking, no overlapping-rule resolution.** Admin fills a small grid.
- **Rationale:** covers everything originally desired (peak/off-peak via day/night, weekday/weekend via day-type) without a rules engine's complexity. A rules engine is a V2 concern if ever needed.

### 5.2 Price capture (correctness rule)

- Price is computed from the rate table **at hold creation** and **written onto the hold**.
- Stripe is charged **exactly** that captured amount.
- The amount is stored **immutably on the booking**. It is **never recomputed** from the live table.
- Refunds use the **stored** amount.
- **Rationale:** prevents the user seeing one price and being charged another if admin edits the table mid-flow; makes refunds trivially correct.

---

## 6. Identity & Accounts

| Aspect | Decision |
|---|---|
| Auth | **Managed provider** (e.g., Clerk / Auth0 / Supabase Auth) |
| Login method | **Email only** in V1 |
| Division of ownership | Provider owns **authentication**; our DB owns **role + profile**, keyed to the provider's user id |
| Admin auth | **Role flag on the users table** (`role = admin`) — no second auth stack; route guards on admin endpoints |

### 6.1 Profile (V1)

| Field | Notes |
|---|---|
| Name | — |
| Email | From auth provider |
| Phone | **Data only**, unverified, no SMS. Groundwork for V2 phone login & SMS reminders |
| Skill level | Enum (beginner / intermediate / advanced). **Display-only**, consumed by no logic. Pre-seeds V2 matchmaking |
| Photo | **Deferred to V2.** V1 uses initials/placeholder avatars (avoids object-storage dependency) |

---

## 7. Notifications

- **Email only** in V1. One email provider (e.g., Resend / SES / Postmark).
- Three events:
  - **Confirmation** — event-triggered (on booking confirmed via webhook).
  - **Cancellation** — event-triggered.
  - **Reminder** — **time-triggered**, fixed interval before the slot. Requires the scheduler.
- **No SMS, no push** in V1 (avoids per-message cost and consent/compliance tax).

### 7.1 Scheduler

One scheduled-jobs mechanism (cron-like worker) running **two jobs**:

1. Sweep expired holds (Section 3.2).
2. Send reminders.

Keep this as a single mechanism, not multiple systems.

---

## 8. Admin Panel (V1)

Minimum needed for a human to operate the facility:

| Capability | Notes |
|---|---|
| Manage courts | Create court, opening hours, **slot length**, active/inactive |
| Manage pricing | Edit the rate-table grid + day/night boundary per court |
| Manage blackouts | Block a court/time range for maintenance/events (subtracted by availability compute) |
| View / search bookings | Filter by date, court, user — the operational heartbeat |
| Override cancel + refund | Reuses cancellation flow, **bypasses** the cancellation window |

**Excluded from V1 admin:** analytics dashboards, usage/revenue reports, user management beyond view/disable. These are reporting, not operating → V2.

---

## 9. Calendar / Primary UI (V1)

- **Both day view and week view** in V1.
  - **Day view:** all-courts grid (courts across, time slots down) for the selected day. Answers court-first and time-first questions at once.
  - **Week view:** 7-day view. **Must degrade gracefully on narrow screens** (e.g., collapse to court-picker + single-court week, or fall back to day view below a breakpoint). This is the main place V1 spends effort against "minimalistic" — accepted deliberately.
- A **date picker** moves between days/weeks.
- **Cell tap is the booking entry point:** tapping a free cell creates the hold and opens the booking confirmation (duration/contiguous slots/price), then proceeds to Stripe.
- **Booking horizon** (how far ahead a user can book) is an **admin knob**, default **14 days**, applies to both views.

---

## 10. Admin Configuration Knobs (summary)

All of these are settings admin owns — none hardcoded:

| Knob | Default / Notes |
|---|---|
| Hold TTL | ~7 min |
| Cancellation window | e.g., 24h before slot start |
| Booking horizon | 14 days |
| Per-court opening hours | — |
| Per-court slot length | 60 min |
| Per-court day/night band boundary | Defines the pricing day→night split |
| Rate-table values | 2×2 grid per court |

---

## 11. Highest-Risk Build Areas

1. **Hold → webhook → booking sequence.** A slow Stripe call plus a closed browser tab can desync money from reservations. The **webhook-as-source-of-truth** design is the protection — do not shortcut it by trusting the redirect-back page.
2. **Stale-hold sweeper.** Launch-critical. Without it, abandoned checkouts silently lock slots forever.

---

## 12. Data Model Sketch (informative)

Core persisted entities (virtual-slot model — no slot table):

- **User** — id (provider-keyed), name, email, phone (data), skill_level (enum), role (user/admin).
- **Court** — id, name, opening_hours, slot_length, day_night_boundary, active.
- **PriceRate** — court_id, day_type, band, price. (2×2 per court.)
- **Hold** — id, court_id, slot_start, user_id, captured_price, expires_at. Covered by unique `(court_id, slot_start)` constraint shared with Booking.
- **Booking** — id, court_id, slot_start(s), user_id, amount_charged (immutable), state (completed/cancelled/no_show), stripe refs. Covered by unique `(court_id, slot_start)`.
- **Blackout** — court_id, start, end, reason.

> Unique constraint on `(court_id, slot_start)` must be enforced across Hold + Booking together (the collision backstop).

---

## 13. V2 — Deferred Decisions & Roadmap

Captured now so the PRD carries forward. Items grouped by theme; each notes what V1 groundwork already exists.

### 13.1 Membership & Access
- **Membership tiers** — monthly/annual plans, included hours, priority booking windows. The hardest deferred accounting (included-hour reconciliation, rollover, proration). *Open model already works without it; members just pay.*
- **No-show strikes/penalties** — explicitly **not needed** while up-front charge disincentivizes no-shows; revisit only if data shows a problem.
- **Booking quotas / advance-booking limits per user.**

### 13.2 Social & Engagement
- **Matchmaking / find-a-partner** — by skill level & availability. *V1 already stores skill level (display-only) to pre-seed this.*
- **Open invites** — post a slot seeking opponents; others join.
- **Group bookings** — doubles, coaching, round-robins.
- **Coach booking** — coach profiles, rates, booked alongside a court.
- **Tournaments / leagues** — sign-up, brackets, results.
- **Reviews & ratings** — courts, coaches.

### 13.3 Operations
- **Waitlist** — when implemented, it is a **second time-boxed hold** layered on a **cancellation-triggered email cascade** with priority ordering and fall-through-to-next. *V1 already has both halves to build on: the hold mechanism + email/scheduler.* Deferred because it only adds value once slots are routinely full and cancelled.
- **Equipment rental** — racquets, ball machines, as add-on line items.
- **Lighting / floodlight surcharge** — an add-on line item (not a pricing rule).
- **Check-in (QR/PIN)** — auto-release no-shows at the court.

### 13.4 Pricing Evolution
- **Rules engine** — only if arbitrary, overlapping, frequently-changing promo rules are ever needed. V1's rate-table can hold **exceptions as rows over the flat base** if a middle step is wanted.
- **Per-duration discounts** (e.g., 90 min cheaper per-slot).
- **Tiered/partial cancellation refunds** — if facility wants graduated penalties to discourage late cancels. Touches the refund flow; design tiers then.

### 13.5 Identity & Notifications
- **Phone-OTP login** — email **+** phone. Switched on via the same managed provider with no rework. *Reintroduces an SMS provider + consent/compliance surface.*
- **SMS notifications** — naturally arrive once SMS exists for phone login; measurably reduce no-shows where email doesn't.
- **Push notifications** — requires native app or web-push plumbing.
- **Profile photo** — introduces object storage (S3 + upload/resize pipeline).

### 13.6 Platform & Scale
- **Mobile / native app** (React Native or native) — decide based on check-in & notification UX. Deferred; V1 is responsive web.
- **Multi-complex / multi-tenant** — *explicitly out.* V1 is single-tenant with no `complex_id` scoping. Going multi-complex later is a real migration (tenant scoping on every entity, per-complex admin roles, cross-complex membership model, location selector, timezone & currency handling). Accepted as a future cost rather than a speculative premium.
- **Week view enhancements**, analytics/reporting dashboards, audit log for admin actions.

### 13.7 Cross-Cutting (only relevant at multi-city / multi-country scale)
- **Timezone handling** — matters once multi-city.
- **Currency** — matters once multi-country.
- **Audit log** for admin actions.

---

## 14. Decision Log (why, in one line each)

| # | Decision | Why |
|---|---|---|
| 1 | Single complex, single-tenant | No real 2nd location in sight; avoid speculative multi-tenancy tax |
| 2 | Open model | Simpler one-flow booking; still serves a club, unlike the reverse |
| 3 | Pay-at-booking | Eliminates unpaid limbo & collections; no-show = forfeit by construction |
| 4 | Soft reservation + unique constraint | Good UX hold + ironclad DB backstop against double-booking |
| 5 | Fixed grid | Discrete, constraint-safe; matches how courts schedule in reality |
| 6 | Virtual slots | No generation job / empty rows; config changes are free |
| 7 | Stripe hosted + webhook truth | Minimal PCI scope; survives closed tabs |
| 8 | Single full-refund window | Avoids partial-refund edge-case explosion |
| 9 | Reschedule = same-price swap | Keeps partial payment complexity out |
| 10 | Rate-table pricing, captured on hold | Covers all needs without a rules engine; price integrity |
| 11 | Email-only notifications | Covers necessary comms without SMS cost/compliance |
| 12 | Role-flag auth, managed provider | One auth stack; auth is undifferentiated heavy lifting |
| 13 | Skill level stored, photo deferred | Free column pre-seeds matchmaking; photo = infra dependency |
| 14 | Day + week view | Both wanted; week view degrades on mobile |
| 15 | Waitlist deferred | Margin-utility optimization; complex; needs demand to matter |
