namespace TennisBooking.Models;

public enum BookingState { Completed, Cancelled, NoShow }

public class Booking
{
    public Guid Id { get; set; }
    public Guid? HoldGroupId { get; set; } // links back to the Hold group that produced this booking
    public Guid CourtId { get; set; }
    public Court Court { get; set; } = null!;
    public List<DateTime> SlotStarts { get; set; } = [];
    public string UserId { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public decimal AmountCharged { get; set; } // immutable after creation
    public BookingState State { get; set; } = BookingState.Completed;
    public string? StripePaymentIntentId { get; set; }
    public string? StripeRefundId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool ReminderSent { get; set; }
    public string? Notes { get; set; } // admin-only free text (e.g. walk-in customer note)
}
