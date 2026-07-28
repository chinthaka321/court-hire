using TennisBooking.Models;

namespace TennisBooking.Services;

public class CourtGridEngine : ICourtGridEngine
{
    public List<DateTime> GenerateGrid(Court court, DateOnly date)
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

    public List<DateTime> CalculateSlotStarts(Court court, DateTime slotStart, int slotCount)
    {
        if (slotCount < 1 || slotCount > 4)
            throw new InvalidOperationException("Slot count must be between 1 and 4");

        return Enumerable.Range(0, slotCount)
            .Select(i => slotStart.AddMinutes(i * court.SlotLengthMinutes))
            .ToList();
    }

    public SlotStatus DetermineSlotStatus(
        Court court,
        DateTime slotStart,
        DateTime now,
        DateTime horizonEnd,
        HashSet<DateTime> heldSet,
        HashSet<DateTime> bookedSet,
        List<Blackout> blackouts,
        IPricingCalculator pricingCalculator
    )
    {
        var slotEnd = slotStart.AddMinutes(court.SlotLengthMinutes);

        if (slotStart < now)
            return SlotStatus.Past;
        if (slotStart > horizonEnd)
            return SlotStatus.BeyondHorizon;
        if (blackouts.Any(bl => bl.Start < slotEnd && bl.End > slotStart))
            return SlotStatus.BlackedOut;
        if (bookedSet.Contains(slotStart))
            return SlotStatus.Booked;
        if (heldSet.Contains(slotStart))
            return SlotStatus.Held;

        var rate = pricingCalculator.TryGetPrice(court, slotStart);
        if (rate is null)
            return SlotStatus.BlackedOut;

        return SlotStatus.Available;
    }

    public void ValidateSlotsBookable(
        Court court,
        List<DateTime> slotStarts,
        DateTime now,
        int horizonDays,
        HashSet<DateTime> heldSlots,
        HashSet<DateTime> bookedSlots,
        List<Blackout> blackouts
    )
    {
        var first = slotStarts[0];
        var lastEnd = slotStarts[^1].AddMinutes(court.SlotLengthMinutes);

        if (first <= now)
            throw new InvalidOperationException("Cannot book a past slot");

        if (first > now.AddDays(horizonDays))
            throw new InvalidOperationException("Slot is beyond the booking horizon");

        var day = DateOnly.FromDateTime(first);
        var open = day.ToDateTime(court.OpeningHours.Open, DateTimeKind.Utc);
        var close = court.OpeningHours.CloseUtc(day);

        if (first < open || lastEnd > close)
            throw new InvalidOperationException("Slot is outside the court's opening hours");

        if ((int)(first - open).TotalMinutes % court.SlotLengthMinutes != 0)
            throw new InvalidOperationException("Slot is not aligned to the court's time grid");

        var slotSet = slotStarts.ToHashSet();

        if (heldSlots.Any(slotSet.Contains))
            throw new InvalidOperationException("Slot is no longer available");

        if (bookedSlots.Any(slotSet.Contains))
            throw new InvalidOperationException("Slot is no longer available");

        var isBlackedOut = blackouts.Any(bl => bl.Start < lastEnd && bl.End > first);
        if (isBlackedOut)
            throw new InvalidOperationException("The court is unavailable during this time");
    }
}
