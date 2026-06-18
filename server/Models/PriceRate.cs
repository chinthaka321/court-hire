namespace TennisBooking.Models;

public enum DayType { Weekday, Weekend }
public enum PriceBand { Day, Night }

public class PriceRate
{
    public Guid Id { get; set; }
    public Guid CourtId { get; set; }
    public Court Court { get; set; } = null!;
    public DayType DayType { get; set; }
    public PriceBand Band { get; set; }
    public decimal Price { get; set; }
}
