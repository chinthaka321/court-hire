using Microsoft.AspNetCore.Mvc;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

/// <summary>
/// Public, read-only booking policy values the client needs to render honest UI
/// (cancellation dialogs, date picker range) without hardcoding its own copies.
/// </summary>
[ApiController]
[Route("api/config")]
public class ConfigController(IConfiguration config) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var s = config.GetSection("Booking").Get<BookingSettings>() ?? new();
        return Ok(new
        {
            s.CancellationWindowHours,
            s.BookingHorizonDays,
            s.HoldTtlMinutes,
            TimeZoneId = config["App:TimeZoneId"] ?? "UTC"
        });
    }
}
