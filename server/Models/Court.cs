namespace TennisBooking.Models;

public class OpeningHours
{
    public TimeOnly Open { get; set; }
    public TimeOnly Close { get; set; }

    /// <summary>
    /// Close as a UTC instant on the given day. A close of 00:00 means
    /// "open until midnight", i.e. the start of the NEXT day — without this,
    /// close would always precede open and the court would have no slots.
    /// </summary>
    public DateTime CloseUtc(DateOnly day) =>
        Close == TimeOnly.MinValue
            ? day.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
            : day.ToDateTime(Close, DateTimeKind.Utc);
}

public class Court
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public OpeningHours OpeningHours { get; set; } = null!;
    public int SlotLengthMinutes { get; set; } = 30;
    public TimeOnly DayNightBoundary { get; set; }
    public bool Active { get; set; } = true;

    public ICollection<PriceRate> PriceRates { get; set; } = [];
    public ICollection<Hold> Holds { get; set; } = [];
    public ICollection<Booking> Bookings { get; set; } = [];
    public ICollection<Blackout> Blackouts { get; set; } = [];
}
