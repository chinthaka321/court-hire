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

    [HttpPost, Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateCourtRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { error = "Name is required." });
        }
        if (req.Close <= req.Open)
        {
            return BadRequest(new { error = "Close time must be after open time." });
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
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { error = "Name is required." });
        }
        if (req.Close <= req.Open)
        {
            return BadRequest(new { error = "Close time must be after open time." });
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
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var court = await db.Courts.FindAsync(id);
        if (court is null) return NotFound();
        court.Active = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateCourtRequest(string Name, TimeOnly Open, TimeOnly Close, int SlotLengthMinutes, TimeOnly DayNightBoundary);
