using System.Linq.Expressions;

namespace TennisBooking.Models;

public record CourtDto(Guid Id, string Name, int SlotLengthMinutes, OpeningHours OpeningHours, TimeOnly DayNightBoundary, bool Active)
{
    public static readonly Expression<Func<Court, CourtDto>> Projection = c =>
        new CourtDto(c.Id, c.Name, c.SlotLengthMinutes, c.OpeningHours, c.DayNightBoundary, c.Active);
}
