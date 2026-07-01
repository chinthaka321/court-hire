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

        var now = DateTime.UtcNow;
        if (slotStart <= now)
            throw new InvalidOperationException("Cannot book a past slot");

        if (slotStart > now.AddDays(Settings.BookingHorizonDays))
            throw new InvalidOperationException("Slot is beyond booking horizon");

        var slotStarts = Enumerable.Range(0, slotCount)
            .Select(i => slotStart.AddMinutes(i * court.SlotLengthMinutes))
            .ToList();

        var slotStartsSet = slotStarts.ToHashSet();

        // Check existing holds — one row per slot so no expansion needed
        var heldSlots = await db.Holds
            .Where(h => h.CourtId == courtId && h.ExpiresAt > now)
            .Select(h => h.SlotStart)
            .ToListAsync();

        if (heldSlots.Any(s => slotStartsSet.Contains(s)))
            throw new InvalidOperationException("Slot is no longer available");

        // Check confirmed bookings (stored as arrays, so must check in memory)
        var bookedSlotArrays = await db.Bookings
            .Where(bk => bk.CourtId == courtId && bk.State != BookingState.Cancelled)
            .Select(bk => bk.SlotStarts)
            .ToListAsync();

        if (bookedSlotArrays.SelectMany(ss => ss).Any(s => slotStartsSet.Contains(s)))
            throw new InvalidOperationException("Slot is no longer available");

        // Create one Hold row per slot, all sharing the same HoldGroupId.
        // The DB UNIQUE(CourtId, SlotStart) constraint is the concurrency backstop.
        var holdGroupId = Guid.NewGuid();
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
                ExpiresAt = now.AddMinutes(Settings.HoldTtlMinutes)
            });
        }

        await db.SaveChangesAsync();
        return new HoldGroup(holdGroupId, totalPrice, slotCount * court.SlotLengthMinutes);
    }

    public async Task<Booking> ConfirmBookingAsync(string stripePaymentIntentId, Guid holdGroupId)
    {
        var holds = await db.Holds
            .Where(h => h.HoldGroupId == holdGroupId)
            .OrderBy(h => h.SlotStart)
            .ToListAsync();

        if (holds.Count == 0) throw new KeyNotFoundException("Hold not found");

        var first = holds[0];
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
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

        if (!withinWindow && !isAdmin)
            throw new InvalidOperationException("Cancellation window has passed — no refund will be issued");

        booking.State = BookingState.Cancelled;
        await db.SaveChangesAsync();
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
