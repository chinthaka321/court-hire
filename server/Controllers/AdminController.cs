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
public class AdminController(
    AppDbContext db,
    BookingService bookingService,
    IPaymentGateway paymentGateway,
    EmailService emailService,
    ILogger<AdminController> logger
) : ControllerBase
{
    [HttpGet("courts")]
    public async Task<IActionResult> GetAllCourts()
    {
        var courts = await db.Courts
            .AsNoTracking()
            .Select(c => new { c.Id, c.Name, c.SlotLengthMinutes, c.OpeningHours, c.DayNightBoundary, c.Active })
            .ToListAsync();
        return Ok(courts);
    }

    [HttpPatch("courts/{id:guid}/active")]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] SetActiveRequest req)
    {
        var court = await db.Courts.FindAsync(id);
        if (court is null) return NotFound();
        court.Active = req.Active;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("courts/{courtId:guid}/pricing")]
    public async Task<IActionResult> GetPricing(Guid courtId)
    {
        var rates = await db.PriceRates.AsNoTracking().Where(p => p.CourtId == courtId).ToListAsync();
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

    [HttpGet("blackouts")]
    public async Task<IActionResult> GetBlackouts([FromQuery] Guid? courtId)
    {
        var query = db.Blackouts.AsQueryable();
        if (courtId.HasValue) query = query.Where(b => b.CourtId == courtId.Value);
        var result = await query.Select(b => new {
            b.Id, b.CourtId, b.Start, b.End, b.Reason
        }).ToListAsync();
        return Ok(result);
    }

    [HttpGet("blackouts/conflicts")]
    public async Task<IActionResult> GetBlackoutConflicts([FromQuery] Guid courtId, [FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        var court = await db.Courts.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courtId);
        if (court is null) return NotFound();

        var rangeStart = start.ToUniversalTime();
        var rangeEnd = end.ToUniversalTime();
        var slotLength = court.SlotLengthMinutes;

        var conflicts = await db.Bookings
            .Where(b => b.CourtId == courtId && b.State != BookingState.Cancelled
                        && b.SlotStarts.Any(s => s < rangeEnd && s.AddMinutes(slotLength) > rangeStart))
            .Include(b => b.User)
            .Select(b => new { b.Id, b.SlotStarts, User = new { b.User.Email, b.User.Name } })
            .ToListAsync();

        return Ok(conflicts);
    }

    [HttpPost("blackouts")]
    public async Task<IActionResult> CreateBlackout([FromBody] CreateBlackoutRequest req)
    {
        if (req.End <= req.Start)
        {
            return BadRequest(new { error = "Blackout end must be after its start." });
        }

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
        return Ok(new { blackout.Id, blackout.CourtId, blackout.Start, blackout.End, blackout.Reason });
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

    [HttpGet("bookings")]
    public async Task<IActionResult> GetAllBookings(
        [FromQuery] Guid? courtId,
        [FromQuery] DateOnly? date,
        [FromQuery] string? userId,
        [FromQuery] string? search,
        [FromQuery] BookingState? state,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = db.Bookings.AsQueryable();

        if (state.HasValue) query = query.Where(b => b.State == state.Value);
        if (courtId.HasValue) query = query.Where(b => b.CourtId == courtId.Value);
        if (userId is not null) query = query.Where(b => b.UserId == userId);
        if (search is not null)
            query = query.Where(b =>
                b.User.Email.Contains(search) ||
                (b.User.Name != null && b.User.Name.Contains(search)) ||
                (b.PayerName != null && b.PayerName.Contains(search)) ||
                (b.PayerEmail != null && b.PayerEmail.Contains(search)));
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
            .Select(b => new {
                b.Id, b.State, b.AmountCharged, b.SlotStarts, b.CreatedAt, b.Notes,
                b.PayerName, b.PayerEmail,
                Court = new { b.Court.Id, b.Court.Name },
                User  = new { b.User.Id, b.User.Email, b.User.Name }
            })
            .ToListAsync();

        return Ok(new { total, items });
    }

    [HttpPost("bookings")]
    public async Task<IActionResult> CreateAdminBooking([FromBody] CreateAdminBookingRequest req)
    {
        var adminUserId = User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException();

        if (string.IsNullOrWhiteSpace(req.PayerName) && string.IsNullOrWhiteSpace(req.PayerEmail))
        {
            return BadRequest(new { error = "Enter the customer's name or email so the booking can be attributed correctly." });
        }

        try
        {
            var booking = await bookingService.CreateAdminBookingAsync(
                req.CourtId, req.SlotStart.ToUniversalTime(), req.SlotCount, adminUserId, req.Notes,
                req.PayerName?.Trim(), req.PayerEmail?.Trim());
            return Ok(new {
                booking.Id, booking.State, booking.AmountCharged, booking.SlotStarts,
                booking.Notes, booking.PayerName, booking.PayerEmail, booking.CreatedAt, CourtId = req.CourtId
            });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpDelete("bookings/{id:guid}")]
    public async Task<IActionResult> AdminCancelBooking(Guid id)
    {
        var booking = await db.Bookings
            .Include(b => b.User)
            .Include(b => b.Court)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();

        try
        {
            await bookingService.CancelBookingAsync(id, booking.UserId, isAdmin: true);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }

        if (!string.IsNullOrEmpty(booking.StripePaymentIntentId))
        {
            try
            {
                booking.StripeRefundId = await paymentGateway.RefundAsync(booking.StripePaymentIntentId, booking.AmountCharged, id);
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Refund failed for admin-cancelled booking {BookingId} (paymentIntent {PaymentIntent})", id, booking.StripePaymentIntentId);
                await emailService.SendBookingCancelledAsync(booking);
                return StatusCode(502, new { error = "The booking was cancelled, but the Stripe refund failed. Issue the refund manually in the Stripe dashboard (payment intent " + booking.StripePaymentIntentId + ")." });
            }
        }

        await emailService.SendBookingCancelledAsync(booking);

        return NoContent();
    }
}

public record UpsertRateRequest(DayType DayType, PriceBand Band, decimal Price);
public record CreateBlackoutRequest(Guid CourtId, DateTime Start, DateTime End, string? Reason);
public record SetActiveRequest(bool Active);
public record CreateAdminBookingRequest(Guid CourtId, DateTime SlotStart, int SlotCount, string? Notes, string? PayerName, string? PayerEmail);
