using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(
    AppDbContext db,
    BookingService bookingService,
    IPaymentGateway paymentGateway,
    EmailService emailService,
    ILogger<BookingsController> logger
) : ControllerBase
{
    private string UserId => User.FindFirst("sub")!.Value;

    [HttpGet]
    public async Task<IActionResult> MyBookings()
    {
        var bookings = await db.Bookings
            .Include(b => b.Court)
            .Where(b => b.UserId == UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.State, b.AmountCharged, b.SlotStarts, b.CreatedAt,
                Court = new { b.Court.Id, b.Court.Name }
            })
            .ToListAsync();
        return Ok(bookings);
    }

    [HttpGet("by-hold-group/{holdGroupId:guid}")]
    public async Task<IActionResult> ByHoldGroup(Guid holdGroupId)
    {
        var booking = await db.Bookings
            .FirstOrDefaultAsync(b => b.HoldGroupId == holdGroupId && b.UserId == UserId);
        if (booking is not null)
            return Ok(new { status = "confirmed", bookingId = booking.Id });

        var holdStillExists = await db.Holds.AnyAsync(h => h.HoldGroupId == holdGroupId);
        return Ok(new { status = holdStillExists ? "pending" : "expired" });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var booking = await db.Bookings
                .Include(b => b.User)
                .Include(b => b.Court)
                .FirstOrDefaultAsync(b => b.Id == id)
                ?? throw new KeyNotFoundException();

            if (booking.UserId != UserId) return Forbid();

            var refundDue = await bookingService.CancelBookingAsync(id, UserId);

            if (refundDue && !string.IsNullOrEmpty(booking.StripePaymentIntentId))
            {
                var refunded = await RefundHelper.TryRefundAsync(booking, paymentGateway, db, emailService, logger, id);
                if (!refunded)
                    return StatusCode(502, new { error = "Your booking was cancelled, but the refund could not be processed automatically. Our staff have been notified and will issue it manually." });
            }

            await emailService.SendBookingCancelledAsync(booking);

            return Ok(new { refunded = refundDue && !string.IsNullOrEmpty(booking.StripePaymentIntentId) });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/reschedule")]
    public async Task<IActionResult> Reschedule(Guid id, [FromBody] RescheduleRequest req)
    {
        try
        {
            await bookingService.RescheduleBookingAsync(id, req.NewSlotStart.ToUniversalTime(), UserId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

public record RescheduleRequest(DateTime NewSlotStart);
