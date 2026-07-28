using TennisBooking.Models;
using TennisBooking.Services;
using Xunit;

namespace TennisBooking.Tests;

public class PricingCalculatorTests
{
    private readonly PricingCalculator _calculator = new();

    private static Court CreateTestCourt()
    {
        var courtId = Guid.NewGuid();
        return new Court
        {
            Id = courtId,
            Name = "Center Court",
            OpeningHours = new OpeningHours { Open = new TimeOnly(7, 0), Close = new TimeOnly(22, 0) },
            SlotLengthMinutes = 30,
            DayNightBoundary = new TimeOnly(18, 0),
            Active = true,
            PriceRates = new List<PriceRate>
            {
                new() { Id = Guid.NewGuid(), CourtId = courtId, DayType = DayType.Weekday, Band = PriceBand.Day, Price = 20m },
                new() { Id = Guid.NewGuid(), CourtId = courtId, DayType = DayType.Weekday, Band = PriceBand.Night, Price = 30m },
                new() { Id = Guid.NewGuid(), CourtId = courtId, DayType = DayType.Weekend, Band = PriceBand.Day, Price = 35m },
                new() { Id = Guid.NewGuid(), CourtId = courtId, DayType = DayType.Weekend, Band = PriceBand.Night, Price = 45m },
            }
        };
    }

    [Fact]
    public void GetPrice_WeekdayDay_ReturnsWeekdayDayRate()
    {
        var court = CreateTestCourt();
        // Monday 10:00 AM UTC
        var mondayDay = new DateTime(2026, 8, 3, 10, 0, 0, DateTimeKind.Utc);

        var price = _calculator.GetPrice(court, mondayDay);

        Assert.Equal(20m, price);
    }

    [Fact]
    public void GetPrice_WeekdayNight_ReturnsWeekdayNightRate()
    {
        var court = CreateTestCourt();
        // Monday 19:00 (7:00 PM) UTC
        var mondayNight = new DateTime(2026, 8, 3, 19, 0, 0, DateTimeKind.Utc);

        var price = _calculator.GetPrice(court, mondayNight);

        Assert.Equal(30m, price);
    }

    [Fact]
    public void CalculateSpanPrice_MultiSlot_SumsCorrectly()
    {
        var court = CreateTestCourt();
        // Monday 17:30 (starts Day rate $20) + 18:00 (starts Night rate $30) = $50
        var mondaySpan = new DateTime(2026, 8, 3, 17, 30, 0, DateTimeKind.Utc);

        var totalPrice = _calculator.CalculateSpanPrice(court, mondaySpan, 2);

        Assert.Equal(50m, totalPrice);
    }
}
