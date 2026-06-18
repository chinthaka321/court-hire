using Microsoft.AspNetCore.Mvc;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/availability")]
public class AvailabilityController(AvailabilityService availability) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid courtId, [FromQuery] DateOnly date)
    {
        try
        {
            var slots = await availability.GetAvailabilityAsync(courtId, date);
            return Ok(slots);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
