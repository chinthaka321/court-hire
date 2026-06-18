namespace TennisBooking.Models;

public class Hold
{
    public Guid Id { get; set; }
    public Guid CourtId { get; set; }
    public Court Court { get; set; } = null!;
    public DateTime SlotStart { get; set; }
    public string UserId { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public decimal CapturedPrice { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? StripeSessionId { get; set; }
}
