using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe.Checkout;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/holds")]
[Authorize]
public class HoldsController(BookingService booking, UserService userService, IConfiguration config, IWebHostEnvironment env, ILogger<HoldsController> logger) : ControllerBase
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

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = ["card"],
                LineItems = [new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmountDecimal = holdGroup.TotalPrice * 100,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Tennis Court Booking — {req.SlotStart:MMM d, h:mm tt} ({holdGroup.DurationMinutes} min)"
                        }
                    },
                    Quantity = 1
                }],
                Mode = "payment",
                SuccessUrl = $"{config["App:ClientUrl"]}/booking/confirming?holdGroupId={holdGroup.HoldGroupId}",
                CancelUrl = $"{config["App:ClientUrl"]}/",
                Metadata = new Dictionary<string, string> { ["holdGroupId"] = holdGroup.HoldGroupId.ToString() }
            };

            Session session;
            try
            {
                var service = new SessionService();
                session = await service.CreateAsync(options);
            }
            catch (Exception ex)
            {
                // Don't leave the just-created hold locking the slot for the full
                // TTL when no checkout ever started (#28) — release it so the
                // user can retry immediately.
                logger.LogError(ex, "Stripe checkout-session creation failed for hold group {HoldGroupId}", holdGroup.HoldGroupId);
                await booking.ReleaseHoldGroupAsync(holdGroup.HoldGroupId);
                return StatusCode(502, new { error = "Payment couldn't be started — please try again." });
            }

            await booking.UpdateHoldGroupSessionAsync(holdGroup.HoldGroupId, session.Id);

            return Ok(new { checkoutUrl = session.Url, holdGroupId = holdGroup.HoldGroupId });
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
            // Lost the race on UNIQUE(CourtId, SlotStart) — someone held the slot first
            return Conflict(new { error = "Slot is no longer available" });
        }
    }
}

public record CreateHoldRequest(Guid CourtId, DateTime SlotStart, int SlotCount = 1);
