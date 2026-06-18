namespace TennisBooking.Models;

public class Blackout
{
    public Guid Id { get; set; }
    public Guid CourtId { get; set; }
    public Court Court { get; set; } = null!;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string? Reason { get; set; }
}
