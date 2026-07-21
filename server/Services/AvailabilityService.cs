using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public enum SlotStatus { Available, Held, Booked, Past, BlackedOut, BeyondHorizon }

public record SlotInfo(DateTime SlotStart, DateTime SlotEnd, SlotStatus Status, decimal Price, bool HeldByMe = false);

public class AvailabilityService(AppDbContext db, PricingService pricing, IConfiguration config)
{
    private BookingSettings Settings => config.GetSection("Booking").Get<BookingSettings>() ?? new();

    public async Task<IReadOnlyList<SlotInfo>> GetAvailabilityAsync(Guid courtId, DateOnly date, string? requestingUserId = null)
    {
        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var slots = GenerateGrid(court, date);
        var now = DateTime.UtcNow;
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
            SlotStatus status;

            if (slotStart < now)
                status = SlotStatus.Past;
            else if (slotStart > horizonEnd)
                // Keep the grid honest: hold creation would reject these anyway (#30)
                status = SlotStatus.BeyondHorizon;
            else if (blackouts.Any(bl => bl.Start < slotEnd && bl.End > slotStart))
                status = SlotStatus.BlackedOut;
            else if (bookedSet.Contains(slotStart))
                status = SlotStatus.Booked;
            else if (heldSet.Contains(slotStart))
                status = SlotStatus.Held;
            else
                status = SlotStatus.Available;

            var price = 0m;
            if (status == SlotStatus.Available)
            {
                // A court with no configured rate must not be bookable — show it as closed.
                var rate = pricing.TryGetPrice(court, slotStart);
                if (rate is null)
                    status = SlotStatus.BlackedOut;
                else
                    price = rate.Value;
            }

            return new SlotInfo(slotStart, slotEnd, status, price, heldByMeSet.Contains(slotStart));
        }).ToList();
    }

    private static List<DateTime> GenerateGrid(Court court, DateOnly date)
    {
        var slots = new List<DateTime>();
        var open = date.ToDateTime(court.OpeningHours.Open, DateTimeKind.Utc);
        var close = court.OpeningHours.CloseUtc(date);
        var current = open;
        while (current.AddMinutes(court.SlotLengthMinutes) <= close)
        {
            slots.Add(current);
            current = current.AddMinutes(court.SlotLengthMinutes);
        }
        return slots;
    }
}
