using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/dev")]
public class DevController(IWebHostEnvironment env, BookingService bookingService, EmailService emailService, AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpGet("mock-payment")]
    public async Task<IActionResult> MockPayment([FromQuery] Guid holdGroupId)
    {
        if (!env.IsDevelopment() || !config.GetValue<bool>("App:MockPayment"))
            return NotFound();

        var clientUrl = config["App:ClientUrl"] ?? "http://localhost:5173";

        try
        {
            var booking = await bookingService.ConfirmBookingAsync(null, holdGroupId);

            var full = await db.Bookings
                .Include(b => b.User)
                .Include(b => b.Court)
                .FirstOrDefaultAsync(b => b.Id == booking.Id);

            if (full is not null)
                await emailService.SendBookingConfirmedAsync(full);
        }
        catch (KeyNotFoundException)
        {
            // Hold expired or already confirmed — redirect anyway so the client can show the right state
        }

        return Redirect($"{clientUrl}/booking/confirming?holdGroupId={holdGroupId}");
    }
}
