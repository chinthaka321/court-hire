
# Claude Code Skills Guide

Start-to-end reference with sample prompts.

---

## Phase 1 — Setup

### `/init`
Generate `CLAUDE.md` with codebase context. Run first.
```
/init
/init  this is a multi-tenant SaaS, note that in CLAUDE.md
```

### `/update-config`
Wire permissions, env vars, automated hooks into `settings.json`.
```
/update-config  allow npm run build and npm test without prompting
/update-config  set DATABASE_URL=postgres://localhost:5432/myapp
/update-config  after every Edit tool call, run eslint on changed file
/update-config  whenever Claude stops, print git status
/update-config  move npm permission to global settings
```

### `/setup-pre-commit`
Add pre-commit hook — lint/type errors never reach git.
```
/setup-pre-commit
/setup-pre-commit  run dotnet build and dotnet test before every commit
/setup-pre-commit  run eslint and prettier check on staged files only
```

### `/git-guardrails-claude-code`
Block destructive git commands inside Claude Code. Do once, early.
```
/git-guardrails-claude-code
/git-guardrails-claude-code  also block git stash drop and git clean
```

### `/keybindings-help`
Customize IDE keyboard shortcuts.
```
/keybindings-help  rebind submit to Ctrl+Enter
/keybindings-help  add chord Ctrl+K Ctrl+R to trigger /code-review
/keybindings-help  change cancel key to Escape
```

---

## Phase 2 — Planning & Design

### `/to-prd`
Turn conversation into formal PRD → post to GitHub Issues.
```
/to-prd
/to-prd  focus on booking flow and payment section only
/to-prd  include V2 items as future considerations section
```

### `/grill-me`
Stress-test plan with relentless questions. Run before writing code.
```
/grill-me  here's my plan: users pick slot, create hold, redirect Stripe, confirm via webhook
/grill-me  I want availability grid computed at read time instead of stored
/grill-me  my plan for admin panel is single CRUD page per entity — enough?
/grill-me  thinking of job queue for hold-sweeper and reminder emails
```

### `/grill-with-docs`
Like `/grill-me` but cross-references `CONTEXT.md` + ADRs. Updates docs inline.
```
/grill-with-docs  adding waitlist feature — does it conflict with hold model?
/grill-with-docs  planning multi-tenancy — challenge me on what changes
/grill-with-docs  want to swap Stripe for different payment provider
```

### `/design-an-interface`
Parallel sub-agents generate multiple radically different designs. Use before committing to a shape.
```
/design-an-interface  for the availability computation service
/design-an-interface  for pricing rate-table lookup — flat fn vs class vs repository
/design-an-interface  for Hold expiry sweeper — in-process timer vs Hangfire vs DB poll
/design-an-interface  for booking cancellation API endpoint
```

### `/to-issues`
Break PRD/plan into independently-grabbable GitHub Issues as vertical slices.
```
/to-issues
/to-issues  break booking flow into issues, each deployable independently
/to-issues  create issues for admin panel features only
/to-issues  use PRD V1 scope, ignore anything marked V2
```

---

## Phase 3 — Implementation

### `/tdd`
Red → green → refactor. Write failing tests first, then make them pass.
```
/tdd  implement stale-hold sweeper that expires Holds past TTL
/tdd  build availability grid — courts × time slots minus blackouts
/tdd  add cancellation window check — full refund if within 24h, else none
/tdd  wire Stripe webhook: payment_succeeded converts Hold to Booking
/tdd  implement rate-table lookup: price = f(court_id, day_type, band)
```

### `/prototype`
Throwaway spike to validate approach before committing.
```
/prototype  how would Hangfire schedule hold-sweeper and reminder emails together?
/prototype  spike virtual slot grid for one court, one day — raw output only
/prototype  try Clerk JWT validation as middleware in ASP.NET Core
/prototype  rough out Stripe webhook handler flow — no DB wiring yet
```

### `/claude-api`
Reference: Anthropic SDK, model IDs, pricing, streaming, tool use, caching.
```
/claude-api  cheapest model for short classification task?
/claude-api  how to implement prompt caching to reduce costs?
/claude-api  stream response with TypeScript SDK
/claude-api  difference between tool_use and computer_use?
/claude-api  count tokens before sending request
```

### `/scaffold-exercises`
Generate practice exercises from concept. Good for onboarding.
```
/scaffold-exercises  EF Core migrations for junior developer
/scaffold-exercises  Hangfire recurring jobs — 3 exercises simple to advanced
/scaffold-exercises  Stripe webhooks idempotency handling
```

---

## Phase 4 — Quality & Review

### `/code-review`
Review current diff. Catches correctness bugs + simplification opportunities.
```
/code-review              # medium depth, high-confidence findings
/code-review ultra        # deep multi-agent cloud review
/code-review --fix        # apply findings automatically
/code-review --comment    # post findings as inline PR comments
/code-review ultra --comment PR#42
```

### `/simplify`
Reuse, simplification, efficiency pass only. Not bug hunting. Auto-applies fixes.
```
/simplify
/simplify  focus on availability controller — it grew big
/simplify  pricing module has lots of repeated conditionals
```

### `/security-review`
Audit for OWASP vulnerabilities, secrets, broken auth, injection risks.
```
/security-review
/security-review  focus on webhook handler and payment flow
/security-review  check for hardcoded secrets in appsettings
/security-review  review admin-only endpoints — properly role-gated?
```

### `/review`
Branch review on two axes in parallel — Standards + Spec.
```
/review since main
/review ultra PR#42
/review since v1.0.0
/review ultra --comment PR#17
```

### `/qa`
End-to-end quality pass — runs app, probes edge cases.
```
/qa
/qa  focus on booking flow: slot → hold → Stripe → webhook → confirm
/qa  test cancellation window edge cases — exactly at 24h boundary
/qa  check week view on narrow viewport
```

### `/verify`
Confirm specific change works by running app + observing real behavior.
```
/verify  cancellation refund flow triggers Stripe refund
/verify  expired holds swept, slot becomes available again
/verify  redirect-back page shows "confirming..." not trusting redirect
/verify  admin can override cancellation window and still refund
```

---

## Phase 5 — Running & Observing

### `/run`
Start app. Auto-detects project type.
```
/run
/run  and screenshot the day-view calendar
/run  start backend API only, not frontend
/run  and open admin panel in browser
```

### `/diagnose`
Structured debug: reproduce → minimise → hypothesise → instrument → fix → regression test.
```
/diagnose  holds not expiring after TTL — slots stay locked
/diagnose  Stripe webhook returning 400 intermittently — no pattern
/diagnose  availability grid shows slot free when it's booked
/diagnose  EF Core generating N+1 queries on booking list endpoint
/diagnose  week view collapses wrong at 768px
```

---

## Phase 6 — Maintenance

### `/improve-codebase-architecture`
Find refactoring/consolidation opportunities informed by `CONTEXT.md` + ADRs.
```
/improve-codebase-architecture
/improve-codebase-architecture  focus on booking and hold modules — getting coupled
/improve-codebase-architecture  find anything that should be a domain service
/improve-codebase-architecture  look for testability gaps
```

### `/request-refactor-plan`
Safe step-by-step refactor plan before touching complex code.
```
/request-refactor-plan  extract pricing logic into PricingService
/request-refactor-plan  split monolithic AvailabilityController into query + command handlers
/request-refactor-plan  move all Stripe calls behind IPaymentGateway interface
```

### `/triage`
Process open GitHub Issues — label, prioritize, route.
```
/triage
/triage  focus on needs-triage label only
/triage  close wontfix issues with comment explaining why
/triage  flag V1 blockers as ready-for-agent
```

### `/fewer-permission-prompts`
Scan transcripts, allowlist common read-only ops, reduce prompts.
```
/fewer-permission-prompts
/fewer-permission-prompts  add to global settings
```

### `/loop`
Run skill/prompt on recurring interval.
```
/loop 5m /triage
/loop 2m  check if Hangfire processed hold sweep — done or still running?
/loop 10m  run dotnet test, report failures
/loop      # no interval — Claude self-paces
```

### `/schedule`
Cloud agent on cron schedule. Truly recurring automation.
```
/schedule  run /security-review every Monday 9am
/schedule  run /triage every day 8am and label new issues
/schedule  remind me to check Stripe webhook logs this Friday 3pm
/schedule  run /code-review ultra on main every Sunday night
```

---

## Utility (Any Phase)

### `/handoff`
Compact conversation into brief for another agent or next session.
```
/handoff
/handoff  summarize what we built in booking flow and what's left
/handoff  create handoff for teammate picking up Stripe integration
```

### `/caveman`
Ultra-compressed mode. Cuts token usage ~75%.
```
/caveman
use caveman
less tokens
```
> Off: `stop caveman` or `normal mode`

### `/write-a-skill`
Build new reusable skill for repeated workflows.
```
/write-a-skill  run dotnet test, parse failures, create GitHub issue for each
/write-a-skill  check all admin endpoints are role-gated before every PR
/write-a-skill  generate release notes draft from git log since last tag
```

### `/migrate-to-shoehorn`
Replace `as` type assertions in tests with `@total-typescript/shoehorn`.
```
/migrate-to-shoehorn
/migrate-to-shoehorn  only files under src/__tests__/booking/
```

### `/edit-article`
Edit/restructure written content — docs, ADRs, proposals.
```
/edit-article  tighten this ADR, too verbose
/edit-article  restructure PRD so V1 scope comes before domain model
/edit-article  improve clarity of cancellation policy in user-facing docs
```

---

## Recommended Order

```
Phase 1 — Setup
  /init
  /update-config
  /git-guardrails-claude-code
  /setup-pre-commit

Phase 2 — Plan
  /grill-me → /to-prd → /to-issues

Phase 3 — Build (per feature)
  /design-an-interface → /tdd → /run → /verify

Phase 4 — Ship
  /security-review → /code-review ultra → /review ultra

Phase 5 — Maintain
  /improve-codebase-architecture
  /triage
  /schedule
```

---

**Rule:** skills compose. Each phase feeds next. Be specific in prompts — domain detail = better output.
