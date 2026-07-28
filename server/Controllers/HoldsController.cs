using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/holds")]
[Authorize]
public class HoldsController(
    BookingService booking,
    UserService userService,
    IPaymentGateway paymentGateway,
    AppDbContext db,
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<HoldsController> logger
) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHoldRequest req)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException();

        try
        {
            await userService.EnsureUserAsync(User);
            var holdGroup = await booking.CreateHoldAsync(req.CourtId, req.SlotStart.ToUniversalTime(), userId, req.SlotCount);

            if (env.IsDevelopment() && config.GetValue<bool>("App:MockPayment"))
            {
                var mockUrl = $"{Request.Scheme}://{Request.Host}/api/dev/mock-payment?holdGroupId={holdGroup.HoldGroupId}";
                return Ok(new { checkoutUrl = mockUrl, holdGroupId = holdGroup.HoldGroupId });
            }

            var court = await db.Courts.FindAsync(req.CourtId);
            var courtName = court?.Name ?? "Tennis Court";
            var slotDetails = $"{req.SlotStart:MMM d, h:mm tt} ({holdGroup.DurationMinutes} min)";
            var originDomain = config["App:ClientUrl"] ?? "http://localhost:5173";

            string checkoutUrl;
            try
            {
                checkoutUrl = await paymentGateway.CreateCheckoutSessionAsync(
                    holdGroup.HoldGroupId,
                    userId,
                    holdGroup.TotalPrice,
                    courtName,
                    slotDetails,
                    originDomain
                );
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Stripe checkout-session creation failed for hold group {HoldGroupId}", holdGroup.HoldGroupId);
                await booking.ReleaseHoldGroupAsync(holdGroup.HoldGroupId);
                return StatusCode(502, new { error = "Payment couldn't be started — please try again." });
            }

            return Ok(new { checkoutUrl, holdGroupId = holdGroup.HoldGroupId });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException)
        {
            return Conflict(new { error = "Slot is no longer available" });
        }
    }
}

public record CreateHoldRequest(Guid CourtId, DateTime SlotStart, int SlotCount = 1);
