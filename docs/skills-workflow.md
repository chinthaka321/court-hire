# Skills Workflow — Tennis Court Booking

Practical skill usage for this project, phase by phase.

---

## Current Project State

- Auth: Clerk JWT wired, integration tests done
- DB: EF Core migrations, PostgreSQL
- Stack: React + Vite (client/), ASP.NET Core .NET 8 (server/), Hangfire, Stripe

---

## Core Daily Loop (Per Feature)

```
/grill-me   → validate design
/tdd        → build test-first
/run        → start app
/verify     → confirm it works end-to-end
/code-review → clean before commit
```

---

## Feature Build Order (Recommended)

### 1. Availability Grid
```
/design-an-interface  for availability computation — virtual slot grid from court hours
/tdd  generate time slots from court opening_hours divided by slot_length
/tdd  subtract holds, bookings, blackouts from slot grid
/tdd  return available slots for a given court + date
/verify  slot grid shows correct open slots for a court on a selected day
```

### 2. Pricing
```
/tdd  implement rate-table lookup: price = f(court_id, day_type, band)
/tdd  day_type = weekday | weekend from slot date
/tdd  band = day | night from slot time vs court day_night_boundary
/verify  correct price returned for each of the 4 combinations per court
```

### 3. Hold Creation
```
/tdd  create Hold: capture price from live rate table at moment of hold
/tdd  set Hold TTL (~7 min), store expires_at
/tdd  enforce UNIQUE(court_id, slot_start) across Hold + Booking — double-booking backstop
/verify  slot disappears from grid immediately after hold created
/verify  two users cannot hold same slot simultaneously
```

### 4. Stripe Checkout
```
/prototype  rough out Stripe hosted checkout redirect flow — no DB wiring yet
/tdd  create Stripe checkout session with captured hold price
/tdd  webhook handler: payment_succeeded converts Hold to Booking atomically
/tdd  webhook handler is idempotent — safe to receive same event twice
/security-review  focus on webhook signature verification
/verify  Stripe webhook converts hold to booking, NOT the redirect URL
/verify  closed browser tab during checkout — booking still completes via webhook
```

### 5. Stale-Hold Sweeper (Hangfire)
```
/tdd  sweeper finds Holds where expires_at < now and deletes them
/tdd  sweeper runs on Hangfire recurring job schedule
/verify  expired hold deleted, slot reappears as available in grid
```

### 6. Booking Management (Cancel / Reschedule)
```
/tdd  cancellation within window → full Stripe refund, booking marked cancelled
/tdd  cancellation outside window → no refund
/tdd  reschedule = atomic swap: cancel old slot + claim new slot, no money movement
/tdd  reschedule only if new slot price matches — different price not supported
/verify  cancellation refund triggers in Stripe dashboard
/verify  rescheduled booking holds new slot, releases old slot atomically
```

### 7. Email Notifications (Hangfire)
```
/tdd  send confirmation email after booking created
/tdd  send cancellation email after booking cancelled
/tdd  reminder scheduler: enqueue reminder email N hours before slot_start
/verify  confirmation email received after completing Stripe checkout
```

### 8. Admin Panel
```
/tdd  admin can create/edit courts (opening_hours, slot_length, day_night_boundary)
/tdd  admin can edit 2×2 price rate table per court
/tdd  admin can create/delete blackouts per court
/tdd  admin can override cancellation window and force refund
/security-review  all admin endpoints properly gated to role = admin
/verify  non-admin user cannot access admin routes
```

### 9. UI — Day View + Week View
```
/prototype  spike day view grid: all courts × time slots for selected date
/tdd  week view degrades on narrow screen — falls back to court-picker + single-court week
/verify  day view renders correct slots, shows held/booked slots as unavailable
/verify  cell tap → hold created → booking confirmation shown → Stripe redirect
/qa  week view on 768px viewport — graceful collapse
```

---

## Before Every PR

```
/code-review
/security-review
/review since main
```

For significant PRs:
```
/code-review ultra --comment
/review ultra PR#<number>
```

---

## When Something Breaks

```
/diagnose  holds not expiring after TTL — slots stay locked
/diagnose  Stripe webhook returning 400 intermittently
/diagnose  availability grid shows booked slot as free
/diagnose  EF Core N+1 queries on booking list endpoint
/diagnose  UNIQUE constraint violation on concurrent hold attempts
```

---

## Periodic Maintenance

Run every few features or weekly:

```
/improve-codebase-architecture   # catch coupling before it hardens
/triage                          # process open GitHub Issues
/simplify                        # clean up grown controllers/services
```

---

## Launch Checklist Skills

Before going live, run all of these:

```
/security-review        # OWASP audit — auth, payments, admin gates
/code-review ultra      # deep correctness pass
/qa                     # end-to-end golden path + edge cases
/verify  stale-hold sweeper is running and expiring holds
/verify  reminder email scheduler is firing correctly
/verify  Stripe webhook is the source of truth — redirect never confirms payment
```

---

## Skill Quick Reference

| Situation | Skill |
|---|---|
| Unsure how to shape a module | `/design-an-interface` |
| Building any feature | `/tdd` |
| Something broken, cause unclear | `/diagnose` |
| App running, want to confirm behavior | `/verify` |
| Before commit/PR | `/code-review` |
| Payment or auth code | `/security-review` |
| Code grown complex | `/simplify` or `/improve-codebase-architecture` |
| Open issues piling up | `/triage` |
| Want to automate recurring task | `/schedule` |

---

## Admin-Configurable Values (Never Hardcode)

| Knob | Default |
|---|---|
| Hold TTL | ~7 min |
| Cancellation window | 24h before slot |
| Booking horizon | 14 days |
| Slot length | 60 min |
| Rate table values | Per court |
