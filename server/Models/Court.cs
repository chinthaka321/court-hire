namespace TennisBooking.Models;

public class OpeningHours
{
    public TimeOnly Open { get; set; }
    public TimeOnly Close { get; set; }
}

public class Court
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public OpeningHours OpeningHours { get; set; } = null!;
    public int SlotLengthMinutes { get; set; } = 60;
    public TimeOnly DayNightBoundary { get; set; }
    public bool Active { get; set; } = true;

    public ICollection<PriceRate> PriceRates { get; set; } = [];
    public ICollection<Hold> Holds { get; set; } = [];
    public ICollection<Booking> Bookings { get; set; } = [];
    public ICollection<Blackout> Blackouts { get; set; } = [];
}
