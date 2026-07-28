using TennisBooking.Models;
using TennisBooking.Services;
using Xunit;

namespace TennisBooking.Tests;

public class CourtGridEngineTests
{
    private readonly CourtGridEngine _engine = new();

    private static Court CreateTestCourt()
    {
        var courtId = Guid.NewGuid();
        return new Court
        {
            Id = courtId,
            Name = "Court 1",
            OpeningHours = new OpeningHours { Open = new TimeOnly(8, 0), Close = new TimeOnly(10, 0) }, // 2 hours = 4 slots of 30 min
            SlotLengthMinutes = 30,
            DayNightBoundary = new TimeOnly(18, 0),
            Active = true,
        };
    }

    [Fact]
    public void GenerateGrid_TwoHourWindow_ReturnsFour30MinSlots()
    {
        var court = CreateTestCourt();
        var date = new DateOnly(2026, 8, 3);

        var grid = _engine.GenerateGrid(court, date);

        Assert.Equal(4, grid.Count);
        Assert.Equal(new DateTime(2026, 8, 3, 8, 0, 0, DateTimeKind.Utc), grid[0]);
        Assert.Equal(new DateTime(2026, 8, 3, 9, 30, 0, DateTimeKind.Utc), grid[3]);
    }

    [Fact]
    public void CalculateSlotStarts_TwoSlotSpan_ReturnsContiguousSlots()
    {
        var court = CreateTestCourt();
        var start = new DateTime(2026, 8, 3, 8, 0, 0, DateTimeKind.Utc);

        var slots = _engine.CalculateSlotStarts(court, start, 2);

        Assert.Equal(2, slots.Count);
        Assert.Equal(start, slots[0]);
        Assert.Equal(start.AddMinutes(30), slots[1]);
    }

    [Fact]
    public void ValidateSlotsBookable_PastSlot_ThrowsInvalidOperationException()
    {
        var court = CreateTestCourt();
        var pastStart = new DateTime(2026, 8, 1, 8, 0, 0, DateTimeKind.Utc);
        var now = new DateTime(2026, 8, 3, 10, 0, 0, DateTimeKind.Utc);

        Assert.Throws<InvalidOperationException>(() =>
            _engine.ValidateSlotsBookable(court, [pastStart], now, 14, [], [], [])
        );
    }
}
