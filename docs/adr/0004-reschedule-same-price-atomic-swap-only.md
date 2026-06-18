# Reschedule is a same-price atomic slot swap with no money movement

Rescheduling cancels the old slot and claims the new slot in a single transaction. No refund is issued and no new charge is made — it only works when the price of the new slot matches the captured price on the original Booking. If the prices differ, the user must cancel (triggering a refund per the cancellation window) and rebook. This keeps the payment model simple: one charge per Booking, one refund if cancelled. A partial-charge-difference flow was rejected as too complex for V1.
