# Price is captured at Hold creation and never recomputed

When a Hold is created, the price is read from the live rate table and written onto the Hold. Stripe is charged exactly that amount. The resulting Booking stores `amount_charged` immutably. Refunds use that stored value. Price is never re-looked-up after Hold creation — not at checkout, not at webhook time. This prevents a race condition where an admin changes the rate table mid-checkout and the user is charged the new price they never saw.
