using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public enum SlotStatus { Available, Held, Booked, Past, BlackedOut, BeyondHorizon }

public record SlotInfo(DateTime SlotStart, DateTime SlotEnd, SlotStatus Status, decimal Price, bool HeldByMe = false);

public class AvailabilityService(
    AppDbContext db,
    IPricingCalculator pricing,
    ICourtGridEngine gridEngine,
    IConfiguration config,
    CourtClock clock
)
{
    private BookingSettings Settings => config.GetSection("Booking").Get<BookingSettings>() ?? new();

    public async Task<IReadOnlyList<SlotInfo>> GetAvailabilityAsync(Guid courtId, DateOnly date, string? requestingUserId = null)
    {
        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var slots = gridEngine.GenerateGrid(court, date);
        var now = clock.Now();
        var horizonEnd = now.AddDays(Settings.BookingHorizonDays);

        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);

        var holds = await db.Holds
            .Where(h => h.CourtId == courtId && h.SlotStart >= dayStart && h.SlotStart < dayEnd && h.ExpiresAt > now)
            .Select(h => new { h.SlotStart, h.UserId })
            .ToListAsync();

        var bookedSlotArrays = await db.Bookings
            .Where(bk => bk.CourtId == courtId && bk.State != BookingState.Cancelled)
            .Select(bk => bk.SlotStarts)
            .ToListAsync();

        var bookedSlots = bookedSlotArrays
            .SelectMany(s => s)
            .Where(s => s >= dayStart && s < dayEnd)
            .ToList();

        var blackouts = await db.Blackouts
            .Where(bl => bl.CourtId == courtId && bl.Start < dayEnd && bl.End > dayStart)
            .ToListAsync();

        var heldSet = holds.Select(h => h.SlotStart).ToHashSet();
        var heldByMeSet = requestingUserId is null
            ? []
            : holds.Where(h => h.UserId == requestingUserId).Select(h => h.SlotStart).ToHashSet();
        var bookedSet = bookedSlots.ToHashSet();

        return slots.Select(slotStart =>
        {
            var slotEnd = slotStart.AddMinutes(court.SlotLengthMinutes);
            var status = gridEngine.DetermineSlotStatus(
                court,
                slotStart,
                now,
                horizonEnd,
                heldSet,
                bookedSet,
                blackouts,
                pricing
            );

            var price = status == SlotStatus.Available ? pricing.GetPrice(court, slotStart) : 0m;
            return new SlotInfo(slotStart, slotEnd, status, price, heldByMeSet.Contains(slotStart));
        }).ToList();
    }
}
