using TennisBooking.Models;

namespace TennisBooking.Services;

public interface IPricingCalculator
{
    decimal? TryGetPrice(Court court, DateTime slotStart);
    decimal GetPrice(Court court, DateTime slotStart);
    decimal CalculateSpanPrice(Court court, DateTime slotStart, int slotCount);
}
