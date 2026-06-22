# Multi-slot block bookings

A booking may cover 2 or more consecutive slots on the same court on the same day ("block booking"). The following decisions were made:

**One Hold per slot, grouped by `HoldGroupId`**: Rather than a single Hold with a slot array, each slot in a block gets its own Hold row, all sharing a `HoldGroupId` Guid inserted atomically in one transaction. The DB-level `UNIQUE(court_id, slot_start)` constraint (ADR-0007) is preserved without change. The sweeper and confirm path operate on all Holds with the same group ID together.

**Captured price = sum of constituent slot prices**: Each slot is priced independently by the existing 2×2 rate table, then summed. No new pricing concept is introduced. A block straddling the day/night boundary is priced correctly by design.

**Duration picker UI**: The user taps a start slot and selects a duration (e.g. 1 h / 2 h / 3 h). The block is always anchored to the tapped slot and extends forward. If any slot in the block is unavailable, the duration option is disabled.

**Whole-block cancel only, no block reschedule in V1**: Cancellation refunds the full `AmountCharged` for the entire block. Partial slot cancellation is not supported — it would require splitting `AmountCharged` and issuing partial Stripe refunds, contradicting the immutability invariant. Block reschedule is also deferred: the same-price check on a shifted block produces confusing rejections when the block crosses a band boundary. Users cancel and rebook instead.

## Considered options

- **One Hold with slot array**: simpler at the application layer but weakens the DB uniqueness constraint to application-level enforcement. Rejected to preserve ADR-0007.
- **Partial cancellation**: would require mutable `AmountCharged` and a new "partially cancelled" booking state. Rejected for V1.
- **Block reschedule**: same-price check fails non-obviously when a shifted block crosses the day/night boundary. Deferred to V2.
- **Tap-tap selection**: familiar but requires a "selection in progress" UI state and more complex slot validation. Rejected in favour of the duration picker.
