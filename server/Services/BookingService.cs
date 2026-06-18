using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public class BookingSettings
{
    public int HoldTtlMinutes { get; set; } = 7;
    public int CancellationWindowHours { get; set; } = 24;
    public int BookingHorizonDays { get; set; } = 14;
}

public class BookingService(AppDbContext db, PricingService pricing, IConfiguration config)
{
    private BookingSettings Settings => config.GetSection("Booking").Get<BookingSettings>() ?? new();

    public async Task<Hold> CreateHoldAsync(Guid courtId, DateTime slotStart, string userId)
    {
        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var now = DateTime.UtcNow;
        if (slotStart <= now)
            throw new InvalidOperationException("Cannot book a past slot");

        if (slotStart > now.AddDays(Settings.BookingHorizonDays))
            throw new InvalidOperationException("Slot is beyond booking horizon");

        // Check availability
        var conflictingHold = await db.Holds.AnyAsync(h =>
            h.CourtId == courtId && h.SlotStart == slotStart && h.ExpiresAt > now);

        var conflictingBooking = await db.Bookings.AnyAsync(bk =>
            bk.CourtId == courtId && bk.SlotStarts.Contains(slotStart) && bk.State != BookingState.Cancelled);

        if (conflictingHold || conflictingBooking)
            throw new InvalidOperationException("Slot is no longer available");

        var hold = new Hold
        {
            Id = Guid.NewGuid(),
            CourtId = courtId,
            SlotStart = slotStart,
            UserId = userId,
            CapturedPrice = pricing.GetPrice(court, slotStart),
            ExpiresAt = now.AddMinutes(Settings.HoldTtlMinutes)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();
        return hold;
    }

    public async Task<Booking> ConfirmBookingAsync(string stripePaymentIntentId, Guid holdId)
    {
        var hold = await db.Holds.FindAsync(holdId)
            ?? throw new KeyNotFoundException("Hold not found");

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CourtId = hold.CourtId,
            SlotStarts = [hold.SlotStart],
            UserId = hold.UserId,
            AmountCharged = hold.CapturedPrice,
            State = BookingState.Completed,
            StripePaymentIntentId = stripePaymentIntentId,
            CreatedAt = DateTime.UtcNow
        };

        db.Bookings.Add(booking);
        db.Holds.Remove(hold);
        await db.SaveChangesAsync();
        return booking;
    }

    public async Task CancelBookingAsync(Guid bookingId, string requestingUserId, bool isAdmin = false)
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
        var withinWindow = isAdmin || DateTime.UtcNow <= earliestSlot.AddHours(-Settings.CancellationWindowHours);

        booking.State = BookingState.Cancelled;
        await db.SaveChangesAsync();

        // Return whether refund should be issued — caller handles Stripe
        if (!withinWindow && !isAdmin)
            throw new InvalidOperationException("Cancellation window has passed — no refund");
    }

    public async Task UpdateHoldSessionAsync(Guid holdId, string sessionId)
    {
        var hold = await db.Holds.FindAsync(holdId)
            ?? throw new KeyNotFoundException("Hold not found");
        hold.StripeSessionId = sessionId;
        await db.SaveChangesAsync();
    }

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

        var newPrice = pricing.GetPrice(booking.Court, newSlotStart);
        if (newPrice != booking.AmountCharged)
            throw new InvalidOperationException("Price differs — please cancel and rebook");

        var now = DateTime.UtcNow;
        var conflict = await db.Bookings.AnyAsync(bk =>
            bk.CourtId == booking.CourtId && bk.SlotStarts.Contains(newSlotStart) &&
            bk.State != BookingState.Cancelled && bk.Id != bookingId);

        var holdConflict = await db.Holds.AnyAsync(h =>
            h.CourtId == booking.CourtId && h.SlotStart == newSlotStart && h.ExpiresAt > now);

        if (conflict || holdConflict)
            throw new InvalidOperationException("New slot is not available");

        booking.SlotStarts = [newSlotStart];
        await db.SaveChangesAsync();
    }
}
