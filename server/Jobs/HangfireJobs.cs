using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;
using TennisBooking.Services;

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

public class SendReminderEmailsJob(AppDbContext db, EmailService email, IConfiguration config, ILogger<SendReminderEmailsJob> logger)
{
    public async Task ExecuteAsync()
    {
        var hoursBefore = config.GetSection("Booking").Get<BookingSettings>()?.ReminderHoursBefore ?? 24;

        // Any not-yet-reminded booking starting within the reminder horizon.
        // ReminderSent prevents duplicates, so a delayed job run can't skip bookings.
        var now = DateTime.UtcNow;
        var cutoff = now.AddHours(hoursBefore);

        var upcoming = await db.Bookings
            .Include(b => b.User)
            .Include(b => b.Court)
            .Where(b =>
                b.State == BookingState.Completed &&
                !b.ReminderSent &&
                b.SlotStarts.Any(s => s > now && s <= cutoff))
            .ToListAsync();

        foreach (var booking in upcoming)
        {
            await email.SendBookingReminderAsync(booking);
            booking.ReminderSent = true;
            logger.LogInformation("Reminder sent for booking {Id} to {User}", booking.Id, booking.User.Email);
        }

        if (upcoming.Count > 0)
            await db.SaveChangesAsync();
    }
}
