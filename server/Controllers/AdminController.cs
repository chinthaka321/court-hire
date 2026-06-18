using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, BookingService bookingService, StripeRefundService refundService) : ControllerBase
{
    // Pricing
    [HttpGet("courts/{courtId:guid}/pricing")]
    public async Task<IActionResult> GetPricing(Guid courtId)
    {
        var rates = await db.PriceRates.Where(p => p.CourtId == courtId).ToListAsync();
        return Ok(rates);
    }

    [HttpPut("courts/{courtId:guid}/pricing")]
    public async Task<IActionResult> UpsertPricing(Guid courtId, [FromBody] List<UpsertRateRequest> rates)
    {
        var existing = await db.PriceRates.Where(p => p.CourtId == courtId).ToListAsync();
        db.PriceRates.RemoveRange(existing);

        foreach (var r in rates)
        {
            db.PriceRates.Add(new PriceRate
            {
                Id = Guid.NewGuid(),
                CourtId = courtId,
                DayType = r.DayType,
                Band = r.Band,
                Price = r.Price
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // Blackouts
    [HttpGet("blackouts")]
    public async Task<IActionResult> GetBlackouts([FromQuery] Guid? courtId)
    {
        var query = db.Blackouts.Include(b => b.Court).AsQueryable();
        if (courtId.HasValue) query = query.Where(b => b.CourtId == courtId.Value);
        return Ok(await query.ToListAsync());
    }

    [HttpPost("blackouts")]
    public async Task<IActionResult> CreateBlackout([FromBody] CreateBlackoutRequest req)
    {
        var blackout = new Blackout
        {
            Id = Guid.NewGuid(),
            CourtId = req.CourtId,
            Start = req.Start.ToUniversalTime(),
            End = req.End.ToUniversalTime(),
            Reason = req.Reason
        };
        db.Blackouts.Add(blackout);
        await db.SaveChangesAsync();
        return CreatedAtAction(null, new { id = blackout.Id }, blackout);
    }

    [HttpDelete("blackouts/{id:guid}")]
    public async Task<IActionResult> DeleteBlackout(Guid id)
    {
        var bl = await db.Blackouts.FindAsync(id);
        if (bl is null) return NotFound();
        db.Blackouts.Remove(bl);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Bookings
    [HttpGet("bookings")]
    public async Task<IActionResult> GetAllBookings(
        [FromQuery] Guid? courtId,
        [FromQuery] DateOnly? date,
        [FromQuery] string? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = db.Bookings
            .Include(b => b.Court)
            .Include(b => b.User)
            .AsQueryable();

        if (courtId.HasValue) query = query.Where(b => b.CourtId == courtId.Value);
        if (userId is not null) query = query.Where(b => b.UserId == userId);
        if (date.HasValue)
        {
            var start = date.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var end = start.AddDays(1);
            query = query.Where(b => b.SlotStarts.Any(s => s >= start && s < end));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, items });
    }

    [HttpDelete("bookings/{id:guid}")]
    public async Task<IActionResult> AdminCancelBooking(Guid id)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();

        await bookingService.CancelBookingAsync(id, booking.UserId, isAdmin: true);
        await refundService.RefundAsync(booking.StripePaymentIntentId, booking.AmountCharged, id);
        return NoContent();
    }
}

public record UpsertRateRequest(DayType DayType, PriceBand Band, decimal Price);
public record CreateBlackoutRequest(Guid CourtId, DateTime Start, DateTime End, string? Reason);
