using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(AppDbContext db, BookingService bookingService, StripeRefundService refundService) : ControllerBase
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

    [HttpGet("by-hold/{holdId:guid}")]
    public async Task<IActionResult> ByHold(Guid holdId)
    {
        var booking = await db.Bookings
            .Where(b => b.UserId == UserId)
            .OrderByDescending(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        // Return booking if hold is gone (converted) or still pending
        var holdStillExists = await db.Holds.AnyAsync(h => h.Id == holdId);
        if (holdStillExists) return Ok(new { status = "pending" });
        if (booking is null) return Ok(new { status = "pending" });
        return Ok(new { status = "confirmed", bookingId = booking.Id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var booking = await db.Bookings.FindAsync(id)
                ?? throw new KeyNotFoundException();

            await bookingService.CancelBookingAsync(id, UserId);

            if (!string.IsNullOrEmpty(booking.StripePaymentIntentId))
                await refundService.RefundAsync(booking.StripePaymentIntentId, booking.AmountCharged, id);

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
    }
}

public record RescheduleRequest(DateTime NewSlotStart);
