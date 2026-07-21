using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public class BookingSettings
{
    public int HoldTtlMinutes { get; set; } = 7;
    public int CancellationWindowHours { get; set; } = 24;
    public int BookingHorizonDays { get; set; } = 14;
    public int ReminderHoursBefore { get; set; } = 24;
}

public record HoldGroup(Guid HoldGroupId, decimal TotalPrice, int DurationMinutes);

public class BookingService(AppDbContext db, PricingService pricing, IConfiguration config)
{
    private BookingSettings Settings => config.GetSection("Booking").Get<BookingSettings>() ?? new();

    public async Task<HoldGroup> CreateHoldAsync(Guid courtId, DateTime slotStart, string userId, int slotCount = 1)
    {
        if (slotCount < 1 || slotCount > 4)
            throw new InvalidOperationException("Slot count must be between 1 and 4");

        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var slotStarts = Enumerable.Range(0, slotCount)
            .Select(i => slotStart.AddMinutes(i * court.SlotLengthMinutes))
            .ToList();

        // Clear holds on these slots that no longer deserve to block this request:
        // expired-but-unswept holds, and the requesting user's OWN active holds
        // (an abandoned checkout — e.g. browser-back from Stripe — should be
        // replaceable by the same user immediately, not lock them out, #31).
        var now = DateTime.UtcNow;
        var replaceableHolds = await db.Holds
            .Where(h => h.CourtId == courtId && slotStarts.Contains(h.SlotStart)
                        && (h.ExpiresAt <= now || h.UserId == userId))
            .ToListAsync();
        if (replaceableHolds.Count > 0)
        {
            db.Holds.RemoveRange(replaceableHolds);
            await db.SaveChangesAsync();
        }

        await EnsureSlotsBookableAsync(court, slotStarts);

        // Create one Hold row per slot, all sharing the same HoldGroupId.
        // The DB UNIQUE(CourtId, SlotStart) constraint is the concurrency backstop.
        var holdGroupId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddMinutes(Settings.HoldTtlMinutes);
        var totalPrice = 0m;

        foreach (var slot in slotStarts)
        {
            var price = pricing.GetPrice(court, slot);
            totalPrice += price;
            db.Holds.Add(new Hold
            {
                Id = Guid.NewGuid(),
                HoldGroupId = holdGroupId,
                CourtId = courtId,
                SlotStart = slot,
                UserId = userId,
                CapturedPrice = price,
                ExpiresAt = expiresAt
            });
        }

        await db.SaveChangesAsync();
        return new HoldGroup(holdGroupId, totalPrice, slotCount * court.SlotLengthMinutes);
    }

    public async Task<Booking> ConfirmBookingAsync(string? stripePaymentIntentId, Guid holdGroupId)
    {
        // Idempotent: the Stripe webhook and the dev mock flow can both fire for the same group.
        var existing = await db.Bookings.FirstOrDefaultAsync(b => b.HoldGroupId == holdGroupId);
        if (existing is not null) return existing;

        var holds = await db.Holds
            .Where(h => h.HoldGroupId == holdGroupId)
            .OrderBy(h => h.SlotStart)
            .ToListAsync();

        if (holds.Count == 0) throw new KeyNotFoundException("Hold not found");

        var first = holds[0];
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            HoldGroupId = holdGroupId,
            CourtId = first.CourtId,
            SlotStarts = holds.Select(h => h.SlotStart).ToList(),
            UserId = first.UserId,
            AmountCharged = holds.Sum(h => h.CapturedPrice),
            State = BookingState.Completed,
            StripePaymentIntentId = stripePaymentIntentId,
            CreatedAt = DateTime.UtcNow
        };

        db.Bookings.Add(booking);
        db.Holds.RemoveRange(holds);
        await db.SaveChangesAsync();
        return booking;
    }

    /// <summary>
    /// Cancels a booking. Per ADR-0005: inside the cancellation window the caller
    /// is owed a full refund; outside it the cancellation still succeeds but no
    /// refund is due. Admin cancellations always refund. Returns whether a refund
    /// is owed — the controller performs the actual Stripe refund.
    /// </summary>
    public async Task<bool> CancelBookingAsync(Guid bookingId, string requestingUserId, bool isAdmin = false)
    {
        var booking = await db.Bookings
            .Include(b => b.Court)
            .FirstOrDefaultAsync(b => b.Id == bookingId)
            ?? throw new KeyNotFoundException("Booking not found");

        if (!isAdmin && booking.UserId != requestingUserId)
            throw new UnauthorizedAccessException();

        if (booking.State != BookingState.Completed)
            throw new InvalidOperationException("Booking is not in a cancellable state");

        var earliestSlot = booking.SlotStarts.Min();

        if (earliestSlot <= DateTime.UtcNow)
            throw new InvalidOperationException("This booking has already started and can no longer be cancelled");

        var withinWindow = DateTime.UtcNow <= earliestSlot.AddHours(-Settings.CancellationWindowHours);

        booking.State = BookingState.Cancelled;
        await db.SaveChangesAsync();

        return isAdmin || withinWindow;
    }

    /// <summary>Releases an entire hold group immediately (e.g. checkout-session creation failed).</summary>
    public async Task ReleaseHoldGroupAsync(Guid holdGroupId)
    {
        var holds = await db.Holds.Where(h => h.HoldGroupId == holdGroupId).ToListAsync();
        if (holds.Count > 0)
        {
            db.Holds.RemoveRange(holds);
            await db.SaveChangesAsync();
        }
    }

    public async Task UpdateHoldGroupSessionAsync(Guid holdGroupId, string sessionId)
    {
        var holds = await db.Holds
            .Where(h => h.HoldGroupId == holdGroupId)
            .ToListAsync();
        foreach (var hold in holds)
            hold.StripeSessionId = sessionId;
        await db.SaveChangesAsync();
    }

    // ADR-0004: reschedule moves the entire N-slot span as a unit — same court, same
    // slot count, new contiguous start — and only when the new span's total price
    // equals AmountCharged. No money moves.
    public async Task RescheduleBookingAsync(Guid bookingId, DateTime newSlotStart, string requestingUserId)
    {
        var booking = await db.Bookings
            .Include(b => b.Court)
            .ThenInclude(c => c.PriceRates)
            .FirstOrDefaultAsync(b => b.Id == bookingId)
            ?? throw new KeyNotFoundException("Booking not found");

        if (booking.UserId != requestingUserId)
            throw new UnauthorizedAccessException();

        if (booking.State != BookingState.Completed)
            throw new InvalidOperationException("Only completed bookings can be rescheduled");

        var court = booking.Court;
        var newSlotStarts = Enumerable.Range(0, booking.SlotStarts.Count)
            .Select(i => newSlotStart.AddMinutes(i * court.SlotLengthMinutes))
            .ToList();

        var newTotal = newSlotStarts.Sum(s => pricing.GetPrice(court, s));
        if (newTotal != booking.AmountCharged)
            throw new InvalidOperationException("The new time costs a different amount — please cancel and rebook instead");

        await EnsureSlotsBookableAsync(court, newSlotStarts, excludeBookingId: booking.Id);

        booking.SlotStarts = newSlotStarts;
        await db.SaveChangesAsync();
    }

    private async Task EnsureSlotsBookableAsync(Court court, List<DateTime> slotStarts, Guid? excludeBookingId = null)
    {
        var now = DateTime.UtcNow;
        var first = slotStarts[0];
        var lastEnd = slotStarts[^1].AddMinutes(court.SlotLengthMinutes);

        if (first <= now)
            throw new InvalidOperationException("Cannot book a past slot");

        if (first > now.AddDays(Settings.BookingHorizonDays))
            throw new InvalidOperationException("Slot is beyond the booking horizon");

        var day = DateOnly.FromDateTime(first);
        var open = day.ToDateTime(court.OpeningHours.Open, DateTimeKind.Utc);
        var close = court.OpeningHours.CloseUtc(day);

        if (first < open || lastEnd > close)
            throw new InvalidOperationException("Slot is outside the court's opening hours");

        if ((int)(first - open).TotalMinutes % court.SlotLengthMinutes != 0)
            throw new InvalidOperationException("Slot is not aligned to the court's time grid");

        var slotSet = slotStarts.ToHashSet();

        var heldSlots = await db.Holds
            .Where(h => h.CourtId == court.Id && h.ExpiresAt > now)
            .Select(h => h.SlotStart)
            .ToListAsync();

        if (heldSlots.Any(slotSet.Contains))
            throw new InvalidOperationException("Slot is no longer available");

        // Bookings store slots as arrays, so overlap is checked in memory
        var bookedSlotArrays = await db.Bookings
            .Where(b => b.CourtId == court.Id && b.State != BookingState.Cancelled
                        && (excludeBookingId == null || b.Id != excludeBookingId))
            .Select(b => b.SlotStarts)
            .ToListAsync();

        if (bookedSlotArrays.SelectMany(s => s).Any(slotSet.Contains))
            throw new InvalidOperationException("Slot is no longer available");

        var blackedOut = await db.Blackouts
            .AnyAsync(bl => bl.CourtId == court.Id && bl.Start < lastEnd && bl.End > first);

        if (blackedOut)
            throw new InvalidOperationException("The court is unavailable during this time");
    }
}
