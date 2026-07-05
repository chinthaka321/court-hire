using TennisBooking.Models;

namespace TennisBooking.Services;

public class PricingService
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
        ?? throw new InvalidOperationException("No price is configured for this court and time");
}
