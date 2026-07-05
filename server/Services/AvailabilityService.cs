using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public enum SlotStatus { Available, Held, Booked, Past, BlackedOut }

public record SlotInfo(DateTime SlotStart, DateTime SlotEnd, SlotStatus Status, decimal Price);

public class AvailabilityService(AppDbContext db, PricingService pricing)
{
    public async Task<IReadOnlyList<SlotInfo>> GetAvailabilityAsync(Guid courtId, DateOnly date)
    {
        var court = await db.Courts
            .Include(c => c.PriceRates)
            .FirstOrDefaultAsync(c => c.Id == courtId && c.Active)
            ?? throw new KeyNotFoundException("Court not found");

        var slots = GenerateGrid(court, date);
        var now = DateTime.UtcNow;

        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);

        var holds = await db.Holds
            .Where(h => h.CourtId == courtId && h.SlotStart >= dayStart && h.SlotStart < dayEnd && h.ExpiresAt > now)
            .Select(h => h.SlotStart)
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

        var heldSet = holds.ToHashSet();
        var bookedSet = bookedSlots.ToHashSet();

        return slots.Select(slotStart =>
        {
            var slotEnd = slotStart.AddMinutes(court.SlotLengthMinutes);
            SlotStatus status;

            if (slotStart < now)
                status = SlotStatus.Past;
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

            return new SlotInfo(slotStart, slotEnd, status, price);
        }).ToList();
    }

    private static List<DateTime> GenerateGrid(Court court, DateOnly date)
    {
        var slots = new List<DateTime>();
        var open = date.ToDateTime(court.OpeningHours.Open, DateTimeKind.Utc);
        var close = date.ToDateTime(court.OpeningHours.Close, DateTimeKind.Utc);
        var current = open;
        while (current.AddMinutes(court.SlotLengthMinutes) <= close)
        {
            slots.Add(current);
            current = current.AddMinutes(court.SlotLengthMinutes);
        }
        return slots;
    }
}
