using TennisBooking.Models;

namespace TennisBooking.Services;

public class PricingCalculator : IPricingCalculator
{
    public decimal? TryGetPrice(Court court, DateTime slotStart)
    {
        var dayType = slotStart.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
            ? DayType.Weekend
            : DayType.Weekday;

        var band = TimeOnly.FromDateTime(slotStart) >= court.DayNightBoundary
            ? PriceBand.Night
            : PriceBand.Day;

        return court.PriceRates
            .FirstOrDefault(r => r.DayType == dayType && r.Band == band)
            ?.Price;
    }

    public decimal GetPrice(Court court, DateTime slotStart) =>
        TryGetPrice(court, slotStart)
        ?? throw new InvalidOperationException($"No price is configured for court '{court.Name}' at {slotStart:HH:mm}");

    public decimal CalculateSpanPrice(Court court, DateTime slotStart, int slotCount)
    {
        if (slotCount < 1)
            throw new ArgumentOutOfRangeException(nameof(slotCount), "Slot count must be at least 1");

        var totalPrice = 0m;
        for (var i = 0; i < slotCount; i++)
        {
            var currentSlot = slotStart.AddMinutes(i * court.SlotLengthMinutes);
            totalPrice += GetPrice(court, currentSlot);
        }
        return totalPrice;
    }
}
