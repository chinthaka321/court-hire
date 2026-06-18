using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;

namespace TennisBooking.Jobs;

public class SweepExpiredHoldsJob(AppDbContext db, ILogger<SweepExpiredHoldsJob> logger)
{
    public async Task ExecuteAsync()
    {
        var expired = await db.Holds.Where(h => h.ExpiresAt <= DateTime.UtcNow).ToListAsync();
        if (expired.Count > 0)
        {
            db.Holds.RemoveRange(expired);
            await db.SaveChangesAsync();
            logger.LogInformation("Swept {Count} expired holds", expired.Count);
        }
    }
}

public class SendReminderEmailsJob(AppDbContext db, ILogger<SendReminderEmailsJob> logger)
{
    private const int ReminderHoursBefore = 24;

    public async Task ExecuteAsync()
    {
        var windowStart = DateTime.UtcNow.AddHours(ReminderHoursBefore - 0.25);
        var windowEnd = DateTime.UtcNow.AddHours(ReminderHoursBefore + 0.25);

        var upcoming = await db.Bookings
            .Include(b => b.User)
            .Include(b => b.Court)
            .Where(b => b.State == TennisBooking.Models.BookingState.Completed &&
                        b.SlotStarts.Any(s => s >= windowStart && s <= windowEnd))
            .ToListAsync();

        foreach (var booking in upcoming)
        {
            logger.LogInformation("Reminder: booking {Id} for {User} at {Slot}",
                booking.Id, booking.User.Email, booking.SlotStarts.Min());
            // TODO: send via email provider (Resend/SES)
        }
    }
}
