using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/courts")]
public class CourtsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var courts = await db.Courts
            .AsNoTracking()
            .Where(c => c.Active)
            .Select(c => new {
                c.Id, c.Name, c.SlotLengthMinutes, c.OpeningHours, c.DayNightBoundary, c.Active
            })
            .ToListAsync();
        return Ok(courts);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var court = await db.Courts
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new {
                c.Id, c.Name, c.SlotLengthMinutes, c.OpeningHours, c.DayNightBoundary, c.Active
            })
            .FirstOrDefaultAsync();
        return court is null ? NotFound() : Ok(court);
    }

    /// <summary>Shared create/update validation. Returns an error message or null.</summary>
    private static string? ValidateCourtRequest(CreateCourtRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return "Name is required.";
        if (req.Close != TimeOnly.MinValue && req.Close <= req.Open)
            return "Close time must be after open time.";
        if (req.SlotLengthMinutes != 30)
            return "Slot length must be exactly 30 minutes.";

        // Boundary outside opening hours would make one whole pricing band
        // unreachable — every slot silently priced from the other band (#25).
        var boundaryTooEarly = req.DayNightBoundary < req.Open;
        var boundaryTooLate = req.Close != TimeOnly.MinValue && req.DayNightBoundary > req.Close;
        if ((boundaryTooEarly && req.DayNightBoundary != TimeOnly.MinValue) || boundaryTooLate)
            return "Day/night boundary must fall within the opening hours.";

        return null;
    }

    [HttpPost, Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateCourtRequest req)
    {
        if (ValidateCourtRequest(req) is string error)
        {
            return BadRequest(new { error });
        }

        var court = new Court
        {
            Id = Guid.NewGuid(),
            Name = req.Name,
            OpeningHours = new OpeningHours { Open = req.Open, Close = req.Close },
            SlotLengthMinutes = req.SlotLengthMinutes,
            DayNightBoundary = req.DayNightBoundary,
            Active = true
        };
        db.Courts.Add(court);
        await db.SaveChangesAsync();
        return Ok(new {
            court.Id, court.Name, court.SlotLengthMinutes, court.OpeningHours, court.DayNightBoundary, court.Active
        });
    }

    [HttpPut("{id:guid}"), Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCourtRequest req)
    {
        if (ValidateCourtRequest(req) is string error)
        {
            return BadRequest(new { error });
        }

        var court = await db.Courts.FindAsync(id);
        if (court is null) return NotFound();

        court.Name = req.Name;
        court.OpeningHours = new OpeningHours { Open = req.Open, Close = req.Close };
        court.SlotLengthMinutes = req.SlotLengthMinutes;
        court.DayNightBoundary = req.DayNightBoundary;
        await db.SaveChangesAsync();
        return Ok(new {
            court.Id, court.Name, court.SlotLengthMinutes, court.OpeningHours, court.DayNightBoundary, court.Active
        });
    }

    [HttpDelete("{id:guid}"), Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var court = await db.Courts.FindAsync(id);
        if (court is null) return NotFound();

        var hasBookings = await db.Bookings.AnyAsync(b => b.CourtId == id);
        if (hasBookings)
        {
            return Conflict(new { error = "This court has existing bookings and cannot be deleted. Deactivate it instead." });
        }

        var hasActiveHolds = await db.Holds.AnyAsync(h => h.CourtId == id && h.ExpiresAt > DateTime.UtcNow);
        if (hasActiveHolds)
        {
            return Conflict(new { error = "This court has an in-progress checkout. Try again shortly." });
        }

        db.Courts.Remove(court);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateCourtRequest(string Name, TimeOnly Open, TimeOnly Close, int SlotLengthMinutes, TimeOnly DayNightBoundary);
