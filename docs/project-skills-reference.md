# Project Skills & Files Reference


### `docs/` — Documentation

| Path | What it is |
|---|---|
| `docs/adr/` | Architecture Decision Records — 9 files recording *why* key decisions were made |
| `docs/agents/domain.md` | Tells Claude: read CONTEXT.md and ADRs before working in this repo |
| `docs/agents/issue-tracker.md` | Tells Claude: GitHub Issues via `gh` CLI is the issue tracker |
| `docs/agents/triage-labels.md` | Defines 5 labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix |
| `docs/skills-guide.md` | Full skill reference with sample prompts for every skill |
| `docs/skills-workflow.md` | Feature-by-feature build order with exact skill commands to run |
| `docs/project-skills-reference.md` | This file |

---

### `docs/adr/` — Why Decisions Were Made

| ADR | Decision |
|---|---|
| 0001 | Slots computed at read time — never stored in DB |
| 0002 | Stripe webhook converts Hold to Booking — redirect URL is never trusted |
| 0003 | Price locked at Hold creation — never recomputed later |
| 0004 | Reschedule only works if new slot price matches old price |
| 0005 | One cancellation window, full refund or nothing — no partial refunds |
| 0006 | Clerk owns auth, our DB owns the `role` column |
| 0007 | UNIQUE constraint on (court_id, slot_start) spans both Hold and Booking |
| 0008 | Multi-slot bookings use a Hold group (HoldGroupId) |
| 0009 | Package redemption bypasses Stripe checkout entirely |

---

### `.scratch/issues/` — Pre-written GitHub Issues

18 issue files ready to publish. Run `.scratch/issues/publish-to-github.sh` to push them all to GitHub Issues at once.

| Issue | Feature |
|---|---|
| 01 | DB schema and EF Core migrations |
| 02 | Clerk auth end-to-end |
| 03 | Admin court management |
| 04 | Admin pricing grid (rate table) |
| 05 | Admin blackouts |
| 06 | Availability calendar UI |
| 07 | Stripe account setup |
| 08 | Hold creation + Stripe checkout redirect |
| 09 | Stripe webhook → booking creation |
| 10 | Redirect-back polling page |
| 11 | My Bookings page |
| 12 | Cancel booking |
| 13 | Reschedule booking |
| 14 | Stale-hold sweeper (Hangfire) |
| 15 | Transactional email notifications |
| 16 | Reminder email scheduler (Hangfire) |
| 17 | Admin bookings search + filter |
| 18 | Admin override cancel |

---

## Skills to Use RIGHT NOW

These match where the project is today: scaffold done, ready to build features.

### 1. `/setup-pre-commit`
**What it does:** Adds a git pre-commit hook that runs lint/type checks before every commit — bad code never reaches git.
**Use it:** Once, before writing more code.
```
/setup-pre-commit  run dotnet build and dotnet test before every commit
/setup-pre-commit  run eslint and tsc --noEmit on staged client files
```

### 2. `/git-guardrails-claude-code`
**What it does:** Blocks dangerous git commands (reset --hard, force-push, branch -D) from running inside Claude Code.
**Use it:** Once, right after setup-pre-commit.
```
/git-guardrails-claude-code
```

### 3. `/tdd`
**What it does:** Builds features test-first — writes a failing test, makes it pass, then refactors. Uses your existing `server.Tests/` project.
**Use it:** For every backend feature you build.
```
/tdd  generate availability grid from court opening_hours divided by slot_length
/tdd  subtract holds, bookings, and blackouts from the slot grid
/tdd  implement rate-table lookup: price = f(court_id, day_type, band)
/tdd  create Hold: capture price from live rate table, set expires_at
/tdd  enforce UNIQUE(court_id, slot_start) across Hold and Booking rows
/tdd  Stripe webhook: payment_succeeded converts Hold to Booking atomically
/tdd  stale-hold sweeper deletes Holds where expires_at < now
```

### 4. `/prototype`
**What it does:** Builds a throwaway spike to validate an approach before committing to it.
**Use it:** Before tackling anything uncertain (Stripe flow, Hangfire jobs, UI grid).
```
/prototype  rough out Stripe hosted checkout redirect — no DB wiring yet
/prototype  spike virtual slot grid for one court one day — raw output only
/prototype  try Hangfire recurring job for hold sweeper and reminder scheduler together
```

### 5. `/run`
**What it does:** Starts the app — detects client (Vite) and server (dotnet) and launches both.
**Use it:** After implementing a feature to see it running.
```
/run
/run  and open the booking calendar in the browser
/run  start backend API only
```

### 6. `/verify`
**What it does:** Runs the app and checks that a specific behavior actually works — not just that tests pass.
**Use it:** After every feature, before committing.
```
/verify  slot disappears from grid immediately after hold created
/verify  two users cannot hold the same slot simultaneously
/verify  Stripe webhook converts hold to booking — redirect URL does not confirm payment
/verify  expired hold deleted, slot reappears as available
/verify  cancellation within window triggers Stripe refund
```

### 7. `/design-an-interface`
**What it does:** Spawns parallel sub-agents to generate multiple different API/service shapes. Pick the best one.
**Use it:** Before writing a new service or controller — especially availability and pricing.
```
/design-an-interface  for availability computation service
/design-an-interface  for pricing rate-table lookup
/design-an-interface  for Hold expiry sweeper
```

### 8. `/grill-with-docs`
**What it does:** Stress-tests your plan against CONTEXT.md and the ADRs. Flags conflicts. Updates docs inline when decisions crystallise.
**Use it:** Before implementing anything that touches the booking flow, holds, or pricing.
```
/grill-with-docs  my plan for Hold creation — does it conflict with ADR-0003?
/grill-with-docs  planning webhook handler — check against ADR-0002
/grill-with-docs  want to add waitlist — does it break the hold model?
```

### 9. `/code-review`
**What it does:** Reviews your current diff for correctness bugs and simplification opportunities.
**Use it:** Before every commit or PR.
```
/code-review
/code-review --fix       # applies findings automatically
```

---

## Skills to Use LATER

These become useful once more features are built or at specific project milestones.

### `/security-review`
**When:** Before any PR that touches auth, Stripe webhooks, or admin endpoints.
**What:** Audits for OWASP vulnerabilities, broken auth, secrets in code, injection risks.
```
/security-review  focus on webhook handler signature verification
/security-review  check all admin endpoints are gated to role = admin
/security-review  look for hardcoded secrets in appsettings files
```

### `/qa`
**When:** Once a full feature flow is working end-to-end (e.g. slot → hold → Stripe → booking).
**What:** Runs the app and probes edge cases and the golden path together.
```
/qa  booking flow: slot → hold → Stripe → webhook → confirm
/qa  cancellation exactly at the 24h boundary
/qa  week view on narrow 768px viewport
```

### `/simplify`
**When:** After a controller or service has grown large (typically after 3–4 features added to it).
**What:** Cleans up repeated logic, extracts helpers, improves naming — auto-applies changes.
```
/simplify  AvailabilityController is getting big
/simplify  pricing module has repeated conditionals
```

### `/improve-codebase-architecture`
**When:** Every 4–5 features, or when something feels coupled or hard to test.
**What:** Finds modules that should be separated, domain services that are missing, testability gaps.
```
/improve-codebase-architecture
/improve-codebase-architecture  focus on booking and hold modules — getting coupled
```

### `/review`
**When:** Before merging any PR, especially significant ones.
**What:** Reviews the branch on two axes in parallel — coding standards AND spec compliance.
```
/review since main
/review ultra PR#42
```

### `/triage`
**When:** Weekly, or when GitHub Issues pile up.
**What:** Processes open issues — applies labels, routes to agent or human, closes wontfix items.
```
/triage
/triage  flag V1 blockers as ready-for-agent
```

### `/diagnose`
**When:** Something is broken and the cause is not obvious.
**What:** Structured debug loop — reproduce → minimise → hypothesise → instrument → fix → regression test.
```
/diagnose  holds not expiring after TTL — slots stay locked
/diagnose  Stripe webhook returning 400 intermittently
/diagnose  availability grid shows booked slot as free
/diagnose  EF Core generating N+1 queries on booking list
```

### `/request-refactor-plan`
**When:** Before refactoring a complex or risky piece of code.
**What:** Produces a safe step-by-step plan before any code is touched.
```
/request-refactor-plan  extract pricing logic into dedicated PricingService
/request-refactor-plan  move all Stripe calls behind IPaymentGateway interface
```

### `/schedule`
**When:** After launch — to automate recurring tasks in the cloud.
**What:** Creates a Claude Code agent on a cron schedule.
```
/schedule  run /triage every day at 8am and label new issues
/schedule  run /security-review every Monday 9am
/schedule  run /code-review ultra on main every Sunday night
```

### `/loop`
**When:** When you want to poll for something during a dev session.
**What:** Runs a skill or prompt on a repeating interval.
```
/loop 2m  check if Hangfire processed the hold sweep job
/loop 10m  run dotnet test and report any failures
```

### `/to-issues`
**When:** When planning a new feature not yet in the issue tracker.
**What:** Breaks a plan into independently-grabbable GitHub Issues as vertical slices.
```
/to-issues  break package redemption flow into issues
/to-issues  create issues for admin panel features only
```

### `/handoff`
**When:** Ending a long session, or handing work to another developer or agent.
**What:** Compacts the conversation into a brief summary another agent can pick up.
```
/handoff
/handoff  summarize what we built in the booking flow and what is left
```

---

## Skill Order by Project Phase

```
NOW — Setup (do once)
  /git-guardrails-claude-code
  /setup-pre-commit

NOW — Per Feature (repeat for every feature)
  /grill-with-docs      ← check plan against ADRs
  /design-an-interface  ← pick the right shape
  /tdd                  ← build test-first
  /run                  ← start the app
  /verify               ← confirm it actually works
  /code-review          ← clean before committing

LATER — Per PR
  /security-review
  /review since main

LATER — Every Few Features
  /simplify
  /improve-codebase-architecture
  /triage

LATER — After Launch
  /schedule
  /qa
```

---

## Quick Lookup — What Skill For What Situation

| Situation | Skill |
|---|---|
| Something feels wrong with my design plan | `/grill-with-docs` |
| Not sure which service/API shape to use | `/design-an-interface` |
| Building any feature | `/tdd` |
| Need to see it working in the browser | `/run` + `/verify` |
| Something is broken, don't know why | `/diagnose` |
| Before every commit | `/code-review` |
| Auth, payments, or admin endpoint code | `/security-review` |
| A controller or service has grown big | `/simplify` |
| Code feels coupled or hard to test | `/improve-codebase-architecture` |
| GitHub issues piling up | `/triage` |
| Want automation to run on a schedule | `/schedule` |
| Handing off to another session or developer | `/handoff` |
