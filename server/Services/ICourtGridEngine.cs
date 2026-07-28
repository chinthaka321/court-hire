using TennisBooking.Models;

namespace TennisBooking.Services;

public interface ICourtGridEngine
{
    List<DateTime> GenerateGrid(Court court, DateOnly date);
    List<DateTime> CalculateSlotStarts(Court court, DateTime slotStart, int slotCount);
    SlotStatus DetermineSlotStatus(
        Court court,
        DateTime slotStart,
        DateTime now,
        DateTime horizonEnd,
        HashSet<DateTime> heldSet,
        HashSet<DateTime> bookedSet,
        List<Blackout> blackouts,
        IPricingCalculator pricingCalculator
    );
    void ValidateSlotsBookable(
        Court court,
        List<DateTime> slotStarts,
        DateTime now,
        int horizonDays,
        HashSet<DateTime> heldSlots,
        HashSet<DateTime> bookedSlots,
        List<Blackout> blackouts
    );
}
