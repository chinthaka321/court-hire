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

public class BookingService(
    AppDbContext db,
    IPricingCalculator pricing,
    ICourtGridEngine gridEngine,
    IConfiguration config,
    CourtClock clock
)
{
    private BookingSettings Settings => config.GetSection("Booking").Get<BookingSettings>() ?? new();

    public async Task<HoldGroup> CreateHoldAsync(Guid courtId, DateTime slotStart, string userId, int slotCount = 1)
    {
        var (court, slotStarts) = await PrepareSlotsAsync(courtId, slotStart, slotCount);

        var now = clock.Now();
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

        var holdGroupId = Guid.NewGuid();
        var expiresAt = now.AddMinutes(Settings.HoldTtlMinutes);

        foreach (var slot in slotStarts)
        {
            var price = pricing.GetPrice(court, slot);
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
        var totalPrice = pricing.CalculateSpanPrice(court, slotStart, slotCount);
        return new HoldGroup(holdGroupId, totalPrice, slotCount * court.SlotLengthMinutes);
    }

    public async Task<Booking> CreateAdminBookingAsync(Guid courtId, DateTime slotStart, int slotCount, string adminUserId, string? notes, string? payerName, string? payerEmail)
    {
        var (court, slotStarts) = await PrepareSlotsAsync(courtId, slotStart, slotCount);

        await EnsureSlotsBookableAsync(court, slotStarts);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CourtId = courtId,
            SlotStarts = slotStarts,
            UserId = adminUserId,
            AmountCharged = pricing.CalculateSpanPrice(court, slotStart, slotCount),
            State = BookingState.Completed,
            Notes = notes,
            PayerName = payerName,
            PayerEmail = payerEmail,
            CreatedAt = DateTime.UtcNow
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return booking;
    }

    public async Task<Booking> ConfirmBookingAsync(string? stripePaymentIntentId, Guid holdGroupId)
    {
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

        var now = clock.Now();
        if (earliestSlot <= now)
            throw new InvalidOperationException("This booking has already started and can no longer be cancelled");

        var withinWindow = now <= earliestSlot.AddHours(-Settings.CancellationWindowHours);

        booking.State = BookingState.Cancelled;
        await db.SaveChangesAsync();

        return isAdmin || withinWindow;
    }

    public async Task ReleaseHoldGroupAsync(Guid holdGroupId)
    {
        var holds = await db.Holds.Where(h => h.HoldGroupId == holdGroupId).ToListAsync();
        if (holds.Count > 0)
        {
            db.Holds.RemoveRange(holds);
            await db.SaveChangesAsync();
        }
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

        var court = booking.Court;
        var newSlotStarts = gridEngine.CalculateSlotStarts(court, newSlotStart, booking.SlotStarts.Count);

        var newTotal = pricing.CalculateSpanPrice(court, newSlotStart, booking.SlotStarts.Count);
        if (newTotal != booking.AmountCharged)
            throw new InvalidOperationException("The new time costs a different amount — please cancel and rebook instead");

        await EnsureSlotsBookableAsync(court, newSlotStarts, excludeBookingId: booking.Id);

        booking.SlotStarts = newSlotStarts;
        await db.SaveChangesAsync();
    }

    private async Task<(Court Court, List<DateTime> SlotStarts)> PrepareSlotsAsync(Guid courtId, DateTime slotStart, int slotCount)
    {
        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var slotStarts = gridEngine.CalculateSlotStarts(court, slotStart, slotCount);
        return (court, slotStarts);
    }

    private async Task EnsureSlotsBookableAsync(Court court, List<DateTime> slotStarts, Guid? excludeBookingId = null)
    {
        var now = clock.Now();
        var lastEnd = slotStarts[^1].AddMinutes(court.SlotLengthMinutes);

        var heldSlots = (await db.Holds
            .Where(h => h.CourtId == court.Id && h.ExpiresAt > now)
            .Select(h => h.SlotStart)
            .ToListAsync()).ToHashSet();

        var bookedSlotArrays = await db.Bookings
            .Where(b => b.CourtId == court.Id && b.State != BookingState.Cancelled
                        && (excludeBookingId == null || b.Id != excludeBookingId))
            .Select(b => b.SlotStarts)
            .ToListAsync();

        var bookedSlots = bookedSlotArrays.SelectMany(s => s).ToHashSet();

        var blackouts = await db.Blackouts
            .Where(bl => bl.CourtId == court.Id && bl.Start < lastEnd && bl.End > slotStarts[0])
            .ToListAsync();

        gridEngine.ValidateSlotsBookable(
            court,
            slotStarts,
            now,
            Settings.BookingHorizonDays,
            heldSlots,
            bookedSlots,
            blackouts
        );
    }
}
