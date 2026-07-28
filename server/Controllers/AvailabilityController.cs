using Microsoft.AspNetCore.Mvc;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/availability")]
public class AvailabilityController(AvailabilityService availability) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid courtId, [FromQuery] DateOnly? date)
    {
        if (date is null)
            return BadRequest("date is required");

        try
        {
            var userId = User.FindFirst("sub")?.Value;
            var slots = await availability.GetAvailabilityAsync(courtId, date.Value, userId);
            return Ok(slots);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
